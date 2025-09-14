import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { apiConfig, server } from '@config';

async function openApiPlugin(fastify: FastifyInstance) {
  if (!apiConfig.enabled) {
    return;
  }

  // Register Swagger/OpenAPI
  await fastify.register(swagger as any, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: apiConfig.title,
        description: apiConfig.description,
        version: apiConfig.version,
        contact: {
          name: 'Horizon Team',
          email: 'support@horizon.dev',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: `http://localhost:${server.port}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          CookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'accessToken',
          },
        },
      },
      security: [
        {
          BearerAuth: [],
        },
        {
          CookieAuth: [],
        },
      ],
      tags: [
        {
          name: 'Authentication',
          description: 'User authentication and authorization',
        },
        {
          name: 'Users',
          description: 'User management operations',
        },
        {
          name: 'Health',
          description: 'System health and monitoring',
        },
      ],
    },
    hideUntagged: true,
    transform: ({ schema, url }) => {
      // Transform function to customize schema generation
      return { schema, url };
    },
  });

  // Register Swagger UI (traditional documentation)
  await fastify.register(swaggerUI, {
    routePrefix: apiConfig.docsPath,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        // Add custom headers or authentication if needed
        next();
      },
      preHandler: function (request, reply, next) {
        // Pre-process documentation requests
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      // Customize the OpenAPI spec based on request context
      return swaggerObject;
    },
    theme: {
      title: `${apiConfig.title} - Documentation`,
    },
  });

  // Register Scalar API Reference (modern documentation)
  await fastify.register(
    async function scalarPlugin(fastify: FastifyInstance) {
      fastify.get(apiConfig.scalarPath, async (request, reply) => {
        const openApiSpec = fastify.swagger();
        
        const scalarHtml = `
<!DOCTYPE html>
<html>
  <head>
    <title>${apiConfig.title} - API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { 
        margin: 0; 
        padding: 0; 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      type="application/json"
      data-configuration='${JSON.stringify({
        theme: 'purple',
        layout: 'modern',
        showSidebar: true,
        hideDownloadButton: false,
        darkMode: true,
        searchHotKey: 'k',
        metaData: {
          title: `${apiConfig.title} - API Reference`,
          description: apiConfig.description,
        },
        customCss: '.scalar-app { --scalar-color-1: #121212; --scalar-color-2: #1e1e1e; --scalar-color-3: #2d2d2d; --scalar-color-accent: #8b5cf6; --scalar-border-color: #404040; }'
      })}'
    >${JSON.stringify(openApiSpec, null, 2)}</script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest"></script>
  </body>
</html>`;

        reply.type('text/html').send(scalarHtml);
      });
    }
  );

  // Log documentation endpoints
  fastify.log.info(`📚 OpenAPI documentation available at:`);
  fastify.log.info(`  • Swagger UI: http://localhost:${server.port}${apiConfig.docsPath}`);
  fastify.log.info(`  • Scalar Reference: http://localhost:${server.port}${apiConfig.scalarPath}`);
  fastify.log.info(`  • OpenAPI JSON: http://localhost:${server.port}/documentation/json`);
}

export default fp(openApiPlugin, {
  name: 'openapi',
  dependencies: ['@fastify/env'],
});