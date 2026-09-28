const DB = require('../data/db');
const constants = require('../utils/constants');
const LoggerError = require('../utils/logger-error');

const REDIRECT_URL_FIELDS = [
  'redirect_url_android',
  'redirect_url_ios',
];

const FALLBACK_URL_FIELDS = [
  'fallback_url_android',
  'fallback_url_ios',
];

const OPTIONAL_URL_FIELDS = [...REDIRECT_URL_FIELDS, ...FALLBACK_URL_FIELDS];

const PATCH_ALLOWED_FIELDS = [
  'product_name',
  'image_url',
  ...OPTIONAL_URL_FIELDS,
  'is_active',
];

const WEB_URL_FIELDS = ['image_url'];
const DEEP_LINK_FIELDS = [
  'redirect_url_android',
  'redirect_url_ios',
  'fallback_url_android',
  'fallback_url_ios',
];

function isValidWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidDeepLink(value) {
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol);
  } catch {
    return false;
  }
}

function isValidUrlForField(field, value) {
  if (WEB_URL_FIELDS.includes(field)) {
    return isValidWebUrl(value);
  }
  if (DEEP_LINK_FIELDS.includes(field)) {
    return isValidDeepLink(value);
  }
  return isValidWebUrl(value);
}

function normalizeOptionalUrl(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  return value.trim();
}

function validateOptionalUrlFields(body, fields) {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      continue;
    }
    if (typeof body[field] !== 'string' || !isValidUrlForField(field, body[field])) {
      return `${field} must be a valid URL if provided`;
    }
  }
  return null;
}

function hasAtLeastOneRedirectUrl(body) {
  return REDIRECT_URL_FIELDS.some((field) => {
    const value = normalizeOptionalUrl(body[field]);
    return value && isValidUrlForField(field, value);
  });
}

function validateProductInput(body) {
  const { product_name, image_url } = body;

  if (!product_name || typeof product_name !== 'string' || !product_name.trim()) {
    return 'product_name is required';
  }

  if (!image_url || typeof image_url !== 'string' || !isValidWebUrl(image_url)) {
    return 'image_url is required and must be a valid URL';
  }

  const optionalUrlError = validateOptionalUrlFields(body, OPTIONAL_URL_FIELDS);
  if (optionalUrlError) {
    return optionalUrlError;
  }

  if (!hasAtLeastOneRedirectUrl(body)) {
    return 'At least one redirect_url_* field must be provided';
  }

  return null;
}

function validatePatchInput(body) {
  const fields = [];
  const values = [];

  for (const [key, val] of Object.entries(body)) {
    if (!PATCH_ALLOWED_FIELDS.includes(key)) {
      continue;
    }

    if (key === 'product_name') {
      if (typeof val !== 'string' || !val.trim()) {
        return 'product_name must be a non-empty string';
      }
      fields.push(`${key} = ?`);
      values.push(val.trim());
      continue;
    }

    if (key === 'image_url') {
      if (typeof val !== 'string' || !isValidWebUrl(val)) {
        return 'image_url must be a valid URL';
      }
      fields.push(`${key} = ?`);
      values.push(val.trim());
      continue;
    }

    if (OPTIONAL_URL_FIELDS.includes(key)) {
      const normalized = val ?? null;
      if (normalized !== null && normalized !== '') {
        if (typeof normalized !== 'string' || !isValidUrlForField(key, normalized)) {
          return `${key} must be a valid URL if provided`;
        }
        fields.push(`${key} = ?`);
        values.push(normalized);
      } else {
        fields.push(`${key} = ?`);
        values.push(null);
      }
      continue;
    }

    if (key === 'is_active') {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }

  return { fields, values };
}

class KabbikProductsController {
  getActiveProducts = async (req, res) => {
    try {
      const rows = await DB.query(
        'SELECT * FROM kabbik_products WHERE is_active = true ORDER BY id DESC'
      );
      return res.status(constants.HTTP_200).json({
        statusCode: constants.HTTP_200,
        data: rows || [],
      });
    } catch (err) {
      LoggerError.log(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  createProduct = async (req, res) => {
    try {
      const validationError = validateProductInput(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const sql = `
        INSERT INTO kabbik_products
          (product_name, image_url,
           redirect_url_android, redirect_url_ios,
           fallback_url_android, fallback_url_ios)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const values = [
        req.body.product_name,
        req.body.image_url,
        req.body.redirect_url_android ?? null,
        req.body.redirect_url_ios ?? null,
        req.body.fallback_url_android ?? null,
        req.body.fallback_url_ios ?? null,
      ];

      const insertResult = await DB.query(sql, values);

      const rows = await DB.query('SELECT * FROM kabbik_products WHERE id = ?', [
        insertResult.insertId,
      ]);

      if (!rows || rows.length === 0) {
        return res.status(500).json({ error: 'Internal server error' });
      }

      return res.status(201).json(rows[0]);
    } catch (err) {
      LoggerError.log(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  patchProduct = async (req, res) => {
    try {
      const patchResult = validatePatchInput(req.body);

      if (typeof patchResult === 'string') {
        return res.status(400).json({ error: patchResult });
      }

      const { fields, values } = patchResult;

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided' });
      }

      const id = req.params.id;
      const updateResult = await DB.query(
        `UPDATE kabbik_products SET ${fields.join(', ')} WHERE id = ?`,
        [...values, id]
      );

      if (!updateResult.affectedRows) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const rows = await DB.query('SELECT * FROM kabbik_products WHERE id = ?', [id]);

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json(rows[0]);
    } catch (err) {
      LoggerError.log(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = new KabbikProductsController();
