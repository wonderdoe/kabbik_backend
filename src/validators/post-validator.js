const { check, validationResult } = require('express-validator');

module.exports = class PostValidator {

  static validateCreatePost = () => [
    check('content').optional().isString().isLength({ max: 5000 }),
    check('title').optional().isString().isLength({ max: 255 }),
    check('audiobook_id').optional({ nullable: true }).isInt({ min: 1 }),
    check('post_type_id').optional().isInt({ min: 1 }),
    check('is_spoiler').optional().custom((value) => {
      if (value === undefined || value === null) return true;
      if (typeof value === 'boolean') return true;
      if (value === 0 || value === 1) return true;
      throw new Error('is_spoiler must be a boolean');
    }),
  ];

  static validateUpdatePost = () => [
    check('is_spoiler').optional().custom((value) => {
      if (value === undefined || value === null) return true;
      if (typeof value === 'boolean') return true;
      if (value === 0 || value === 1) return true;
      throw new Error('is_spoiler must be a boolean');
    }),
    check('title').optional().isString().isLength({ max: 255 }),
    check('_updateFields').custom((_, { req }) => {
      if (req.body.is_spoiler === undefined && req.body.title === undefined) {
        throw new Error('At least one of is_spoiler or title is required');
      }
      return true;
    }),
  ];

  static validateLike = () => [
    check('like_type').optional().isString().isLength({ max: 20 }),
  ];

  static validateComment = () => [
    check('comment').notEmpty().isString().isLength({ max: 1000 }),
    check('parent_comment_id').optional().isInt({ min: 1 }),
  ];

  static validateUpdateComment = () => [
    check('comment').notEmpty().isString().isLength({ max: 1000 }),
  ];

  static validateShare = () => [
    check('share_channel').optional().isString().isLength({ max: 50 }),
  ];

  static getErrors = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errors.array().map((e) => e.msg).join(', ');
    }
    return null;
  };
};
