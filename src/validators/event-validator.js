const { check, validationResult } = require('express-validator');

module.exports = class EventValidator {

  static validateCreate = () => [
    check('title').notEmpty().isString().isLength({ max: 255 }),
    check('description').optional().isString(),
    check('event_type').optional().isString().isLength({ max: 100 }),
    check('location').optional().isString().isLength({ max: 255 }),
    check('event_date_time').notEmpty().isISO8601(),
    check('maxSeat').isInt({ min: 1 }),
    check('tag').optional().isString().isLength({ max: 100 }),
    check('tagColor').optional().isString().isLength({ max: 20 }),
    check('banner_image').optional().isString(),
  ];

  static validateUpdate = () => [
    check('title').optional().isString().isLength({ max: 255 }),
    check('description').optional().isString(),
    check('event_type').optional().isString().isLength({ max: 100 }),
    check('location').optional().isString().isLength({ max: 255 }),
    check('event_date_time').optional().isISO8601(),
    check('maxSeat').optional().isInt({ min: 1 }),
    check('tag').optional().isString().isLength({ max: 100 }),
    check('tagColor').optional().isString().isLength({ max: 20 }),
    check('banner_image').optional().isString(),
    check('status').optional().isInt({ min: 1, max: 3 }),
  ];

  static validateListFilters = () => [
    check('upcoming').optional().isIn(['true', 'false', '1', '0']),
    check('past').optional().isIn(['true', 'false', '1', '0']),
    check('tag').optional().isString().isLength({ max: 100 }),
    check('event_type').optional().isString().isLength({ max: 100 }),
    check('status').optional().isInt({ min: 1, max: 3 }),
  ];

  static getErrors = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errors.array().map((e) => e.msg).join(', ');
    }
    return null;
  };
};
