import { FastifyRequest, FastifyReply } from "fastify"

// Common controller result interface
export interface ControllerResult<T = any> {
  data?: T
  error?: string
  statusCode: number
}

// Generic error class for domain errors
export interface DomainError extends Error {
  statusCode: number
}

/**
 * Wraps a route handler with common try/catch error handling
 */
export function withErrorHandling<T = any>(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<T>,
  errorClass?: new (...args: any[]) => DomainError
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handler(request, reply)
    } catch (error) {
      if (errorClass && error instanceof errorClass) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      if (error instanceof Error) {
        // Handle specific auth error cases
        if (error.message.includes("Too many failed attempts")) {
          return reply.code(429).send({ error: error.message })
        }
        if (error.message.includes("Invalid token") ||
            error.message.includes("Unauthorized") ||
            error.message.includes("Invalid refresh token") ||
            error.message.includes("refresh token")) {
          return reply.code(401).send({ error: error.message })
        }
        return reply.code(400).send({ error: error.message })
      }
      throw error
    }
  }
}

/**
 * Handles controller results with consistent response formatting
 */
export function handleControllerResult(
  result: ControllerResult,
  reply: FastifyReply
) {
  if (result.error) {
    return reply.code(result.statusCode).send({ error: result.error })
  }

  if (result.data !== undefined) {
    return reply.code(result.statusCode).send(result.data)
  }

  // For 204 No Content responses
  return reply.code(result.statusCode).send()
}

/**
 * Extracts Bearer token from Authorization header
 */
export function extractBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Middleware to require authentication with Bearer token
 */
export function requireAuth<T = any>(
  handler: (request: FastifyRequest, reply: FastifyReply, token: string) => Promise<T>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractBearerToken(request)
    if (!token) {
      return reply.code(401).send({ error: "Unauthorized" })
    }
    return handler(request, reply, token)
  }
}