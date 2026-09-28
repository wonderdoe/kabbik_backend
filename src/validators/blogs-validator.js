const { check, validationResult } = require('express-validator');

module.exports = class BlogsValidator {
  static validateComment = () => [
    check('comment').notEmpty().isString().isLength({ max: 1000 }),
  ];

  static validateUpdateComment = () => [
    check('comment').notEmpty().isString().isLength({ max: 1000 }),
  ];

  static validateShare = () => [
    check('share_channel').optional().isString().isLength({ max: 50 }),
  ];

  static validateReactionsList = () => [
    check('type').optional().isIn(['like', 'dislike']),
  ];

  static getErrors = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errors.array().map((e) => e.msg).join(', ');
    }
    return null;
  };
};
