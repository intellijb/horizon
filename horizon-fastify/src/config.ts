import { z } from 'zod';

// Only load dotenv in development/test environments
if (process.env.NODE_ENV !== 'production') {
  try {
    const { config: loadDotenv } = await import('dotenv');
    loadDotenv();
  } catch (e) {
    // dotenv is not available in production, which is expected
  }
}

// Environment validation schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  
  // Database
  POSTGRES_URI: z.string().min(1, 'PostgreSQL connection string is required'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_POOL_IDLE_TIMEOUT: z.coerce.number().int().positive().default(30000),
  DB_CONNECTION_TIMEOUT: z.coerce.number().int().positive().default(2000),
  
  // Redis
  REDIS_URL: z.string().min(1, 'Redis connection string is required'),
  REDIS_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
  REDIS_RETRY_DELAY: z.coerce.number().int().positive().default(1000),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  JWT_ISSUER: z.string().default('horizon'),
  JWT_AUDIENCE: z.string().optional(),
  
  // Security
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  MAX_DEVICES_PER_USER: z.coerce.number().int().positive().default(5),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_WINDOW: z.string().default('15m'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  
  // Security Headers (Helmet)
  HSTS_MAX_AGE: z.coerce.number().int().positive().default(31536000), // 1 year
  CSP_REPORT_URI: z.string().optional(),
  FORCE_HTTPS: z.coerce.boolean().default(false),
  
  // Cookie Settings
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  COOKIE_HTTP_ONLY: z.coerce.boolean().default(true),
  
  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_PRETTY: z.coerce.boolean().default(false),
  LOG_REDACT_ENABLED: z.coerce.boolean().default(true),
  LOG_CORRELATION_ENABLED: z.coerce.boolean().default(true),
  LOG_REQUEST_ENABLED: z.coerce.boolean().default(false),
  LOG_REQUEST_HEADERS: z.coerce.boolean().default(false),
  LOG_RESPONSE_ENABLED: z.coerce.boolean().default(false),
  LOG_SQL_QUERIES: z.coerce.boolean().default(false),
  LOG_SLOW_QUERIES_MS: z.coerce.number().int().min(0).default(1000),
  
  // Monitoring (optional)
  SENTRY_DSN: z.string().optional(),
  
  // Development
  ENABLE_SWAGGER: z.coerce.boolean().default(false),
  CORS_ORIGIN: z.string().default('*'),
  
  // OpenAPI Documentation
  API_TITLE: z.string().default('Horizon API'),
  API_DESCRIPTION: z.string().default('Authentication and user management API'),
  API_VERSION: z.string().default('1.0.0'),
  API_DOCS_PATH: z.string().default('/docs'),
  API_SCALAR_PATH: z.string().default('/reference'),
  
  // GraphQL Configuration
  GRAPHQL_ENABLED: z.coerce.boolean().default(true),
  GRAPHQL_PATH: z.string().default('/graphql'),
  GRAPHQL_PLAYGROUND: z.coerce.boolean().default(false),
  GRAPHQL_INTROSPECTION: z.coerce.boolean().default(false),
  GRAPHQL_QUERY_DEPTH_LIMIT: z.coerce.number().int().positive().default(10),
});

function loadEnvironment(): z.infer<typeof envSchema> {
  // Validate environment variables
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .filter((err: any) => err.code === 'invalid_type' && err.received === 'undefined')
        .map((err: any) => err.path.join('.'))
        .join(', ');
      
      const invalidVars = error.issues
        .filter((err: any) => err.code !== 'invalid_type' || err.received !== 'undefined')
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join('\n  ');
      
      let errorMessage = 'Environment validation failed:\n';
      
      if (missingVars) {
        errorMessage += `Missing required variables: ${missingVars}\n`;
      }
      
      if (invalidVars) {
        errorMessage += `Invalid values:\n  ${invalidVars}`;
      }
      
      throw new Error(errorMessage);
    }
    throw error;
  }
}

// Export validated config
export const config = loadEnvironment();

// Derived configurations
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// Server configuration
export const server = {
  host: config.HOST,
  port: config.PORT,
} as const;

// Database configuration
export const dbConfig = {
  connectionString: config.POSTGRES_URI,
  max: config.DB_POOL_MAX,
  idleTimeoutMillis: config.DB_POOL_IDLE_TIMEOUT,
  connectionTimeoutMillis: config.DB_CONNECTION_TIMEOUT,
} as const;

