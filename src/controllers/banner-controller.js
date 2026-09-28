const BannerModel = require('../data/models/banner-model');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');

class BannerController {
  TARGET_AUDIENCES = ['all', 'free', 'premium'];

  parseIsActive = (value) => {
    if (value === true || value === 1 || value === '1' || value === 'true') {
      return 1;
    }
    if (value === false || value === 0 || value === '0' || value === 'false') {
      return 0;
    }
    return Number(value) ? 1 : 0;
  };

  validateTargetAudience = (value) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const normalized = String(value).toLowerCase();
    if (!this.TARGET_AUDIENCES.includes(normalized)) {
      return `target_audience must be one of: ${this.TARGET_AUDIENCES.join(', ')}`;
    }
    return normalized;
  };

  getAll = async (req, res) => {
    try {
      const { is_active: isActive } = req.query;

      const data = await BannerModel.findAll(
        isActive !== undefined && isActive !== null && isActive !== ''
          ? this.parseIsActive(isActive)
          : undefined
      );

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        data,
        message: 'Banners retrieved',
      });
    } catch (error) {
      console.error(error);
      return ResponseUtils.respondError(res, constants.HTTP_500, error.message);
    }
  };

  getOne = async (req, res) => {
    try {
      const banner = await BannerModel.findById(req.params.id);

      if (!banner) {
        return ResponseUtils.respondError(res, constants.HTTP_404, 'Banner not found');
      }

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        data: banner,
        message: 'Banner retrieved',
      });
    } catch (error) {
      console.error(error);
      return ResponseUtils.respondError(res, constants.HTTP_500, error.message);
    }
  };

  create = async (req, res) => {
    try {
      const { banner_url, goto_page, is_active, payload, target_audience } = req.body;

      if (!banner_url || !goto_page) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          'banner_url and goto_page are required'
        );
      }

      const validatedAudience = this.validateTargetAudience(
        target_audience !== undefined ? target_audience : 'all'
      );
      if (typeof validatedAudience === 'string' && validatedAudience.startsWith('target_audience')) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validatedAudience);
      }

      const banner = await BannerModel.create({
        banner_url,
        goto_page,
        is_active:
          is_active !== undefined && is_active !== null
            ? this.parseIsActive(is_active)
            : 1,
        payload: payload !== undefined ? payload : null,
        target_audience: validatedAudience,
      });

      return ResponseUtils.respond(res, constants.HTTP_201, {
        success: true,
        data: banner,
        message: 'Banner created',
      });
    } catch (error) {
      console.error(error);
      return ResponseUtils.respondError(res, constants.HTTP_500, error.message);
    }
  };

  update = async (req, res) => {
    try {
      const fields = {};
      const { banner_url, goto_page, is_active, payload, target_audience } = req.body;

      if (banner_url !== undefined) fields.banner_url = banner_url;
      if (goto_page !== undefined) fields.goto_page = goto_page;
      if (is_active !== undefined) fields.is_active = this.parseIsActive(is_active);
      if (payload !== undefined) fields.payload = payload;
      if (target_audience !== undefined) {
        const validatedAudience = this.validateTargetAudience(target_audience);
        if (typeof validatedAudience === 'string' && validatedAudience.startsWith('target_audience')) {
          return ResponseUtils.respondError(res, constants.HTTP_400, validatedAudience);
        }
        fields.target_audience = validatedAudience;
      }

      if (Object.keys(fields).length === 0) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          'No fields to update'
        );
      }

      const { affectedRows, row } = await BannerModel.update(req.params.id, fields);

      if (affectedRows === 0) {
        return ResponseUtils.respondError(res, constants.HTTP_404, 'Banner not found');
      }

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        data: row,
        message: 'Banner updated',
      });
    } catch (error) {
      console.error(error);
      return ResponseUtils.respondError(res, constants.HTTP_500, error.message);
    }
  };

  toggle = async (req, res) => {
    try {
      const { affectedRows, row } = await BannerModel.toggle(req.params.id);

      if (affectedRows === 0) {
        return ResponseUtils.respondError(res, constants.HTTP_404, 'Banner not found');
      }

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        data: row,
        message: 'Banner toggled',
      });
    } catch (error) {
      console.error(error);
      return ResponseUtils.respondError(res, constants.HTTP_500, error.message);
    }
  };

  remove = async (req, res) => {
    try {
      const affectedRows = await BannerModel.softDelete(req.params.id);

      if (affectedRows === 0) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          'Banner not found or already deleted'
        );
      }

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        message: 'Banner deleted',
      });
    } catch (error) {
      console.error(error);
      return ResponseUtils.respondError(res, constants.HTTP_500, error.message);
    }
  };
}

module.exports = new BannerController();
