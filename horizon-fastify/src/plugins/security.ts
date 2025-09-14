import fp from "fastify-plugin"
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import helmet from "@fastify/helmet"
import jwt from "@fastify/jwt"
import cookie from "@fastify/cookie"
import cors from "@fastify/cors"
import sensible from "@fastify/sensible"

// Type declarations moved to src/types/fastify.d.ts

async function securityPlugin(fastify: FastifyInstance) {
  // Register sensible for httpErrors
  await fastify.register(sensible)

  // Register helmet for security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })

  // Register CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })

  // Register cookie support
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || "change-this-secret-in-production",
    parseOptions: {},
  })

  // Register JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || "change-this-secret-in-production",
    cookie: {
      cookieName: "token",
      signed: false,
    },
  })

  // Authentication decorator
  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify()
      } catch (err) {
        reply.code(401).send({ error: "Unauthorized" })
      }
    },
  )

  // Optional authentication decorator
  fastify.decorate(
    "verifyOptionalAuth",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify()
      } catch (err) {
        // Silent fail - user is not authenticated but request continues
        delete (request as any).user
      }
    },
  )

  fastify.log.info("Security plugins initialized")
}

export default fp(securityPlugin, {
  name: "security",
})