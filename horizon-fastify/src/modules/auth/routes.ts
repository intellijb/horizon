import { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { ErrorResponseSchema } from "./error-schemas"
import {
  UserParamsSchema,
  ListUsersQuerySchema,
  UserListSchema,
  UserSchema,
  CreateUserBodySchema,
  UpdateUserBodySchema,
  LoginBodySchema,
  RegisterBodySchema,
  AuthResponseSchema,
  RefreshTokenBodySchema,
  ForgotPasswordBodySchema,
  ResetPasswordBodySchema,
  VerifyEmailBodySchema,
  ChangePasswordBodySchema,
  DeviceParamsSchema,
  ListDevicesQuerySchema,
  DeviceListSchema,
  DeviceSchema,
  UpdateDeviceBodySchema,
  ListSecurityEventsQuerySchema,
  SecurityEventListSchema,
} from "./schemas"
import { createAuthService } from "./service"

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  const service = createAuthService(fastify)

  // ===== Authentication Routes =====

  // Register
  app.post(
    "/register",
    {
      schema: {
        body: RegisterBodySchema,
        response: {
          201: AuthResponseSchema,
          400: ErrorResponseSchema,
        },
        tags: ["auth"],
        summary: "Register new user",
        description: "Create a new user account",
      },
    },
    async (request, reply) => {
      try {
        const ipAddress = request.ip
        const userAgent = request.headers["user-agent"]
        const response = await service.register(request.body, ipAddress, userAgent)
        return reply.code(201).send(response)
      } catch (error) {
        if (error instanceof Error && error.message.includes("already exists")) {
          return reply.code(400).send({ error: error.message })
        }
        throw error
      }
    },
  )

  // Login
  app.post(
    "/login",
    {
      schema: {
        body: LoginBodySchema,
        response: {
          200: AuthResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
        tags: ["auth"],
        summary: "Login",
        description: "Authenticate user and get tokens",
      },
    },
    async (request, reply) => {
      try {
        const ipAddress = request.ip
        const userAgent = request.headers["user-agent"]
        const response = await service.login(request.body, ipAddress, userAgent)
        return reply.send(response)
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Too many failed attempts")) {
            return reply.code(429).send({ error: error.message })
          }
          if (error.message.includes("Invalid email or password") ||
              error.message.includes("Account is inactive")) {
            return reply.code(401).send({ error: error.message })
          }
        }
        throw error
      }
    },
  )

  // Refresh token
  app.post(
    "/refresh",
    {
      schema: {
        body: RefreshTokenBodySchema,
        response: {
          200: AuthResponseSchema,
          401: ErrorResponseSchema,
        },
        tags: ["auth"],
        summary: "Refresh token",
        description: "Get new access token using refresh token",
      },
    },
    async (request, reply) => {
      try {
        const ipAddress = request.ip
        const userAgent = request.headers["user-agent"]
        const response = await service.refreshToken(
          request.body.refreshToken,
          ipAddress,
          userAgent,
        )
        return reply.send(response)
      } catch (error) {
        if (error instanceof Error) {
          return reply.code(401).send({ error: error.message })
        }
        throw error
      }
    },
  )

  // Logout
  app.post(
    "/logout",
    {
      schema: {
        response: {
          204: {
            type: "null",
            description: "No content",
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["auth"],
        summary: "Logout",
        description: "Invalidate current session",
      },
    },
    async (request, reply) => {
      // In production, get userId and deviceId from JWT token
      // For now, this is a placeholder
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Unauthorized" })
      }

      const token = authHeader.substring(7)
      try {
        const payload = await service.verifyAccessToken(token)
        const ipAddress = request.ip
        const userAgent = request.headers["user-agent"]
        await service.logout(payload.userId, payload.deviceId, ipAddress, userAgent)
        return reply.code(204).send()
      } catch (error) {
        return reply.code(401).send({ error: "Invalid token" })
      }
    },
  )

  // Forgot password
  app.post(
    "/forgot-password",
    {
      schema: {
        body: ForgotPasswordBodySchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
        tags: ["auth"],
        summary: "Forgot password",
        description: "Request password reset token",
      },
    },
    async (request, reply) => {
      await service.forgotPassword(request.body.email)
      // Always return success to prevent email enumeration
      return reply.send({
        message: "If the email exists, a reset link has been sent",
      })
    },
  )

  // Reset password
  app.post(
    "/reset-password",
    {
      schema: {
        body: ResetPasswordBodySchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["auth"],
        summary: "Reset password",
        description: "Reset password using token",
      },
    },
    async (request, reply) => {
      const ipAddress = request.ip
      await service.resetPassword(request.body.token, request.body.password, ipAddress)
      return reply.send({ message: "Password has been reset successfully" })
    },
  )

  // Change password (authenticated)
  app.post(
    "/change-password",
    {
      schema: {
        body: ChangePasswordBodySchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["auth"],
        summary: "Change password",
        description: "Change password for authenticated user",
      },
    },
    async (request, reply) => {
      // In production, get userId from JWT token
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Unauthorized" })
      }

      const token = authHeader.substring(7)
      try {
        const payload = await service.verifyAccessToken(token)
        await service.changePassword(
          payload.userId,
          request.body.currentPassword,
          request.body.newPassword,
        )
        return reply.send({ message: "Password changed successfully" })
      } catch (error) {
        return reply.code(401).send({ error: "Invalid token or password" })
      }
    },
  )

  // Verify email
  app.post(
    "/verify-email",
    {
      schema: {
        body: VerifyEmailBodySchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["auth"],
        summary: "Verify email",
        description: "Verify email address using token",
      },
    },
    async (request, reply) => {
      await service.verifyEmail(request.body.token)
      return reply.send({ message: "Email verified successfully" })
    },
  )

  // ===== User Management Routes =====

  // List users (admin only)
  app.get(
    "/users",
    {
      schema: {
        querystring: ListUsersQuerySchema,
        response: {
          200: UserListSchema,
        },
        tags: ["users"],
        summary: "List users",
        description: "Get a paginated list of users",
      },
    },
    async (request, reply) => {
      const users = await service.listUsers(request.query)
      return reply.send(users)
    },
  )

  // Get user
  app.get(
    "/users/:id",
    {
      schema: {
        params: UserParamsSchema,
        response: {
          200: UserSchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["users"],
        summary: "Get user",
        description: "Get a single user by ID",
      },
    },
    async (request, reply) => {
      const user = await service.getUser(request.params.id)
      return reply.send(user)
    },
  )

  // Create user (admin only)
  app.post(
    "/users",
    {
      schema: {
        body: CreateUserBodySchema,
        response: {
          201: UserSchema,
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["users"],
        summary: "Create user",
        description: "Create a new user",
      },
    },
    async (request, reply) => {
      const user = await service.createUser(request.body)
      return reply.code(201).send(user)
    },
  )

  // Update user
  app.patch(
    "/users/:id",
    {
      schema: {
        params: UserParamsSchema,
        body: UpdateUserBodySchema,
        response: {
          200: UserSchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["users"],
        summary: "Update user",
        description: "Update an existing user",
      },
    },
    async (request, reply) => {
      const user = await service.updateUser(request.params.id, request.body)
      return reply.send(user)
    },
  )

  // Delete user
  app.delete(
    "/users/:id",
    {
      schema: {
        params: UserParamsSchema,
        response: {
          204: {
            type: "null",
            description: "No content",
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["users"],
        summary: "Delete user",
        description: "Delete a user",
      },
    },
    async (request, reply) => {
      await service.deleteUser(request.params.id)
      return reply.code(204).send()
    },
  )

  // ===== Device Management Routes =====

  // List user devices
  app.get(
    "/users/:id/devices",
    {
      schema: {
        params: UserParamsSchema,
        querystring: ListDevicesQuerySchema,
        response: {
          200: DeviceListSchema,
        },
        tags: ["devices"],
        summary: "List user devices",
        description: "Get a paginated list of user's devices",
      },
    },
    async (request, reply) => {
      const devices = await service.listUserDevices(request.params.id, request.query)
      return reply.send(devices)
    },
  )

  // Get device
  app.get(
    "/devices/:id",
    {
      schema: {
        params: DeviceParamsSchema,
        response: {
          200: DeviceSchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["devices"],
        summary: "Get device",
        description: "Get a single device by ID",
      },
    },
    async (request, reply) => {
      const device = await service.getDevice(request.params.id)
      return reply.send(device)
    },
  )

  // Update device
  app.patch(
    "/devices/:id",
    {
      schema: {
        params: DeviceParamsSchema,
        body: UpdateDeviceBodySchema,
        response: {
          200: DeviceSchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["devices"],
        summary: "Update device",
        description: "Update device settings",
      },
    },
    async (request, reply) => {
      const device = await service.updateDevice(request.params.id, request.body)
      return reply.send(device)
    },
  )

  // Delete device
  app.delete(
    "/devices/:id",
    {
      schema: {
        params: DeviceParamsSchema,
        response: {
          204: {
            type: "null",
            description: "No content",
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["devices"],
        summary: "Delete device",
        description: "Remove a device",
      },
    },
    async (request, reply) => {
      // In production, get userId from JWT token
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Unauthorized" })
      }

      const token = authHeader.substring(7)
      try {
        const payload = await service.verifyAccessToken(token)
        await service.deleteDevice(request.params.id, payload.userId)
        return reply.code(204).send()
      } catch (error) {
        return reply.code(401).send({ error: "Invalid token" })
      }
    },
  )

  // ===== Security Events Routes =====

  // List security events
  app.get(
    "/security-events",
    {
      schema: {
        querystring: ListSecurityEventsQuerySchema,
        response: {
          200: SecurityEventListSchema,
        },
        tags: ["security"],
        summary: "List security events",
        description: "Get a paginated list of security events",
      },
    },
    async (request, reply) => {
      const events = await service.listSecurityEvents(request.query)
      return reply.send(events)
    },
  )

  // Get current user profile
  app.get(
    "/me",
    {
      schema: {
        response: {
          200: UserSchema,
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["auth"],
        summary: "Get current user",
        description: "Get authenticated user's profile",
      },
    },
    async (request, reply) => {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Unauthorized" })
      }

      const token = authHeader.substring(7)
      try {
        const payload = await service.verifyAccessToken(token)
        const user = await service.getUser(payload.userId)
        return reply.send(user)
      } catch (error) {
        return reply.code(401).send({ error: "Invalid token" })
      }
    },
  )
}

export default authRoutes