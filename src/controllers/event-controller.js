const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const EventModel = require('../data/models/event-model');
const EventValidator = require('../validators/event-validator');

class EventController {
  parsePagination = (req) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
    return { page, pageSize };
  };

  parseListFilters = (req) => {
    const past = req.query.past;
    const upcoming = req.query.upcoming;

    let isPast = false;
    if (past === 'true' || past === '1') {
      isPast = true;
    } else if (upcoming === 'false' || upcoming === '0') {
      isPast = true;
    }

    return {
      past: isPast,
      tag: req.query.tag,
      event_type: req.query.event_type,
      status: req.query.status !== undefined ? parseInt(req.query.status, 10) : undefined,
    };
  };

  create = async (req, res) => {
    try {
      await Promise.all(EventValidator.validateCreate().map((v) => v.run(req)));
      const validationError = EventValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const {
        title,
        description,
        event_type,
        location,
        event_date_time,
        maxSeat,
        tag,
        tagColor,
        banner_image,
      } = req.body;

      const result = await EventModel.create(req.currentUser.id, {
        title,
        description,
        event_type,
        location,
        event_date_time,
        maxSeat,
        tag,
        tagColor,
        banner_image,
      });

      const event = await EventModel.findById(result.id);
      return ResponseUtils.respond(res, constants.HTTP_201, { data: event });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getAll = async (req, res) => {
    try {
      await Promise.all(EventValidator.validateListFilters().map((v) => v.run(req)));
      const validationError = EventValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const { page, pageSize } = this.parsePagination(req);
      const filters = this.parseListFilters(req);
      const userId = req.currentUser ? req.currentUser.id : null;
      const result = await EventModel.findAll(page, pageSize, filters, userId);

      return ResponseUtils.respond(res, constants.HTTP_200, result);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getById = async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const userId = req.currentUser ? req.currentUser.id : null;

      const event = await EventModel.findById(eventId, userId);
      if (!event) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      return ResponseUtils.respond(res, constants.HTTP_200, { data: event });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  update = async (req, res) => {
    try {
      await Promise.all(EventValidator.validateUpdate().map((v) => v.run(req)));
      const validationError = EventValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const eventId = parseInt(req.params.id, 10);
      const allowedFields = [
        'title', 'description', 'event_type', 'location', 'event_date_time',
        'maxSeat', 'tag', 'tagColor', 'banner_image', 'status',
      ];

      const updateData = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return ResponseUtils.respondError(res, constants.HTTP_400, 'No fields to update');
      }

      const result = await EventModel.update(eventId, updateData);
      if (result.error) {
        const status = result.error === 'Event not found'
          ? constants.HTTP_404
          : constants.HTTP_400;
        return ResponseUtils.respondError(res, status, result.error);
      }

      const event = await EventModel.findById(eventId);
      return ResponseUtils.respond(res, constants.HTTP_200, { data: event });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  delete = async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const result = await EventModel.softDelete(eventId);

      if (result.error) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        message: 'Event cancelled successfully',
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

  join = async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const result = await EventModel.joinEvent(eventId, req.currentUser.id);

      if (result.error) {
        return ResponseUtils.respondError(
          res,
          result.statusCode || constants.HTTP_400,
          result.error
        );
      }

      const event = await EventModel.findById(eventId, req.currentUser.id);
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        message: result.idempotent ? 'Already joined' : 'Joined event successfully',
        data: event,
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

  leave = async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const result = await EventModel.leaveEvent(eventId, req.currentUser.id);

      if (result.error) {
        return ResponseUtils.respondError(
          res,
          result.statusCode || constants.HTTP_404,
          result.error
        );
      }

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        message: 'Left event successfully',
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

  getParticipants = async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const { page, pageSize } = this.parsePagination(req);
      const status = req.query.status !== undefined
        ? parseInt(req.query.status, 10)
        : 1;

      const exists = await EventModel.eventExists(eventId);
      if (!exists) {
        return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
      }

      const result = await EventModel.findParticipants(eventId, page, pageSize, status);
      return ResponseUtils.respond(res, constants.HTTP_200, result);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getMyJoined = async (req, res) => {
    try {
      const { page, pageSize } = this.parsePagination(req);
      const result = await EventModel.findJoinedByUser(req.currentUser.id, page, pageSize);
      return ResponseUtils.respond(res, constants.HTTP_200, result);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getUserJoined = async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      const isAdmin = req.user && req.user.role === 2;
      const isSelf = req.currentUser.id === userId;

      if (!isSelf && !isAdmin) {
        return ResponseUtils.respondError(res, 403, 'Forbidden');
      }

      const { page, pageSize } = this.parsePagination(req);
      const result = await EventModel.findJoinedByUser(userId, page, pageSize);
      return ResponseUtils.respond(res, constants.HTTP_200, result);
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

module.exports = new EventController();
