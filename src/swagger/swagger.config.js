const path = require('path');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Kabbik API Docs',
    version: '1.0.0',
    description:
      'Full API documentation for the Kabbik backend. ' +
      'Password-protected at /api-docs or /api/api-docs (HTTP Basic Auth). ' +
      'Developed by Nafis Hasan Tonmoy',
    contact: {
      name: 'Nafis Hasan Tonmoy',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Current host (default — api.kabbik.com or local)',
    },
    {
      url: 'https://api.kabbik.com',
      description: 'Production — root (unversioned routes)',
    },
    {
      url: 'https://api.kabbik.com/v1',
      description: 'v1 — Production',
    },
    {
      url: 'https://api.kabbik.com/v2',
      description: 'v2 — Production',
    },
    {
      url: 'https://api.kabbik.com/v3',
      description: 'v3 — Production',
    },
    {
      url: 'https://api.kabbik.com/v4',
      description: 'v4 — Production',
    },
    {
      url: 'http://localhost:8080',
      description: 'Local — root (unversioned routes)',
    },
    {
      url: 'http://localhost:8080/api/v1',
      description: 'v1 — Local dev',
    },
    {
      url: 'http://localhost:8080/api/v2',
      description: 'v2 — Local dev',
    },
    {
      url: 'http://localhost:8080/api/v3',
      description: 'v3 — Local dev',
    },
    {
      url: 'http://localhost:8080/api/v4',
      description: 'v4 — Local dev',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [
    // PHASE 0 — common
    path.join(__dirname, 'common-swagger-schemas.js'),

    // PHASE 1 — auth schemas + enhanced examples
    path.join(__dirname, 'auth-swagger-schemas.js'),

    // PHASE 5 — existing documented modules
    path.join(__dirname, 'post-swagger-schemas.js'),
    path.join(__dirname, '../routers/v1/post-router.js'),
    path.join(__dirname, '../routers/v1/post-type-router.js'),
    path.join(__dirname, 'blog-swagger-schemas.js'),
    path.join(__dirname, '../routers/v2/blogs-router.js'),
    path.join(__dirname, 'event-swagger-schemas.js'),
    path.join(__dirname, '../routers/v1/event-router.js'),
    path.join(__dirname, 'podcast-swagger-schemas.js'),
    path.join(__dirname, '../routers/v1/podcast-router.js'),
    path.join(__dirname, 'editors-pick-swagger-schemas.js'),
    path.join(__dirname, '../routers/v1/editors-pick-router.js'),
    path.join(__dirname, 'discovery-swagger-schemas.js'),
    path.join(__dirname, 'rent-swagger-schemas.js'),
    path.join(__dirname, '../routers/v4/rent-router.js'),
    path.join(__dirname, 'banner-swagger-schemas.js'),
    path.join(__dirname, '../routers/v4/banners-router.js'),
    path.join(__dirname, '../routers/v4/cron-router.js'),
    path.join(__dirname, 'user-contribution-swagger-schemas.js'),
    path.join(__dirname, '../routers/v1/listening-stats-router.js'),
    path.join(__dirname, '../routers/v1/user-contribution-router.js'),
    path.join(__dirname, '../routers/v1/leaderboard-router.js'),
    path.join(__dirname, '../routers/v4/top-authors-router.js'),
    path.join(__dirname, '../routers/v1/popular-categories-router.js'),
    path.join(__dirname, 'kabbik-chat-swagger-schemas.js'),
    path.join(__dirname, '../routers/v1/kabbik-chat-router.js'),
    path.join(__dirname, '../routers/v1/kabbik-chat-admin-router.js'),
    path.join(__dirname, '../routers/v2/kabbik-router.js'),
    path.join(__dirname, '../routers/v2/kabbik-admin-router.js'),
    path.join(__dirname, 'kabbik-products-swagger-schemas.js'),
    path.join(__dirname, '../routers/kabbik-products-router.js'),

    // PHASE 1–4 — generated route docs (scripts/generate-swagger-routes.js)
    path.join(__dirname, 'routes/*.swagger.js'),
    // Enhanced overrides (must load after generated routes)
    path.join(__dirname, 'routes/v1-auth-enhanced.swagger.js'),
  ],
};

module.exports = options;
