const test = require('node:test');
const assert = require('node:assert/strict');

const DB = require('../data/db');
const authHelper = require('../utils/auth-helper');
const authorizeOptional = require('./auth-optional-middleware');

test.after(() => {
  DB.db.end();
});

const runMiddleware = (req) =>
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
        return this;
      },
    };

    authorizeOptional(req, res, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ req, res });
    });
  });

test('authorizeOptional: no Authorization header leaves currentUser null', async () => {
  const { req, res } = await runMiddleware({ headers: {} });

  assert.equal(req.currentUser, null);
  assert.equal(req.user, null);
  assert.equal(res.statusCode, null);
});

test('authorizeOptional: valid token hydrates currentUser', async (t) => {
  const entity = { id: 42, role: 1 };
  const jwtPayload = { user_id: 42, role: 1 };

  const originalResolve = authHelper.resolveAuthenticatedUser;
  authHelper.resolveAuthenticatedUser = async () => ({ entity, jwtPayload });

  t.after(() => {
    authHelper.resolveAuthenticatedUser = originalResolve;
  });

  const { req, res } = await runMiddleware({
    headers: { authorization: 'Bearer valid-token' },
  });

  assert.deepEqual(req.currentUser, entity);
  assert.deepEqual(req.user, jwtPayload);
  assert.equal(res.statusCode, null);
});

test('authorizeOptional: invalid token does not 401', async (t) => {
  const originalResolve = authHelper.resolveAuthenticatedUser;
  authHelper.resolveAuthenticatedUser = async () => {
    throw new Error('invalid token');
  };

  t.after(() => {
    authHelper.resolveAuthenticatedUser = originalResolve;
  });

  const { req, res } = await runMiddleware({
    headers: { authorization: 'Bearer garbage' },
  });

  assert.equal(req.currentUser, null);
  assert.equal(req.user, null);
  assert.equal(res.statusCode, null);
});

test('authorizeOptional: valid token but missing entity leaves currentUser null', async (t) => {
  const originalResolve = authHelper.resolveAuthenticatedUser;
  authHelper.resolveAuthenticatedUser = async () => null;

  t.after(() => {
    authHelper.resolveAuthenticatedUser = originalResolve;
  });

  const { req, res } = await runMiddleware({
    headers: { authorization: 'Bearer valid-token' },
  });

  assert.equal(req.currentUser, null);
  assert.equal(req.user, null);
  assert.equal(res.statusCode, null);
});
