import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import {
  LoginUseCase,
  RegisterUseCase,
  RefreshTokenUseCase,
  AuthRepositoryDrizzle,
  AuthErrorCodes,
  AuthError,
  TokenService,
  PasswordService,
} from "@modules/features/auth"
import {
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  VerifyEmailRequest,
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  authResponseSchema,
  errorResponseSchema,
  messageResponseSchema,
  userProfileSchema,
} from "./auth.types"

export default async function authRoutes(fastify: FastifyInstance) {
  // Initialize repository and use cases
  const repository = new AuthRepositoryDrizzle(fastify.db)
  const loginUseCase = new LoginUseCase(repository)
  const registerUseCase = new RegisterUseCase(repository)
  const refreshTokenUseCase = new RefreshTokenUseCase(repository)
  const tokenService = new TokenService()
  const passwordService = new PasswordService()

  // ===== Authentication Routes =====

  // Register
  fastify.post<RegisterRequest>("/auth/register", {
    schema: {
      tags: ["Authentication"],
      summary: "Register new user",
      description: "Create a new user account",
      body: registerSchema,
      response: {
        201: authResponseSchema,
        400: errorResponseSchema,
      },
    },
  }, async (request: FastifyRequest<RegisterRequest>, reply: FastifyReply) => {
    try {
      const response = await registerUseCase.execute({
        ...request.body,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      })
      return reply.code(201).send(response)
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      if (error instanceof Error) {
        return reply.code(400).send({ error: error.message })
      }
      throw error
    }
  })

  // Login
  fastify.post<LoginRequest>("/auth/login", {
    schema: {
      tags: ["Authentication"],
      summary: "Login",
      description: "Authenticate user and get tokens",
      body: loginSchema,
      response: {
        200: authResponseSchema,
        401: errorResponseSchema,
        429: errorResponseSchema,
      },
    },
  }, async (request: FastifyRequest<LoginRequest>, reply: FastifyReply) => {
    try {
      const response = await loginUseCase.execute({
        ...request.body,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      })
      return reply.send(response)
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      if (error instanceof Error) {
        if (error.message.includes("Too many failed attempts")) {
          return reply.code(429).send({ error: error.message })
        }
        return reply.code(401).send({ error: error.message })
      }
      throw error
    }
  })

  // Refresh token
  fastify.post<RefreshTokenRequest>("/auth/refresh", {
    schema: {
      tags: ["Authentication"],
      summary: "Refresh token",
      description: "Get new access token using refresh token",
      body: refreshTokenSchema,
      response: {
        200: authResponseSchema,
        401: errorResponseSchema,
      },
    },
  }, async (request: FastifyRequest<RefreshTokenRequest>, reply: FastifyReply) => {
    try {
      const response = await refreshTokenUseCase.execute({
        refreshToken: request.body.refreshToken,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      })
      return reply.send(response)
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      if (error instanceof Error) {
        return reply.code(401).send({ error: error.message })
      }
      throw error
    }
  })

  // Logout
  fastify.post("/auth/logout", {
    schema: {
      tags: ["Authentication"],
      summary: "Logout",
      description: "Invalidate current session",
      response: {
        204: {
          type: "null",
          description: "No content",
        },
        401: errorResponseSchema,
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    const token = authHeader.substring(7)
    try {
      const payload = tokenService.verifyAccessToken(token)
      if (payload.deviceId) {
        await repository.revokeDeviceTokens(payload.userId, payload.deviceId)
      }
      return reply.code(204).send()
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      return reply.code(401).send({ error: "Invalid token" })
    }
  })

  // Forgot password
  fastify.post<ForgotPasswordRequest>("/auth/forgot-password", {
    schema: {
      tags: ["Authentication"],
      summary: "Forgot password",
      description: "Request password reset token",
      body: forgotPasswordSchema,
      response: {
        200: messageResponseSchema,
      },
    },
  }, async (request: FastifyRequest<ForgotPasswordRequest>, reply: FastifyReply) => {
    const user = await repository.findUserByEmail(request.body.email)

    if (user) {
      const resetToken = tokenService.generateRandomToken()
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await repository.savePasswordResetToken(user.id, resetToken, expiresAt)

      // In production, send email here
      fastify.log.info({ token: resetToken }, "Password reset token generated")
    }

    // Always return success to prevent email enumeration
    return reply.send({
      message: "If the email exists, a reset link has been sent",
    })
  })

  // Reset password
  fastify.post<ResetPasswordRequest>("/auth/reset-password", {
    schema: {
      tags: ["Authentication"],
      summary: "Reset password",
      description: "Reset password using token",
      body: resetPasswordSchema,
      response: {
        200: messageResponseSchema,
        400: errorResponseSchema,
      },
    },
  }, async (request: FastifyRequest<ResetPasswordRequest>, reply: FastifyReply) => {
    try {
      const tokenData = await repository.findPasswordResetToken(request.body.token)

      if (!tokenData || new Date() > tokenData.expiresAt) {
        throw new AuthError(
          AuthErrorCodes.PASSWORD_RESET_TOKEN_EXPIRED,
          "Invalid or expired token",
          400
        )
      }

      const passwordHash = await passwordService.hash(request.body.password)
      await repository.updateUser(tokenData.userId, { passwordHash } as any)
      await repository.deletePasswordResetToken(request.body.token)

      return reply.send({ message: "Password has been reset successfully" })
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      if (error instanceof Error) {
        return reply.code(400).send({ error: error.message })
      }
      throw error
    }
  })

  // Change password
  fastify.post<ChangePasswordRequest>("/auth/change-password", {
    schema: {
      tags: ["Authentication"],
      summary: "Change password",
      description: "Change password for authenticated user",
      body: changePasswordSchema,
      response: {
        200: messageResponseSchema,
        401: errorResponseSchema,
      },
    },
  }, async (request: FastifyRequest<ChangePasswordRequest>, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    const token = authHeader.substring(7)
    try {
      const payload = tokenService.verifyAccessToken(token)
      const user = await repository.findUserWithPassword(payload.email)

      if (!user || !user.passwordHash) {
        throw new AuthError(AuthErrorCodes.USER_NOT_FOUND, "User not found", 404)
      }

      await passwordService.verifyOrThrow(request.body.currentPassword, user.passwordHash)
      const newPasswordHash = await passwordService.hash(request.body.newPassword)
      await repository.updateUser(user.id, { passwordHash: newPasswordHash } as any)

      return reply.send({ message: "Password changed successfully" })
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      return reply.code(401).send({ error: "Invalid token or password" })
    }
  })

  // Verify email
  fastify.post<VerifyEmailRequest>("/auth/verify-email", {
    schema: {
      tags: ["Authentication"],
      summary: "Verify email",
      description: "Verify email address using token",
      body: verifyEmailSchema,
      response: {
        200: messageResponseSchema,
        400: errorResponseSchema,
      },
    },
  }, async (request: FastifyRequest<VerifyEmailRequest>, reply: FastifyReply) => {
    try {
      const tokenData = await repository.findEmailVerificationToken(request.body.token)

      if (!tokenData || new Date() > tokenData.expiresAt) {
        throw new AuthError(
          AuthErrorCodes.TOKEN_EXPIRED,
          "Invalid or expired token",
          400
        )
      }

      await repository.markEmailAsVerified(tokenData.userId)
      await repository.deleteEmailVerificationToken(request.body.token)

      return reply.send({ message: "Email verified successfully" })
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      if (error instanceof Error) {
        return reply.code(400).send({ error: error.message })
      }
      throw error
    }
  })

  // Get current user profile
  fastify.get("/auth/me", {
    schema: {
      tags: ["Authentication"],
      summary: "Get current user",
      description: "Get authenticated user's profile",
      response: {
        200: userProfileSchema,
        401: errorResponseSchema,
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    const token = authHeader.substring(7)
    try {
      const payload = tokenService.verifyAccessToken(token)
      const user = await repository.findUserById(payload.userId)

      if (!user) {
        throw new AuthError(AuthErrorCodes.USER_NOT_FOUND, "User not found", 404)
      }

      return reply.send(user.toPublicJSON())
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      return reply.code(401).send({ error: "Invalid token" })
    }
  })
}