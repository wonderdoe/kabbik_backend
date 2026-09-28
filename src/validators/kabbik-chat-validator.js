const { check, validationResult } = require('express-validator');

module.exports = class KabbikChatValidator {
  static validateCreateConversation = () => [
    check('subject').optional().isString().isLength({ max: 255 }),
  ];

  static validateReply = () => [
    check('message').notEmpty().isString().isLength({ min: 1, max: 5000 }),
  ];

  static validateSendMessage = () => [
    check('message').notEmpty().isString().isLength({ min: 1, max: 5000 }),
  ];

  static validateMessagesQuery = () => [
    check('order').optional().isIn(['asc', 'desc']),
    check('after_message_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('after_message_id must be a positive integer'),
    check('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),
  ];

  static validateAdminListQuery = () => [
    check('status').optional().isIn(['open', 'closed', '1', '2']),
  ];

  static getErrors = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errors.array().map((e) => e.msg).join(', ');
    }
    return null;
  };
};
