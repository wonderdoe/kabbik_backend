const { check, body, param, validationResult } = require('express-validator');

module.exports = class EditorsPickValidator {

  static validateCreate = () => [
    check('audiobook_id').notEmpty().isInt({ min: 1 }).withMessage('audiobook_id is required and must be a positive integer'),
    check('cap_title').optional().isString().isLength({ max: 255 }),
    check('caption').optional().isString().isLength({ max: 500 }),
    check('banner').optional().isString(),
    check('position').optional().isInt({ min: 0 }),
    check('start_date').optional().isISO8601(),
    check('end_date').optional().isISO8601(),
  ];

  static validateUpdate = () => [
    check('cap_title').optional().isString().isLength({ max: 255 }),
    check('caption').optional().isString().isLength({ max: 500 }),
    check('banner').optional().isString(),
    check('position').optional().isInt({ min: 0 }),
    check('start_date').optional({ nullable: true }).isISO8601(),
    check('end_date').optional({ nullable: true }).isISO8601(),
    check('is_active').optional().isIn([0, 1, true, false, '0', '1']),
  ];

  static validateReorder = () => [
    body('items')
      .isArray({ min: 1 })
      .withMessage('items must be a non-empty array'),
    body('items.*.id')
      .isInt({ min: 1 })
      .withMessage('Each item must have a valid id'),
    body('items.*.position')
      .isInt({ min: 0 })
      .withMessage('Each item must have a valid position'),
  ];

  static validateIdParam = () => [
    param('id').isInt({ min: 1 }).withMessage('Invalid pick id'),
  ];

  static getErrors = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errors.array().map((e) => e.msg).join(', ');
    }
    return null;
  };
};
