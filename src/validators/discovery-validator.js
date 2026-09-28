const { check, validationResult } = require('express-validator');

module.exports = class DiscoveryValidator {
  static validateMonthQuery = () => [
    check('month')
      .optional()
      .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
      .withMessage('month must be in YYYY-MM format'),
  ];

  static validateLimitQuery = () => [
    check('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('limit must be an integer between 1 and 50'),
  ];

  static getErrors = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errors.array().map((e) => e.msg).join(', ');
    }
    return null;
  };
};
