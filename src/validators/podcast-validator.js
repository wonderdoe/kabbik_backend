const { check, param, validationResult } = require('express-validator');

const TAG_RULES = [
  check('tags')
    .optional({ nullable: true })
    .isArray({ max: 20 })
    .withMessage('tags must be an array with at most 20 items'),
  check('tags.*')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('each tag must be a non-empty string')
    .isLength({ max: 255 })
    .withMessage('each tag must be at most 255 characters'),
];

module.exports = class PodcastValidator {
  static validateSearchQuery = () => [
    check('q')
      .exists({ checkFalsy: true })
      .withMessage('Query param "q" is required')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Query param "q" is required')
      .isLength({ max: 200 })
      .withMessage('Query too long'),
  ];

  static validateListQuery = () => [
    check('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    check('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
    check('tag')
      .optional({ checkFalsy: true, nullable: true })
      .isString()
      .trim()
      .isLength({ max: 255 }),
    check('sort')
      .optional({ checkFalsy: true, nullable: true })
      .isString()
      .trim(),
  ];

  static validateIdParam = () => [
    param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
  ];

  static validateCreatePodcast = () => [
    check('title')
      .notEmpty()
      .withMessage('title is required')
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('title must be between 1 and 500 characters'),
    check('description').optional().isString(),
    check('is_premium')
      .optional()
      .isIn([0, 1, true, false, '0', '1'])
      .withMessage('is_premium must be a boolean'),
    check('podcast_url')
      .notEmpty()
      .withMessage('podcast_url is required')
      .isString()
      .isURL({ require_protocol: true })
      .withMessage('podcast_url must be a valid URL'),
    check('thumb_url')
      .notEmpty()
      .withMessage('thumb_url is required')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('thumb_url is required')
      .isURL({ require_protocol: true })
      .withMessage('thumb_url must be a valid URL'),
    ...TAG_RULES,
  ];

  static validateUpdatePodcast = () => [
    check('title')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('title must be between 1 and 500 characters'),
    check('description').optional().isString(),
    check('is_premium')
      .optional()
      .isIn([0, 1, true, false, '0', '1'])
      .withMessage('is_premium must be a boolean'),
    check('podcast_url')
      .optional()
      .isString()
      .isURL({ require_protocol: true })
      .withMessage('podcast_url must be a valid URL'),
    check('thumb_url')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('thumb_url must not be empty')
      .isURL({ require_protocol: true })
      .withMessage('thumb_url must be a valid URL'),
    ...TAG_RULES,
  ];

  static getErrors = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errors.array().map((e) => e.msg).join(', ');
    }
    return null;
  };
};
