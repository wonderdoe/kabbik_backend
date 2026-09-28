const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const DiscoveryModel = require('../data/models/discovery-model');
const DiscoveryValidator = require('../validators/discovery-validator');

class DiscoveryController {
  parseMonthBoundaries = (monthStr) => {
    const now = new Date();
    const month =
      monthStr ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [year, mon] = month.split('-').map(Number);
    const nextYear = mon === 12 ? year + 1 : year;
    const nextMon = mon === 12 ? 1 : mon + 1;
    const nextMonth = `${nextYear}-${String(nextMon).padStart(2, '0')}`;

    return {
      month,
      start: `${month}-01 00:00:00`,
      end: `${nextMonth}-01 00:00:00`,
    };
  };

  parseLimit = (req, defaultLimit = 10) => {
    return Math.min(Math.max(parseInt(req.query.limit, 10) || defaultLimit, 1), 50);
  };

  getListeningStats = async (req, res) => {
    try {
      const userId = req.currentUser.id;
      const stats = await DiscoveryModel.getListeningStats(userId);
      return ResponseUtils.respond(res, constants.HTTP_200, { data: stats });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getTopContributors = async (req, res) => {
    try {
      await Promise.all(
        DiscoveryValidator.validateMonthQuery().map((v) => v.run(req))
      );
      const validationError = DiscoveryValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const { start, end } = this.parseMonthBoundaries(req.query.month);
      const contributors = await DiscoveryModel.getTopContributors(start, end);
      return ResponseUtils.respond(res, constants.HTTP_200, { data: contributors });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getTopAuthors = async (req, res) => {
    try {
      await Promise.all(
        DiscoveryValidator.validateLimitQuery().map((v) => v.run(req))
      );
      const validationError = DiscoveryValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const limit = this.parseLimit(req);
      const authors = await DiscoveryModel.getTopAuthors(limit);
      return ResponseUtils.respond(res, constants.HTTP_200, { data: authors });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getPopularCategories = async (req, res) => {
    try {
      await Promise.all(
        DiscoveryValidator.validateLimitQuery().map((v) => v.run(req))
      );
      const validationError = DiscoveryValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const limit = this.parseLimit(req);
      const categories = await DiscoveryModel.getPopularCategories(limit);
      return ResponseUtils.respond(res, constants.HTTP_200, { data: categories });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };
}

module.exports = new DiscoveryController();
