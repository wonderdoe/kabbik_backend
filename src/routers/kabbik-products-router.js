const express = require('express');
const router = express.Router();
const KabbikProductsController = require('../controllers/kabbik-products-controller');

/**
 * @swagger
 * tags:
 *   name: KabbikProducts
 *   description: Kabbik product catalog endpoints
 */

/**
 * @swagger
 * /api/kabbik-products:
 *   get:
 *     summary: Get all active Kabbik products
 *     description: Returns all active products ordered by newest first. Returns an empty array when no products exist.
 *     tags: [KabbikProducts]
 *     responses:
 *       200:
 *         description: List of active products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KabbikProductListResponse'
 *             example:
 *               statusCode: 200
 *               data:
 *                 - id: 1
 *                   product_name: Example Product
 *                   image_url: https://cdn.kabbik.com/products/example.png
 *                   redirect_url_android: kabbik://products/example
 *                   redirect_url_ios: kabbik://products/example
 *                   fallback_url_android: https://play.google.com/store/apps/details?id=com.kabbik.ebook_app
 *                   fallback_url_ios: https://kabbik.com/bn#/
 *                   is_active: true
 *                   created_at: '2026-09-20T12:00:00.000Z'
 *                   updated_at: '2026-09-20T12:00:00.000Z'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KabbikProductErrorResponse'
 */
router.get('/kabbik-products', KabbikProductsController.getActiveProducts);

/**
 * @swagger
 * /api/kabbik-products:
 *   post:
 *     summary: Create a new Kabbik product
 *     description: Inserts a new product row. At least one redirect_url_* field must be provided.
 *     tags: [KabbikProducts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KabbikProductInput'
 *           example:
 *             product_name: Example Product
 *             image_url: https://cdn.kabbik.com/products/example.png
 *             redirect_url_android: kabbik://products/example
 *             redirect_url_ios: kabbik://products/example
 *             fallback_url_android: https://play.google.com/store/apps/details?id=com.kabbik.ebook_app
 *             fallback_url_ios: https://kabbik.com/bn#/
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KabbikProduct'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KabbikProductErrorResponse'
 *             example:
 *               error: At least one redirect_url_* field must be provided
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KabbikProductErrorResponse'
 */
router.post('/kabbik-products', KabbikProductsController.createProduct);

/**
 * @swagger
 * /api/kabbik-products/{id}:
 *   patch:
 *     summary: Partially update a Kabbik product
 *     tags: [KabbikProducts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KabbikProductPatch'
 *           example:
 *             redirect_url_android: kabbik://products/updated
 *             fallback_url_android: kabbik://fallback/updated
 *             fallback_url_ios: kabbik://fallback/updated
 *             is_active: true
 *     responses:
 *       200:
 *         description: Updated product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KabbikProduct'
 *       400:
 *         description: No valid fields / validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KabbikProductErrorResponse'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KabbikProductErrorResponse'
 *             example:
 *               error: Product not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KabbikProductErrorResponse'
 */
router.patch('/kabbik-products/:id', KabbikProductsController.patchProduct);

module.exports = router;
