const constants = require('../utils/constants');
const swaggerOptions = require('./swagger.config');

const SWAGGER_MOUNT_PATHS = ['/api-docs', `${constants.API}/api-docs`];

const isDevEnvironment = () => {
  return process.env.ENV === 'dev';
};

const getSwaggerCredentials = () => {
  const user = process.env.SWAGGER_USER?.trim();
  const password = process.env.SWAGGER_PASSWORD?.trim();
  if (!user || !password) {
    return null;
  }
  return { user, password };
};

const mountSwagger = (app) => {
  const creds = getSwaggerCredentials();
  if (!creds) {
    console.warn(
      'API Swagger not mounted — set SWAGGER_USER and SWAGGER_PASSWORD in environment'
    );
    return;
  }

  try {
    const basicAuth = require('express-basic-auth');
    const swaggerJsdoc = require('swagger-jsdoc');
    const swaggerUi = require('swagger-ui-express');

    const specs = swaggerJsdoc(swaggerOptions);

    const swaggerAuth = basicAuth({
      challenge: true,
      users: { [creds.user]: creds.password },
      realm: 'Kabbik API Docs',
    });

    const swaggerUiSetup = swaggerUi.setup(specs, {
      explorer: true,
      customSiteTitle: 'Kabbik API Docs — Developed by Nafis Hasan Tonmoy',
      customCss: `
        .swagger-ui::after {
          content: 'Developed by Nafis Hasan Tonmoy';
          position: fixed;
          bottom: 8px;
          right: 12px;
          font-size: 12px;
          opacity: 0.7;
          z-index: 9999;
          pointer-events: none;
        }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        requestInterceptor: (request) => {
          const authHeader = request.headers?.Authorization || request.headers?.authorization;
          if (typeof authHeader === 'string' && authHeader.trim()) {
            const rawToken = authHeader.replace(/^Bearer\s+/i, '').trim();
            request.headers.Authorization = `Bearer ${rawToken}`;
            delete request.headers.authorization;
          }
          return request;
        },
      },
    });

    const mountAt = (mountPath) => {
      app.use(mountPath, swaggerAuth, swaggerUi.serve, swaggerUiSetup);
    };

    SWAGGER_MOUNT_PATHS.forEach(mountAt);

    console.log(
      `API Swagger UI available at ${SWAGGER_MOUNT_PATHS.join(' and ')} (password protected)`
    );
  } catch (err) {
    console.warn(
      'API Swagger not mounted — run: npm install swagger-jsdoc swagger-ui-express express-basic-auth',
      err.message
    );
  }
};

module.exports = { mountSwagger, isDevEnvironment };
