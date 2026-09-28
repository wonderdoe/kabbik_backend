const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const PodcastModel = require('../data/models/podcast-model');
const PodcastValidator = require('../validators/podcast-validator');
const countCacheUtils = require('../utils/podcast-count-cache-utils');
const { recomputePodcastTrendingScores } = require('../utils/podcast-trending-utils');
const { toBooleanModeQuery } = require('../utils/search-sanitize');

const { REACTION_LIKE, REACTION_DISLIKE } = PodcastModel;

const PRIMARY_PROCESS_NAME = 'primary-kabbik-backend';
let flushInProgress = false;

class PodcastController {
  parsePagination = (req) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    return { page, limit };
  };

  buildListResponse = (data, total, page, limit) => ({
    data,
    page,
    limit,
    total,
    total_pages: total === 0 ? 0 : Math.ceil(total / limit),
  });

  buildAdminDetailResponse = (result) => ({
    data: {
      ...result.podcast,
      tags: result.tags,
    },
  });

  resolveSortFilter = (req, res) => {
    const sort = req.query.sort;
    if (!sort || sort === 'recent') {
      return { sort: 'recent' };
    }

    if (sort === 'trending') {
      return { sort: 'trending' };
    }

    ResponseUtils.respondError(
      res,
      constants.HTTP_400,
      'Invalid sort value',
      'INVALID_SORT'
    );
    return { error: true };
  };

  createPodcast = async (req, res) => {
    try {
      await Promise.all(PodcastValidator.validateCreatePodcast().map((v) => v.run(req)));
      const validationError = PodcastValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const result = await PodcastModel.createPodcast(req.body);
      if (!result) {
        return ResponseUtils.respondError(res, constants.HTTP_500, constants.INTERNAL_SERVER_ERROR);
      }

      return ResponseUtils.respond(
        res,
        constants.HTTP_201,
        this.buildAdminDetailResponse(result)
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

  updatePodcast = async (req, res) => {
    try {
      await Promise.all([
        ...PodcastValidator.validateIdParam().map((v) => v.run(req)),
        ...PodcastValidator.validateUpdatePodcast().map((v) => v.run(req)),
      ]);
      const validationError = PodcastValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      if (Object.keys(req.body).length === 0) {
        return ResponseUtils.respondError(res, constants.HTTP_400, 'At least one field is required');
      }

      const podcastId = parseInt(req.params.id, 10);
      const exists = await PodcastModel.existsById(podcastId);
      if (!exists) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const tagsProvided = Object.prototype.hasOwnProperty.call(req.body, 'tags');
      const result = await PodcastModel.updatePodcast(podcastId, req.body, { tagsProvided });
      if (!result) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      return ResponseUtils.respond(
        res,
        constants.HTTP_200,
        this.buildAdminDetailResponse(result)
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

  deletePodcast = async (req, res) => {
    try {
      await Promise.all(PodcastValidator.validateIdParam().map((v) => v.run(req)));
      const validationError = PodcastValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const podcastId = parseInt(req.params.id, 10);
      const exists = await PodcastModel.existsById(podcastId);
      if (!exists) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      await PodcastModel.deletePodcast(podcastId);

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        message: 'Podcast deleted successfully',
      });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  searchPodcasts = async (req, res) => {
    try {
      await Promise.all([
        ...PodcastValidator.validateSearchQuery().map((v) => v.run(req)),
        ...PodcastValidator.validateListQuery().map((v) => v.run(req)),
      ]);
      const validationError = PodcastValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const q = String(req.query.q).trim();
      const booleanQuery = toBooleanModeQuery(q);
      if (!booleanQuery) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          'No valid search terms after sanitization'
        );
      }

      const { page, limit } = this.parsePagination(req);
      const userId = req.currentUser?.id ?? null;

      const { rows, total } = await PodcastModel.search({
        q: booleanQuery,
        page,
        limit,
        userId,
      });
      const withCounts = await countCacheUtils.attachLiveCounts(rows);
      const data = withCounts.map((row) => ({ ...row, podcast_url: null }));

      return ResponseUtils.respond(
        res,
        constants.HTTP_200,
        this.buildListResponse(data, total, page, limit)
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

  listPodcasts = async (req, res) => {
    try {
      await Promise.all(PodcastValidator.validateListQuery().map((v) => v.run(req)));
      const validationError = PodcastValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const sortResult = this.resolveSortFilter(req, res);
      if (sortResult.error) return undefined;

      const { page, limit } = this.parsePagination(req);
      const userId = req.currentUser?.id ?? null;
      const tagSlug = req.query.tag?.trim() || null;

      const { rows, total } = await PodcastModel.findAll({
        page,
        limit,
        tagSlug,
        userId,
        sort: sortResult.sort,
      });
      const withCounts = await countCacheUtils.attachLiveCounts(rows);
      const data = withCounts.map((row) => ({ ...row, podcast_url: null }));

      return ResponseUtils.respond(
        res,
        constants.HTTP_200,
        this.buildListResponse(data, total, page, limit)
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

  getPodcast = async (req, res) => {
    try {
      await Promise.all(PodcastValidator.validateIdParam().map((v) => v.run(req)));
      const validationError = PodcastValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const podcastId = parseInt(req.params.id, 10);
      const userId = req.currentUser.id;
      const result = await PodcastModel.findById(podcastId, userId);

      if (!result) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      try {
        await countCacheUtils.incrementViewCountDelta(podcastId);
      } catch (err) {
        console.error(`view_count Redis increment failed for podcast ${podcastId}`, err);
      }

      const podcast = PodcastModel.applyPremiumAccess(result.podcast, req.currentUser);
      const [withCounts] = await countCacheUtils.attachLiveCounts([podcast]);

      return ResponseUtils.respond(res, constants.HTTP_200, {
        data: {
          ...withCounts,
          tags: result.tags,
        },
      });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getSimilarPodcasts = async (req, res) => {
    try {
      await Promise.all([
        ...PodcastValidator.validateIdParam().map((v) => v.run(req)),
        ...PodcastValidator.validateListQuery().map((v) => v.run(req)),
      ]);
      const validationError = PodcastValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const sourceId = parseInt(req.params.id, 10);
      const { page, limit } = this.parsePagination(req);
      const userId = req.currentUser.id;

      const exists = await PodcastModel.existsById(sourceId);
      if (!exists) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const { rows, total } = await PodcastModel.findSimilar(sourceId, {
        page,
        limit,
        userId,
      });

      const withCounts = await countCacheUtils.attachLiveCounts(rows);
      const data = withCounts.map((row) =>
        PodcastModel.applyPremiumAccess(row, req.currentUser)
      );

      return ResponseUtils.respond(
        res,
        constants.HTTP_200,
        this.buildListResponse(data, total, page, limit)
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

  likePodcast = async (req, res) => {
    return this.mutateReaction(req, res, REACTION_LIKE);
  };

  dislikePodcast = async (req, res) => {
    return this.mutateReaction(req, res, REACTION_DISLIKE);
  };

  mutateReaction = async (req, res, reactionType) => {
    try {
      await Promise.all(PodcastValidator.validateIdParam().map((v) => v.run(req)));
      const validationError = PodcastValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const podcastId = parseInt(req.params.id, 10);
      const result = await PodcastModel.toggleReaction(
        podcastId,
        req.currentUser.id,
        reactionType
      );

      if (result.notFound) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  runScheduledCountFlush = async ({ requirePrimary = true } = {}) => {
    if (requirePrimary) {
      const processName = process.env.name || PRIMARY_PROCESS_NAME;
      if (processName !== PRIMARY_PROCESS_NAME) {
        console.log(`[podcast-cron:count-flush] skipped reason=non_primary process=${processName}`);
        return { skipped: true, reason: 'non_primary', flushed: 0, errors: 0 };
      }
    }

    if (flushInProgress) {
      console.warn('[podcast-cron:count-flush] skipped reason=overlap');
      return { skipped: true, reason: 'overlap', flushed: 0, errors: 0 };
    }

    flushInProgress = true;
    const startMs = Date.now();

    try {
      const result = await countCacheUtils.flushPendingCounts();
      const durationMs = Date.now() - startMs;
      console.log(
        `[podcast-cron:count-flush] flushed=${result.flushed} errors=${result.errors} duration=${durationMs}ms`
      );
      return {
        ...result,
        skipped: false,
        durationMs,
      };
    } finally {
      flushInProgress = false;
    }
  };

  flushCountDeltas = async (req, res) => {
    try {
      const result = await this.runScheduledCountFlush({ requirePrimary: false });
      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  runScheduledTrendingRecompute = async ({ requirePrimary = true } = {}) => {
    if (requirePrimary) {
      const processName = process.env.name || PRIMARY_PROCESS_NAME;
      if (processName !== PRIMARY_PROCESS_NAME) {
        console.log(`[podcast-cron:trending] skipped reason=non_primary process=${processName}`);
        return { skipped: true, reason: 'non_primary', affectedRows: 0 };
      }
    }

    return recomputePodcastTrendingScores();
  };

  recomputeTrendingScoresHandler = async (req, res) => {
    try {
      const result = await this.runScheduledTrendingRecompute({ requirePrimary: false });
      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
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

module.exports = new PodcastController();
