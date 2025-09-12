export const configSchema = {
  type: 'object',
  required: ['PORT', 'POSTGRES_URI', 'REDIS_URL'],
  properties: {
    NODE_ENV: {
      type: 'string',
      default: 'development'
    },
    PORT: {
      type: 'number',
      default: 3000
    },
    HOST: {
      type: 'string',
      default: '0.0.0.0'
    },
    POSTGRES_URI: {
      type: 'string'
    },
    REDIS_URL: {
      type: 'string'
    }
  }
};