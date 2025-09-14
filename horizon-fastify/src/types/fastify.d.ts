import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import type { Pool, QueryResult, QueryResultRow } from "pg"
import type { FastifyRequest, FastifyReply } from "fastify"

declare module "fastify" {
  interface FastifyInstance {
    // Config
    config: {
      NODE_ENV: string
      PORT: number
      HOST: string
      POSTGRES_URI: string
      REDIS_URL: string
    }

    // Database
    db: NodePgDatabase<any>
    pgPool: Pool
    pgMetrics: () => any
    pgCircuitBreaker: () => any
    pgHealthCheck: () => Promise<any>
    pgQuery: (text: string, values?: any[]) => Promise<any>
    pgTransaction: (fn: any) => Promise<any>
    pg: {
      query: <T extends QueryResultRow = any>(text: string, values?: any[]) => Promise<QueryResult<T>>
      transact: <T>(fn: (client: any) => Promise<T>) => Promise<T>
      pool: any
    }

    // Redis
    redis: any
    redisHealthCheck: () => Promise<any>
    redisMetrics: () => any
    redisExecute: (command: string, ...args: any[]) => Promise<any>

    // Logging
    structuredLogger: any
    createLogger: any
    generateCorrelationId: any
    getRequestContext: () => any

    // Security
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    verifyOptionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }

  interface FastifyRequest {
    logger: any
    requestId: string
    correlationId: string
    startTime: bigint
    user?: {
      id: string
      [key: string]: any
    }
    cookies?: Record<string, string>
  }
}