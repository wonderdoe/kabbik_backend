const DB = require('../data/db');
const QuickAccessModel = require('../data/models/quick-access-model');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');

const resolveAudience = async (userId) => {
  const rows = await DB.query(
    `SELECT is_subscribed, canceled_subscription, next_purchase_time
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  if (!rows || rows.length === 0) {
    return 'free';
  }
  const { is_subscribed, canceled_subscription, next_purchase_time } = rows[0];
  const active =
    is_subscribed === 1 &&
    canceled_subscription === 0 &&
    Date.now() <= Number(next_purchase_time);
  return active ? 'premium' : 'free';
};

const getForUser = async (req, res) => {
  try {
    const userId = req.currentUser?.id || req.user?.user_id;
    const audience = await resolveAudience(userId);
    const data = await QuickAccessModel.listActiveForAudience(audience);
    return ResponseUtils.respond(res, constants.HTTP_200, {
      success: true,
      message: 'Quick access items retrieved',
      data,
    });
  } catch (err) {
    return ResponseUtils.respondError(res, constants.HTTP_500, err.message);
  }
};

module.exports = { getForUser, resolveAudience };
