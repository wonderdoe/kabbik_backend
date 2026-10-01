const test = require('node:test');
const assert = require('node:assert/strict');

const DB = require('../data/db');
const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const QuickAccessModel = require('../data/models/quick-access-model');
const QuickAccessController = require('./quick-access-controller');
const authorize = require('../middlewares/auth-middleware');

test.after(() => {
  DB.db.end();
});

const runGetForUser = async (req) => {
  const res = {
    statusCode: null,
    body: null,
  };
  const originalRespond = ResponseUtils.respond;
  const originalRespondError = ResponseUtils.respondError;

  ResponseUtils.respond = (response, status, payload) => {
    res.statusCode = status;
    res.body = payload;
    return response;
  };
  ResponseUtils.respondError = (response, status, message) => {
    res.statusCode = status;
    res.body = { message };
    return response;
  };

  try {
    await QuickAccessController.getForUser(req, res);
  } finally {
    ResponseUtils.respond = originalRespond;
    ResponseUtils.respondError = originalRespondError;
  }

  return res;
};

const runAuthorize = (req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        resolve({ req, res });
        return this;
      },
    };

    authorize(req, res, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ req, res });
    });
  });

test('resolveAudience: premium when subscribed, not canceled, and within purchase window', async (t) => {
  const originalQuery = DB.query;
  DB.query = async () => [
    {
      is_subscribed: 1,
      canceled_subscription: 0,
      next_purchase_time: Date.now() + 60_000,
    },
  ];
  t.after(() => {
    DB.query = originalQuery;
  });

  const audience = await QuickAccessController.resolveAudience(99);
  assert.equal(audience, 'premium');
});

test('resolveAudience: free when subscription expired', async (t) => {
  const originalQuery = DB.query;
  DB.query = async () => [
    {
      is_subscribed: 1,
      canceled_subscription: 0,
      next_purchase_time: Date.now() - 1,
    },
  ];
  t.after(() => {
    DB.query = originalQuery;
  });

  const audience = await QuickAccessController.resolveAudience(99);
  assert.equal(audience, 'free');
});

test('resolveAudience: free when user row missing', async (t) => {
  const originalQuery = DB.query;
  DB.query = async () => [];
  t.after(() => {
    DB.query = originalQuery;
  });

  const audience = await QuickAccessController.resolveAudience(99);
  assert.equal(audience, 'free');
});

test('getForUser: passes premium audience and returns model rows in order', async (t) => {
  const originalQuery = DB.query;
  const originalList = QuickAccessModel.listActiveForAudience;
  let listAudience;

  DB.query = async () => [
    {
      is_subscribed: 1,
      canceled_subscription: 0,
      next_purchase_time: Date.now() + 60_000,
    },
  ];
  QuickAccessModel.listActiveForAudience = async (audience) => {
    listAudience = audience;
    return [
      { id: 2, en_name: 'B', bn_name: 'বি', goto_page: '/b' },
      { id: 5, en_name: 'A', bn_name: 'এ', goto_page: '/a' },
    ];
  };

  t.after(() => {
    DB.query = originalQuery;
    QuickAccessModel.listActiveForAudience = originalList;
  });

  const res = await runGetForUser({
    currentUser: { id: 1 },
    user: { user_id: 1 },
  });

  assert.equal(listAudience, 'premium');
  assert.equal(res.statusCode, constants.HTTP_200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data[0].id, 2);
  assert.deepEqual(res.body.data[1].id, 5);
});

test('getForUser: free user uses free audience filter', async (t) => {
  const originalQuery = DB.query;
  const originalList = QuickAccessModel.listActiveForAudience;
  let listAudience;

  DB.query = async () => [
    {
      is_subscribed: 0,
      canceled_subscription: 0,
      next_purchase_time: Date.now() + 60_000,
    },
  ];
  QuickAccessModel.listActiveForAudience = async (audience) => {
    listAudience = audience;
    return [];
  };

  t.after(() => {
    DB.query = originalQuery;
    QuickAccessModel.listActiveForAudience = originalList;
  });

  const res = await runGetForUser({
    currentUser: { id: 2 },
    user: { user_id: 2 },
  });

  assert.equal(listAudience, 'free');
  assert.equal(res.statusCode, constants.HTTP_200);
  assert.deepEqual(res.body.data, []);
});

test('authorize: missing token returns 401', async () => {
  const { res } = await runAuthorize({ headers: {} });
  assert.equal(res.statusCode, constants.HTTP_401);
});

test('quick-access model query orders by sort_order then id', async (t) => {
  const originalQuery = DB.query;
  let capturedSql;

  DB.query = async (sql) => {
    capturedSql = sql;
    return [];
  };
  t.after(() => {
    DB.query = originalQuery;
  });

  await QuickAccessModel.listActiveForAudience('free');

  assert.match(capturedSql, /ORDER BY sort_order ASC, id ASC/i);
  assert.match(capturedSql, /is_active = 1/i);
  assert.match(capturedSql, /audience IN \('all', \?\)/i);
});
