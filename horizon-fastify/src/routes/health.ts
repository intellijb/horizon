import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ConnectionStateManager } from '@modules/connection';

// OpenAPI schemas
const healthResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['healthy', 'unhealthy', 'alive', 'ready', 'not ready', 'started', 'starting'] },
    timestamp: { type: 'string', format: 'date-time' },
    uptime: { type: 'number', description: 'Uptime in seconds' },
    services: {
      type: 'object',
      properties: {
        postgres: { type: 'string', enum: ['up', 'down'] },
        redis: { type: 'string', enum: ['up', 'down'] },
      },
    },
  },
} as const;

const livenessResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['alive'] },
    timestamp: { type: 'string', format: 'date-time' },
    uptime: { type: 'number', description: 'Uptime in seconds' },
    memory: {
      type: 'object',
      properties: {
        used: { type: 'number', description: 'Used memory in MB' },
        total: { type: 'number', description: 'Total memory in MB' },
        unit: { type: 'string', enum: ['MB'] },
      },
    },
  },
} as const;

const readinessResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ready', 'not ready'] },
    timestamp: { type: 'string', format: 'date-time' },
    checks: {
      type: 'object',
      properties: {
        postgres: {
          type: 'object',
          properties: {
            healthy: { type: 'boolean' },
            responseTime: { type: 'number', description: 'Response time in milliseconds' },
            timestamp: { type: 'string', format: 'date-time' },
            error: { type: 'string' },
          },
        },
        redis: {
          type: 'object',
          properties: {
            healthy: { type: 'boolean' },
            responseTime: { type: 'number', description: 'Response time in milliseconds' },
            error: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

export default async function healthRoutes(fastify: FastifyInstance) {
  const stateManager = ConnectionStateManager.getInstance();
  
  // Liveness probe - basic check that the service is running
  fastify.get('/live', {
    schema: {
      tags: ['Health'],
      summary: 'Liveness Probe',
      description: 'Basic check that the service is running and responding',
      response: {
        200: livenessResponseSchema,
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    };
  });

  // Readiness probe - check if service is ready to handle requests
  fastify.get('/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness Probe',
      description: 'Check if service is ready to handle requests (all dependencies healthy)',
      response: {
        200: readinessResponseSchema,
        503: readinessResponseSchema,
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const checks: any = {
      postgres: null,
      redis: null
    };
    
    // PostgreSQL health check with metrics
    try {
      if ((fastify as any).pgHealthCheck) {
        checks.postgres = await (fastify as any).pgHealthCheck();
      } else {
        const start = Date.now();
        const { rows } = await fastify.pg.query('SELECT NOW()');
        checks.postgres = {
          healthy: rows.length > 0,
          responseTime: Date.now() - start,
          timestamp: rows[0]?.now
        };
      }
    } catch (err) {
      fastify.log.error(err, 'PostgreSQL health check failed');
      checks.postgres = {
        healthy: false,
        error: (err as Error).message
      };
    }

    // Redis health check with metrics
    try {
      if ((fastify as any).redisHealthCheck) {
        checks.redis = await (fastify as any).redisHealthCheck();
      } else {
        const start = Date.now();
        const pong = await fastify.redis.ping();
        checks.redis = {
          healthy: pong === 'PONG',
          responseTime: Date.now() - start
        };
      }
    } catch (err) {
      fastify.log.error(err, 'Redis health check failed');
      checks.redis = {
        healthy: false,
        error: (err as Error).message
      };
    }

    const allHealthy = checks.postgres?.healthy && checks.redis?.healthy;
    
    return reply
      .code(allHealthy ? 200 : 503)
      .send({
        status: allHealthy ? 'ready' : 'not ready',
        checks,
        timestamp: new Date().toISOString()
      });
  });

  // Startup probe - check if service has started successfully
  fastify.get('/startup', {
    schema: {
      tags: ['Health'],
      summary: 'Startup Probe',
      description: 'Check if service has started successfully and is initializing',
      response: {
        200: healthResponseSchema,
        503: healthResponseSchema,
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const states = stateManager.getAllStates();
    const isStarted = states.overall;
    
    return reply
      .code(isStarted ? 200 : 503)
      .send({
        status: isStarted ? 'started' : 'starting',
        services: {
          postgres: states.postgres.state,
          redis: states.redis.state
        },
        timestamp: new Date().toISOString()
      });
  });

  // Detailed health status
  fastify.get('/status', {
    schema: {
      tags: ['Health'],
      summary: 'Detailed Health Status',
      description: 'Comprehensive system health information including metrics and connection details',
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const states = stateManager.getAllStates();
    
    const details: any = {
      overall: states.overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {}
    };
    
    // PostgreSQL detailed status
    if ((fastify as any).pgMetrics && (fastify as any).pgCircuitBreaker) {
      const pgMetrics = (fastify as any).pgMetrics;
      const pgCircuitBreaker = (fastify as any).pgCircuitBreaker;
      details.services.postgres = {
        state: states.postgres.state,
        healthy: states.postgres.healthy,
        pool: {
          total: pgMetrics.totalConnections,
          idle: pgMetrics.idleConnections,
          waiting: pgMetrics.waitingConnections
        },
        metrics: {
          connectionAttempts: pgMetrics.connectionAttempts,
          successfulConnections: pgMetrics.successfulConnections,
          failedConnections: pgMetrics.failedConnections,
          successRate: pgMetrics.connectionAttempts > 0 
            ? (pgMetrics.successfulConnections / pgMetrics.connectionAttempts * 100).toFixed(2) + '%'
            : 'N/A'
        },
        circuitBreaker: pgCircuitBreaker.state,
        lastError: pgMetrics.lastError?.message,
        lastErrorTime: pgMetrics.lastErrorTime
      };
    } else {
      details.services.postgres = states.postgres;
    }
    
    // Redis detailed status
    details.services.redis = {
      state: states.redis.state,
      healthy: states.redis.healthy,
      status: fastify.redis?.status || 'unknown'
    };
    
    // System metrics
    details.system = {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: 'MB'
      },
      cpu: process.cpuUsage(),
      pid: process.pid,
      version: process.version,
      platform: process.platform
    };
    
    return details;
  });

  // Simplified health check (backward compatibility)
  fastify.get('/', {
    schema: {
      tags: ['Health'],
      summary: 'Basic Health Check',
      description: 'Simple health status endpoint for backward compatibility',
      response: {
        200: healthResponseSchema,
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const states = stateManager.getAllStates();
    
    return {
      status: states.overall ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        postgres: states.postgres.healthy ? 'up' : 'down',
        redis: states.redis.healthy ? 'up' : 'down'
      }
    };
  });
}