const test = require('node:test');
const assert = require('node:assert/strict');

const DB = require('../data/db');
const redisClient = require('./redis-client');
const {
  PENDING_FLUSH_SET,
  likeCountDeltaKey,
  dislikeCountDeltaKey,
  viewCountDeltaKey,
  parseDelta,
  incrementViewCountDelta,
  incrementReactionDeltas,
  attachLiveCounts,
  flushPendingCounts,
} = require('./podcast-count-cache-utils');

const store = new Map();
const sets = new Map();

const getSetMembers = (key) => {
  if (!sets.has(key)) {
    sets.set(key, new Set());
  }
  return sets.get(key);
};

const installRedisMock = (t) => {
  const originals = {
    multi: redisClient.multi,
    mGet: redisClient.mGet,
    getSet: redisClient.getSet,
    get: redisClient.get,
    sMembers: redisClient.sMembers,
    sRem: redisClient.sRem,
  };

  store.clear();
  sets.clear();

  redisClient.multi = () => {
    const commands = [];
    const chain = {
      incr(key) {
        commands.push(['incr', key, 1]);
        return chain;
      },
      incrBy(key, amount) {
        commands.push(['incrBy', key, amount]);
        return chain;
      },
      sAdd(key, member) {
        commands.push(['sAdd', key, member]);
        return chain;
      },
      async exec() {
        for (const command of commands) {
          if (command[0] === 'incr') {
            const current = parseDelta(store.get(command[1]));
            store.set(command[1], String(current + command[2]));
          } else if (command[0] === 'incrBy') {
            const current = parseDelta(store.get(command[1]));
            store.set(command[1], String(current + command[2]));
          } else if (command[0] === 'sAdd') {
            const members = getSetMembers(command[1]);
            members.add(command[2]);
            sets.set(command[1], members);
          }
        }
      },
    };
    return chain;
  };

  redisClient.mGet = async (keys) => keys.map((key) => store.get(key) ?? null);

  redisClient.getSet = async (key, value) => {
    const previous = store.get(key) ?? null;
    store.set(key, value);
    return previous;
  };

  redisClient.get = async (key) => store.get(key) ?? null;

  redisClient.sMembers = async (key) => Array.from(getSetMembers(key));

  redisClient.sRem = async (key, member) => {
    const members = getSetMembers(key);
    const removed = members.delete(member);
    sets.set(key, members);
    return removed ? 1 : 0;
  };

  t.after(() => {
    Object.assign(redisClient, originals);
    store.clear();
    sets.clear();
  });
};

test.after(() => {
  DB.db.end();
});

test('parseDelta treats missing and invalid values as zero', () => {
  assert.equal(parseDelta(null), 0);
  assert.equal(parseDelta(undefined), 0);
  assert.equal(parseDelta('abc'), 0);
  assert.equal(parseDelta('7'), 7);
  assert.equal(parseDelta('-3'), -3);
});

test('incrementViewCountDelta stores pending view delta and podcast id', async (t) => {
  installRedisMock(t);

  await incrementViewCountDelta(42);

  assert.equal(store.get(viewCountDeltaKey(42)), '1');
  assert.deepEqual(Array.from(getSetMembers(PENDING_FLUSH_SET)), ['42']);
});

test('incrementReactionDeltas stores like and dislike deltas', async (t) => {
  installRedisMock(t);

  await incrementReactionDeltas(9, 1, -1);

  assert.equal(store.get(likeCountDeltaKey(9)), '1');
  assert.equal(store.get(dislikeCountDeltaKey(9)), '-1');
  assert.deepEqual(Array.from(getSetMembers(PENDING_FLUSH_SET)), ['9']);
});

test('attachLiveCounts merges mysql base with redis deltas', async (t) => {
  installRedisMock(t);

  store.set(likeCountDeltaKey(1), '2');
  store.set(dislikeCountDeltaKey(1), '-1');
  store.set(viewCountDeltaKey(1), '5');

  const [merged] = await attachLiveCounts([{
    id: 1,
    like_count: 10,
    dislike_count: 3,
    view_count: 100,
  }]);

  assert.equal(merged.like_count, 12);
  assert.equal(merged.dislike_count, 2);
  assert.equal(merged.view_count, 105);
});

test('flushPendingCounts applies deltas to mysql and clears pending set', async (t) => {
  installRedisMock(t);
  const captured = [];
  const originalQuery = DB.query;

  store.set(viewCountDeltaKey(42), '3');
  store.set(likeCountDeltaKey(42), '1');
  store.set(dislikeCountDeltaKey(42), '0');
  getSetMembers(PENDING_FLUSH_SET).add('42');

  DB.query = async (sql, params) => {
    captured.push({ sql, params });
    return [];
  };

  t.after(() => {
    DB.query = originalQuery;
  });

  const result = await flushPendingCounts();

  assert.equal(result.flushed, 1);
  assert.equal(result.errors, 0);
  assert.equal(captured.length, 1);
  assert.match(captured[0].sql, /view_count = view_count \+ \?/);
  assert.deepEqual(captured[0].params, [1, 0, 3, 42]);
  assert.equal(store.get(viewCountDeltaKey(42)), '0');
  assert.deepEqual(Array.from(getSetMembers(PENDING_FLUSH_SET)), []);
});

test('flushPendingCounts keeps podcast in pending set when new deltas arrive during flush', async (t) => {
  installRedisMock(t);
  const originalQuery = DB.query;

  store.set(viewCountDeltaKey(7), '2');
  getSetMembers(PENDING_FLUSH_SET).add('7');

  DB.query = async () => [];

  redisClient.getSet = async (key, value) => {
    const previous = store.get(key) ?? null;
    store.set(key, value);
    if (key === viewCountDeltaKey(7)) {
      store.set(key, '1');
    }
    return previous;
  };

  t.after(() => {
    DB.query = originalQuery;
  });

  const result = await flushPendingCounts();

  assert.equal(result.flushed, 1);
  assert.deepEqual(Array.from(getSetMembers(PENDING_FLUSH_SET)), ['7']);
});

test('concurrent view increments accumulate exact delta before flush', async (t) => {
  installRedisMock(t);
  const captured = [];
  const originalQuery = DB.query;

  DB.query = async (sql, params) => {
    captured.push({ sql, params });
    return [];
  };

  t.after(() => {
    DB.query = originalQuery;
  });

  await Promise.all(
    Array.from({ length: 50 }, () => incrementViewCountDelta(99))
  );

  assert.equal(store.get(viewCountDeltaKey(99)), '50');

  const result = await flushPendingCounts();

  assert.equal(result.flushed, 1);
  assert.deepEqual(captured[0].params, [0, 0, 50, 99]);
});
