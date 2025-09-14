import { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { sql } from "drizzle-orm"

// Response schemas
const HealthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.string().datetime(),
  uptime: z.number(),
  version: z.string(),
  checks: z.object({
    database: z.boolean(),
    redis: z.boolean().optional(),
  }),
})

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  const startTime = Date.now()

  // Health check
  app.get(
    "/",
    {
      schema: {
        response: {
          200: HealthResponseSchema,
          503: HealthResponseSchema,
        },
        tags: ["health"],
        summary: "Health check",
        description: "Check the health status of the application",
      },
    },
    async (request, reply) => {
      const checks = {
        database: false,
        redis: false,
      }

      let status: "healthy" | "degraded" | "unhealthy" = "healthy"

      // Check database
      try {
        await fastify.db.execute(sql`SELECT 1`)
        checks.database = true
      } catch (error) {
        fastify.log.error(error, "Database health check failed")
        status = "unhealthy"
      }

      // Check Redis if available
      if ((fastify as any).redis) {
        try {
          await (fastify as any).redis.ping()
          checks.redis = true
        } catch (error) {
          fastify.log.warn(error, "Redis health check failed")
          status = status === "unhealthy" ? "unhealthy" : "degraded"
        }
      }

      const response = {
        status,
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        version: process.env.npm_package_version || "1.0.0",
        checks,
      }

      const statusCode = status === "healthy" ? 200 : 503
      return reply.code(statusCode).send(response)
    },
  )

  // Simple ping endpoint
  app.get(
    "/ping",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              pong: { type: "boolean" },
            },
          },
        },
        tags: ["health"],
        summary: "Ping",
        description: "Simple ping endpoint",
      },
    },
    async (request, reply) => {
      return reply.send({ pong: true })
    },
  )
}

export default healthRoutes