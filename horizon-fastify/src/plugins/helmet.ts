import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import { securityConfig, isDevelopment } from '@config';

async function helmetPlugin(fastify: FastifyInstance) {
  // Register Helmet for security headers
  await fastify.register(helmet, {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Swagger UI and Scalar
          "https://cdn.jsdelivr.net", // Scalar CDN
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Swagger UI and Scalar inline scripts
          "https://cdn.jsdelivr.net", // Scalar CDN
        ],
        fontSrc: [
          "'self'",
          "data:", // For base64 encoded fonts
          "https://fonts.gstatic.com",
        ],
        imgSrc: [
          "'self'",
          "data:", // For base64 encoded images
          "https:",
        ],
        connectSrc: [
          "'self'",
          // Allow API calls to the same origin for documentation
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        childSrc: ["'none'"],
        workerSrc: ["'none'"],
        // upgradeInsecureRequests: !isDevelopment, // Only in production - removed due to CSP error
      },
    },

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: {
      policy: isDevelopment ? false : 'require-corp'
    },

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin'
    },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: 'same-origin'
    },

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },

    // Frameguard (X-Frame-Options)
    frameguard: {
      action: 'deny'
    },

    // Hide Powered-By header
    hidePoweredBy: true,

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },

    // X-Download-Options for IE8+
    ieNoOpen: true,

    // X-Content-Type-Options
    noSniff: true,

    // Origin-Agent-Cluster
    originAgentCluster: true,

    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: false,

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },

    // X-XSS-Protection
    xssFilter: true,
  });

  fastify.log.info('🛡️ Helmet security headers configured');
}

export default fp(helmetPlugin, {
  name: 'helmet',
});