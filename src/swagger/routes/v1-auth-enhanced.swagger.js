/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with phone user profile
 *     description: Creates or returns user and issues JWT token.
 *     tags: [V1 Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokenResponse'
 *       401:
 *         description: Unable to login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /auth/login-password:
 *   post:
 *     summary: Login with phone and password
 *     tags: [V1 Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLoginPasswordRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example
 *                 user:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: msisdn and password required
 *       401:
 *         description: Invalid credentials
 *
 * /auth/otp:
 *   post:
 *     summary: Request OTP
 *     tags: [V1 Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OtpCreateRequest'
 *     responses:
 *       200:
 *         description: OTP sent
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: OTP sent
 *
 * /auth/otp/verify:
 *   post:
 *     summary: Verify OTP and login
 *     tags: [V1 Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OtpVerifyRequest'
 *     responses:
 *       200:
 *         description: OTP verified, token issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokenResponse'
 *
 * /auth/logout:
 *   post:
 *     summary: Logout current device/session
 *     tags: [V1 Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Logged out successfully
 *
 * /auth/login-admin:
 *   post:
 *     summary: Admin login
 *     description: |
 *       Issues a JWT with role=2 for admin-only endpoints.
 *       Copy the returned `token` into Swagger Authorize → **adminBearerAuth**.
 *     tags: [V1 Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthAdminLoginRequest'
 *     responses:
 *       200:
 *         description: Admin login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthAdminLoginResponse'
 *       400:
 *         description: user_name and password are required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /auth/dev/bootstrap-admin:
 *   post:
 *     summary: Dev-only — bootstrap Swagger admin
 *     description: |
 *       **Local dev only** (`ENV=dev`). Creates or updates a role=2 admin user in the
 *       `users` table and always sets the password. Returns a JWT — paste into
 *       Swagger Authorize → **adminBearerAuth**. Returns 404 in production.
 *
 *       Defaults when body is empty:
 *       - `user_name`: `DEV_ADMIN_USERNAME` env or `swagger_admin`
 *       - `password`: `DEV_ADMIN_PASSWORD` env or `SwaggerAdmin@123`
 *       - `full_name`: `Swagger Admin`
 *     tags: [V1 Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DevBootstrapAdminRequest'
 *     responses:
 *       200:
 *         description: Admin bootstrapped and JWT issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DevBootstrapAdminResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not found (non-dev environment)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Username taken by a non-admin user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

module.exports = {};
