import Fastify, { FastifyInstance } from "fastify"
import cors from "@fastify/cors"
import env from "@fastify/env"
import { config, configSchema, logConfigSummary, isDevelopment, isProduction, loggingConfig, graphqlConfig } from "@config"
import { logger } from "@modules/logging"
import loggingPlugin from "@/plugins/logging"
import connectionPoolPlugin from "@/plugins/connection-pool"
import postgresPlugin from "@/plugins/postgres"
import redisPlugin from "@/plugins/redis"
import drizzlePlugin from "@/plugins/drizzle"
import swaggerPlugin from "@/plugins/swagger"
import securityPlugin from "@/plugins/security"
import graphqlPlugin from "@/plugins/graphql"

// Module routes
import entriesRoutes from "@/modules/entries/routes"
import attachmentsRoutes from "@/modules/attachments/routes"
import healthRoutes from "@/modules/health/routes"

declare module "fastify" {
  interface FastifyInstance {
    config: {
      NODE_ENV: string
      PORT: number
      HOST: string
      POSTGRES_URI: string
      REDIS_URL: string
    }
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  // Log configuration summary in development
  if (isDevelopment) {
    logConfigSummary()
  }

  // Create Fastify instance with logger configuration
  const app = Fastify({
    logger: {
      level: loggingConfig.level,
      transport:
        loggingConfig.pretty && isDevelopment
          ? {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
                colorize: true,
              },
            }
          : undefined,
      redact: loggingConfig.redactEnabled
        ? {
            paths: [...loggingConfig.redactPaths],
            censor: "[REDACTED]",
          }
        : undefined,
    },
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "requestId",
    disableRequestLogging: true, // We handle this in our middleware
  })

  // Register logging plugin first (includes correlation middleware)
  await app.register(loggingPlugin)

  // Register env plugin
  await app.register(env, {
    confKey: "config",
    schema: configSchema,
    dotenv: false, // We handle env loading in config
  })

  // Register security plugins (includes helmet, JWT, cookies, CORS)
  await app.register(securityPlugin)

  // Register connection plugins in correct order
  // 1. Connection pool must be first
  await app.register(connectionPoolPlugin)

  // 2. PostgreSQL and Redis plugins can run in parallel
  await Promise.all([
    app.register(postgresPlugin),
    app.register(redisPlugin),
  ])

  // 3. Drizzle depends on the connection pool
  await app.register(drizzlePlugin)

  // Register Swagger documentation
  await app.register(swaggerPlugin)

  // Register GraphQL (conditionally)
  if (graphqlConfig.enabled) {
    await app.register(graphqlPlugin)
  }

  // Register module routes
  await app.register(entriesRoutes, { prefix: "/entries" })
  await app.register(attachmentsRoutes, { prefix: "/attachments" })
  await app.register(healthRoutes, { prefix: "/health" })

  return app
}