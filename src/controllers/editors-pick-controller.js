const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const EditorsPickModel = require('../data/models/editors-pick-model');
const EditorsPickValidator = require('../validators/editors-pick-validator');

class EditorsPickController {
  parsePagination = (req) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
    return { page, pageSize };
  };

  create = async (req, res) => {
    try {
      await Promise.all(EditorsPickValidator.validateCreate().map((v) => v.run(req)));
      const validationError = EditorsPickValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const {
        audiobook_id: audiobookId,
        cap_title: capTitle,
        caption,
        banner,
        position,
        start_date: startDate,
        end_date: endDate,
      } = req.body;

      const result = await EditorsPickModel.create(req.currentUser.id, {
        audiobook_id: audiobookId,
        cap_title: capTitle,
        caption,
        banner,
        position,
        start_date: startDate,
        end_date: endDate,
      });

      if (result.error) {
        return ResponseUtils.respondError(res, constants.HTTP_404, result.error);
      }

      const pick = await EditorsPickModel.findByIdAdmin(result.id);
      return ResponseUtils.respond(res, constants.HTTP_201, { data: pick });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getAllAdmin = async (req, res) => {
    try {
      const { page, pageSize } = this.parsePagination(req);
      const result = await EditorsPickModel.findAllAdmin(page, pageSize);
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

  getActive = async (req, res) => {
    try {
      const { page, pageSize } = this.parsePagination(req);
      const result = await EditorsPickModel.findActiveAll(page, pageSize);
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

  getActiveById = async (req, res) => {
    try {
      await Promise.all(EditorsPickValidator.validateIdParam().map((v) => v.run(req)));
      const validationError = EditorsPickValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const pickId = parseInt(req.params.id, 10);
      const pick = await EditorsPickModel.findActiveById(pickId);

      if (!pick) {
        return ResponseUtils.respondError(res, constants.HTTP_404, 'Editor pick not found');
      }

      return ResponseUtils.respond(res, constants.HTTP_200, { data: pick });
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
      await Promise.all([
        ...EditorsPickValidator.validateIdParam().map((v) => v.run(req)),
        ...EditorsPickValidator.validateUpdate().map((v) => v.run(req)),
      ]);
      const validationError = EditorsPickValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const pickId = parseInt(req.params.id, 10);
      const {
        cap_title: capTitle,
        caption,
        banner,
        position,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
      } = req.body;

      const updateData = {};
      if (capTitle !== undefined) updateData.cap_title = capTitle;
      if (caption !== undefined) updateData.caption = caption;
      if (banner !== undefined) updateData.banner = banner;
      if (position !== undefined) updateData.position = position;
      if (startDate !== undefined) updateData.start_date = startDate;
      if (endDate !== undefined) updateData.end_date = endDate;
      if (isActive !== undefined) {
        updateData.is_active = isActive === true || isActive === 1 || isActive === '1' ? 1 : 0;
      }

      const result = await EditorsPickModel.update(pickId, updateData);
      if (result.error) {
        return ResponseUtils.respondError(res, constants.HTTP_404, result.error);
      }

      const pick = await EditorsPickModel.findByIdAdmin(pickId);
      return ResponseUtils.respond(res, constants.HTTP_200, { data: pick });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  softDelete = async (req, res) => {
    try {
      await Promise.all(EditorsPickValidator.validateIdParam().map((v) => v.run(req)));
      const validationError = EditorsPickValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const pickId = parseInt(req.params.id, 10);
      const deleted = await EditorsPickModel.softDelete(pickId);

      if (!deleted) {
        return ResponseUtils.respondError(res, constants.HTTP_404, 'Editor pick not found');
      }

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        message: 'Editor pick deleted successfully',
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

  reorder = async (req, res) => {
    try {
      await Promise.all(EditorsPickValidator.validateReorder().map((v) => v.run(req)));
      const validationError = EditorsPickValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const { items } = req.body;
      await EditorsPickModel.reorder(items);

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        message: 'Editor picks reordered successfully',
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
}

module.exports = new EditorsPickController();
