import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  });

  fastify.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const checks = {
      postgres: false,
      redis: false
    };

    try {
      const { rows } = await fastify.pg.query('SELECT 1');
      checks.postgres = rows.length > 0;
    } catch (err) {
      fastify.log.error(err, 'PostgreSQL health check failed');
    }

    try {
      await fastify.redis.ping();
      checks.redis = true;
    } catch (err) {
      fastify.log.error(err, 'Redis health check failed');
    }

    const allHealthy = Object.values(checks).every(check => check);
    
    return reply
      .code(allHealthy ? 200 : 503)
      .send({
        status: allHealthy ? 'ready' : 'not ready',
        checks,
        timestamp: new Date().toISOString()
      });
  });
}