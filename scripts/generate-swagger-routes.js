#!/usr/bin/env node
/**
 * Generates swagger JSDoc route files from Express router files.
 * Does not modify routers or business logic.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROUTERS_DIR = path.join(ROOT, 'src/routers');
const OUTPUT_DIR = path.join(ROOT, 'src/swagger/routes');

const SKIP_PATH_PATTERNS = [
  /webhook/i,
  /callback/i,
  /redirect/i,
  /apple-redirect/i,
  /revenuecat-weekhook/i,
  /payment-callback/i,
  /send-webhook/i,
];

const ALREADY_DOCUMENTED = new Set([
  'v1/post-router.js',
  'v1/post-type-router.js',
  'v2/blogs-router.js',
  'v1/event-router.js',
  'v1/editors-pick-router.js',
  'v1/listening-stats-router.js',
  'v1/user-contribution-router.js',
  'v1/leaderboard-router.js',
  'v4/top-authors-router.js',
  'v4/rent-router.js',
  'v4/banners-router.js',
  'v1/popular-categories-router.js',
  'v1/kabbik-chat-router.js',
  'v1/kabbik-chat-admin-router.js',
  'v2/kabbik-router.js',
  'v2/kabbik-admin-router.js',
  'v4/test-router.js',
]);

const MOUNT_PREFIX = {
  'v1/auth-router.js': '/auth',
  'v1/user-router.js': '/users',
  'v1/audiobook-router.js': '/audiobooks',
  'v1/track-router.js': '/tracks',
  'v1/core-router.js': '/core',
  'v1/fav-router.js': '/favs',
  'v1/publisher-router.js': '/publishers',
  'v1/channel-router.js': '/channels',
  'v1/category-router.js': '/categories',
  'v1/episode-router.js': '/episodes',
  'v1/file-router.js': '/files',
  'v1/package-router.js': '/packages',
  'v1/payment-router.js': '/payment',
  'v1/kabbik-analytics-router.js': '/kabbikanalytics',
  'v1/playlist-router.js': '/playlist',
  'v1/blog-router.js': '/blog',
  'v1/admin-router.js': '/admin',
  'v1/Author-router.js': '/authors',
  'v1/cloud-messeging.js': '/cloud-messaging',
  'v2/core-router.js': '/core',
  'v2/auth-router.js': '/auth',
  'v2/audiobook-router.js': '/audiobooks',
  'v2/category-router.js': '/categories',
  'v3/core-router.js': '/core',
  'v3/audiobook-router.js': '/audiobooks',
  'v3/bkash-router.js': '/bkash',
  'v3/googlepay-router.js': '/googlepay',
  'v3/quiz-router.js': '/quiz',
  'v3/push-notification.js': '/pushnotification',
  'v4/home-router.js': '/home',
  'v4/user-router.js': '/user',
  'v4/writerstory-router.js': '/story',
  'v4/upcoming-router.js': '/upcoming',
  'v4/nagad-router.js': '/nagad',
  'v4/upay-router.js': '/upay',
  'v4/academic-router.js': '/academic',
  'v4/dynamic-router.js': '/dynamic',
  'v4/agent-router.js': '/agent',
  'v4/hero-banner-router.js': '/herobanner',
  'v4/banners-router.js': '/promotionBanners',
  'v4/robi-router.js': '/robi',
  'v4/toffee-router.js': '/toffee',
  'v4/mybl-router.js': '/mybl',
  'v4/session-router.js': '/session',
  'v4/store-router.js': '/store',
  'v4/rent-router.js': '/rent',
  'v4/gamezop-router.js': '/entertainment',
  'v4/amrpay-router.js': '/amrpay',
  'v4/course-router.js': '/course',
  'v4/gp-router.js': '/gp',
  'v4/reward-router.js': '/reward',
  'v4/city-payment-router.js': '/city-pay',
  'v4/refer-router.js': '/refer',
  'v4/EmailNotification-router.js': '/email-notification',
  'v4/user-preference-router.js': '/user-preference',
  'v4/affiliate-router.js': '/affiliate',
  'v4/subs_page_track_router.js': '/subs-page-track',
  'v4/continueBookStatus-router.js': '/continue-listen-track',
  'v4/stripe-router.js': '/stripe',
};

function walkRouters(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = path.join(base, entry.name).replace(/\\/g, '/');
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkRouters(full, rel));
    } else if (entry.name.endsWith('.js')) {
      files.push(rel);
    }
  }
  return files;
}

function shouldSkipRoute(routePath) {
  return SKIP_PATH_PATTERNS.some((re) => re.test(routePath));
}

function parseRoutes(content) {
  const routes = [];
  const re =
    /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  while ((match = re.exec(content)) !== null) {
    const method = match[1].toLowerCase();
    const routePath = match[2];
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const lineEnd = content.indexOf('\n', match.index);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    const needsAuth = /authorizeAdmin/.test(line)
      ? 'admin'
      : /authorize(?:Optional|External|Agent|Publisher|NewAdmin)?/.test(line)
        ? 'user'
        : 'none';
    routes.push({ method, routePath, needsAuth, line });
  }
  return routes;
}

function tagName(relPath) {
  const base = path.basename(relPath, '.js');
  const version = relPath.split('/')[0].toUpperCase();
  return `${version} ${base.replace(/-router$/, '').replace(/_/g, ' ')}`
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Router\.Js/i, '');
}

function summaryFromPath(method, routePath) {
  const clean = routePath.replace(/^\//, '').replace(/[:{}]/g, '') || 'root';
  return `${method.toUpperCase()} ${clean}`;
}

function toOpenApiPath(expressPath) {
  return expressPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function buildPathBlock(method, fullPath, route, tag) {
  const openApiPath = toOpenApiPath(fullPath);
  const paramNames = [];
  const re = /:([A-Za-z0-9_]+)/g;
  let m;
  while ((m = re.exec(route.routePath)) !== null) {
    if (!paramNames.includes(m[1])) paramNames.push(m[1]);
  }

  const hasBody = ['post', 'put', 'patch'].includes(method);
  const security =
    route.needsAuth === 'admin' || route.needsAuth === 'user'
      ? ' *     security:\n *       - bearerAuth: []\n'
      : '';

  let parametersBlock = '';
  if (paramNames.length) {
    parametersBlock =
      ' *     parameters:\n' +
      paramNames
        .map(
          (name) =>
            ` *       - in: path\n *         name: ${name}\n *         required: true\n *         schema:\n *           type: integer\n *         example: 1`
        )
        .join('\n') +
      '\n';
  }

  let bodyBlock = '';
  if (hasBody) {
    bodyBlock = ` *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example: {}
`;
  }

  return `/**
 * @swagger
 * ${openApiPath}:
 *   ${method}:
 *     summary: ${summaryFromPath(method, route.routePath)}
 *     description: Auto-documented endpoint. See controller for full request/response shape.
 *     tags: [${tag}]
${security}${parametersBlock}${bodyBlock} *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *             example:
 *               success: true
 *               data: {}
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
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
`;
}

function generateForRouter(relPath) {
  if (ALREADY_DOCUMENTED.has(relPath)) return null;
  const mount = MOUNT_PREFIX[relPath];
  if (!mount) {
    console.warn(`No mount prefix for ${relPath}, skipping`);
    return null;
  }

  const fullFile = path.join(ROUTERS_DIR, relPath);
  const content = fs.readFileSync(fullFile, 'utf8');
  const routes = parseRoutes(content).filter((r) => !shouldSkipRoute(r.routePath));
  if (!routes.length) return null;

  const tag = tagName(relPath);
  const blocks = [
    `/**
 * @swagger
 * tags:
 *   - name: ${tag}
 *     description: ${tag} endpoints (${relPath})
 */
`,
  ];

  for (const route of routes) {
    const fullPath = `${mount}${route.routePath}`.replace(/\/+/g, '/');
    blocks.push(buildPathBlock(route.method, fullPath, route, tag));
  }

  return blocks.join('\n');
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const routers = walkRouters(ROUTERS_DIR);
  const generated = [];

  for (const rel of routers.sort()) {
    const output = generateForRouter(rel);
    if (!output) continue;
    const outName = rel.replace(/\//g, '-');
    const outFile = path.join(OUTPUT_DIR, `${outName}.swagger.js`);
    fs.writeFileSync(outFile, output, 'utf8');
    generated.push(outFile);
    console.log(`Generated ${outFile}`);
  }

  const manifest = generated.map((f) => path.relative(ROOT, f)).join('\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.txt'), manifest, 'utf8');
  console.log(`\nTotal files: ${generated.length}`);
}

main();