// Redis configuration
export const redisConfig = {
  url: config.REDIS_URL,
  maxRetriesPerRequest: config.REDIS_MAX_RETRIES,
  retryDelayOnFailover: config.REDIS_RETRY_DELAY,
  lazyConnect: true,
} as const;

// JWT configuration
export const jwtConfig = {
  secret: config.JWT_SECRET,
  sign: {
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
    expiresIn: config.JWT_ACCESS_EXPIRES,
  },
  refresh: {
    expiresIn: config.JWT_REFRESH_EXPIRES,
  },
} as const;

// Security configuration
export const securityConfig = {
  bcryptRounds: config.BCRYPT_ROUNDS,
  maxDevicesPerUser: config.MAX_DEVICES_PER_USER,
  maxLoginAttempts: config.MAX_LOGIN_ATTEMPTS,
  rateLimitWindow: config.RATE_LIMIT_WINDOW,
  rateLimitMax: config.RATE_LIMIT_MAX,
  hstsMaxAge: config.HSTS_MAX_AGE,
  cspReportUri: config.CSP_REPORT_URI,
  forceHttps: config.FORCE_HTTPS,
} as const;

// Cookie configuration
export const cookieConfig = {
  domain: config.COOKIE_DOMAIN,
  secure: config.COOKIE_SECURE,
  sameSite: config.COOKIE_SAME_SITE,
  httpOnly: config.COOKIE_HTTP_ONLY,
  path: '/',
} as const;

// API Documentation configuration
export const apiConfig = {
  title: config.API_TITLE,
  description: config.API_DESCRIPTION,
  version: config.API_VERSION,
  docsPath: config.API_DOCS_PATH,
  scalarPath: config.API_SCALAR_PATH,
  enabled: config.ENABLE_SWAGGER || isDevelopment,
} as const;

// GraphQL configuration
export const graphqlConfig = {
  enabled: config.GRAPHQL_ENABLED,
  path: config.GRAPHQL_PATH,
  playground: config.GRAPHQL_PLAYGROUND || isDevelopment,
  introspection: config.GRAPHQL_INTROSPECTION || isDevelopment,
  queryDepthLimit: config.GRAPHQL_QUERY_DEPTH_LIMIT,
} as const;

// Logging configuration
export const loggingConfig = {
  level: config.LOG_LEVEL,
  pretty: config.LOG_PRETTY || isDevelopment,
  redactEnabled: config.LOG_REDACT_ENABLED,
  correlationEnabled: config.LOG_CORRELATION_ENABLED,
  requestEnabled: config.LOG_REQUEST_ENABLED,
  requestHeaders: config.LOG_REQUEST_HEADERS,
  responseEnabled: config.LOG_RESPONSE_ENABLED,
  sqlQueries: config.LOG_SQL_QUERIES || isDevelopment,
  slowQueriesMs: config.LOG_SLOW_QUERIES_MS,
  redactPaths: [
    'password',
    'passwordHash', 
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'jwt',
    'secret',
    'key',
    'privateKey',
    'publicKey',
    'passphrase',
    'signature',
    'credentials',
    'auth',
    'mfaSecret',
    'emailVerificationToken',
    'passwordResetToken',
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    'body.password',
    'body.currentPassword', 
    'body.newPassword',
    'body.confirmPassword',
    'query.token',
    'params.token',
  ],
} as const;

// Fastify env plugin schema (for backward compatibility)
export const configSchema = {
  type: 'object',
  required: [],
  properties: {
    NODE_ENV: { type: 'string', default: config.NODE_ENV },
    PORT: { type: 'number', default: config.PORT },
    HOST: { type: 'string', default: config.HOST },
    POSTGRES_URI: { type: 'string', default: config.POSTGRES_URI },
    REDIS_URL: { type: 'string', default: config.REDIS_URL },
  },
} as const;

// Configuration summary for debugging
export function logConfigSummary() {
  const summary = {
    environment: config.NODE_ENV,
    server: { host: config.HOST, port: config.PORT },
    database: { poolMax: config.DB_POOL_MAX },
    security: { bcryptRounds: config.BCRYPT_ROUNDS },
    features: {
      swagger: config.ENABLE_SWAGGER,
      sentry: !!config.SENTRY_DSN,
      smtp: !!config.SMTP_HOST,
    },
  };
  
  console.log('📋 Configuration Summary:');
  console.log(JSON.stringify(summary, null, 2));
}

export type Config = typeof config;