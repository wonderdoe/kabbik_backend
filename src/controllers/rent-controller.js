const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const RentModel = require('../data/models/rent-model');
const { toBooleanModeQuery } = require('../utils/search-sanitize');
const {
  getTrendingCache,
  setTrendingCache,
} = require('../utils/rent-trending-cache-utils');

class RentController {
  parsePagination = (req) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;
    return { limit, page, offset };
  };

  parseOptionalInt = (raw) => {
    if (raw === undefined || raw === null || raw === '') {
      return { value: undefined, ignored: false };
    }
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      return { value: undefined, ignored: true };
    }
    return { value: parsed, ignored: false };
  };

  buildResponse = (data, total, page, limit, metaExtra = {}) => {
    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.max(1, Math.ceil(total / limit)),
        ...metaExtra,
      },
    };
  };

  getTrending = async (req, res) => {
    try {
      const { limit, page, offset } = this.parsePagination(req);
      const monthsParsed = this.parseOptionalInt(req.query.months);
      let months = monthsParsed.value ?? 4;
      let monthsIgnored = monthsParsed.ignored;

      if (monthsParsed.value !== undefined && monthsParsed.value <= 0) {
        months = 4;
        monthsIgnored = true;
      }

      const cachedResponse = await getTrendingCache(months, page, limit);
      if (cachedResponse) {
        return ResponseUtils.respond(res, constants.HTTP_200, cachedResponse);
      }

      const [data, total] = await Promise.all([
        RentModel.getTrending(months, limit, offset),
        RentModel.getTrendingCount(months),
      ]);

      const response = this.buildResponse(data || [], total, page, limit, {
        applied_filters: { months },
        ...(monthsIgnored ? { ignored_filters: ['months'] } : {}),
      });

      void setTrendingCache(months, page, limit, response);

      return ResponseUtils.respond(res, constants.HTTP_200, response);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getNewReleases = async (req, res) => {
    try {
      const { limit, page, offset } = this.parsePagination(req);
      const monthsParsed = this.parseOptionalInt(req.query.months);
      let months = monthsParsed.value ?? 4;
      let monthsIgnored = monthsParsed.ignored;

      if (monthsParsed.value !== undefined && monthsParsed.value <= 0) {
        months = 4;
        monthsIgnored = true;
      }

      const [data, total] = await Promise.all([
        RentModel.getNewReleases(months, limit, offset),
        RentModel.getNewReleasesCount(months),
      ]);

      return ResponseUtils.respond(
        res,
        constants.HTTP_200,
        this.buildResponse(data || [], total, page, limit, {
          applied_filters: { months },
          ...(monthsIgnored ? { ignored_filters: ['months'] } : {}),
        })
      );
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getAllRentals = async (req, res) => {
    try {
      const { limit, page, offset } = this.parsePagination(req);
      const category = this.parseOptionalInt(req.query.category_id);
      const channel = this.parseOptionalInt(req.query.channel_id);

      const filters = {
        category_id: category.value,
        channel_id: channel.value,
      };

      const ignoredFilters = [];
      if (category.ignored) ignoredFilters.push('category_id');
      if (channel.ignored) ignoredFilters.push('channel_id');

      const [data, total] = await Promise.all([
        RentModel.getAllRentals(filters, limit, offset),
        RentModel.getAllRentalsCount(filters),
      ]);

      return ResponseUtils.respond(
        res,
        constants.HTTP_200,
        this.buildResponse(data || [], total, page, limit, {
          applied_filters: {
            category_id: category.value ?? null,
            channel_id: channel.value ?? null,
          },
          ...(ignoredFilters.length ? { ignored_filters: ignoredFilters } : {}),
        })
      );
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  searchRentAudiobooks = async (req, res) => {
    try {
      const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!rawQuery) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          'Query param "q" is required'
        );
      }

      const booleanQuery = toBooleanModeQuery(rawQuery);
      if (!booleanQuery) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          'No valid search terms after sanitization'
        );
      }

      const { limit, page, offset } = this.parsePagination(req);

      const [data, total] = await Promise.all([
        RentModel.searchRentAudiobooks(booleanQuery, limit, offset),
        RentModel.searchRentAudiobooksCount(booleanQuery),
      ]);

      return ResponseUtils.respond(
        res,
        constants.HTTP_200,
        this.buildResponse(data || [], total, page, limit)
      );
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getActiveRents = async (req, res) => {
    try {
      const userId = req.user.user_id;
      const { limit, page, offset } = this.parsePagination(req);

      const [data, total] = await Promise.all([
        RentModel.getUserActiveRents(userId, limit, offset),
        RentModel.getUserActiveRentsCount(userId),
      ]);

      return ResponseUtils.respond(
        res,
        constants.HTTP_200,
        this.buildResponse(data || [], total, page, limit)
      );
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getExpiredRents = async (req, res) => {
    try {
      const userId = req.user.user_id;
      const { limit, page, offset } = this.parsePagination(req);

      const [data, total] = await Promise.all([
        RentModel.getUserExpiredRents(userId, limit, offset),
        RentModel.getUserExpiredRentsCount(userId),
      ]);

      return ResponseUtils.respond(
        res,
        constants.HTTP_200,
        this.buildResponse(data || [], total, page, limit)
      );
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

module.exports = new RentController();
