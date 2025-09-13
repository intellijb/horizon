import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function testRoutes(fastify: FastifyInstance) {
  // Simple test route to verify helmet headers
  fastify.get('/test', async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      message: 'Test endpoint working',
      timestamp: new Date().toISOString(),
    };
  });
}