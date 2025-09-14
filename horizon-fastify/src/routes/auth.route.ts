import { FastifyInstance, FastifyRequest } from "fastify"
import {
  AuthError,
  AuthController,
  authRequests,
  authResponseSchemas,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  VerifyEmailRequest,
} from "@modules/features/auth"
import { createRoutesFactory, commonResponses } from "@modules/platform/fastify"

export default async function authRoutes(fastify: FastifyInstance) {
  const controller = new AuthController(fastify.db)
  const routes = createRoutesFactory(fastify, {
    tags: ["Authentication"],
    errorClass: AuthError,
  })

  // ===== Authentication Routes =====

  // Register
  routes.post("/auth/register", {
    summary: "Register new user",
    description: "Create a new user account",
  })
    .withBody(authRequests.register)
    .withResponses({
      201: authResponseSchemas.auth,
      ...commonResponses.error(),
    })
    .handle(async (request: FastifyRequest<RegisterRequest>) => {
      const { email, password, username, firstName, lastName } = request.body as RegisterRequest["Body"]
      return await controller.register(
        { email, password, username, firstName, lastName },
        request.ip,
        request.headers["user-agent"]
      )
    })

  // Login
  routes.post("/auth/login", {
    summary: "Login",
    description: "Authenticate user and get tokens",
  })
    .withBody(authRequests.login)
    .withResponses({
      200: authResponseSchemas.auth,
      ...commonResponses.unauthorized(),
      ...commonResponses.rateLimited(),
    })
    .handle(async (request: FastifyRequest<LoginRequest>) => {
      const { email, password, deviceName } = request.body as LoginRequest["Body"]
      return await controller.login(
        { email, password, deviceName },
        request.ip,
        request.headers["user-agent"]
      )
    })

  // Refresh token
  routes.post("/auth/refresh", {
    summary: "Refresh token",
    description: "Get new access token using refresh token",
  })
    .withBody(authRequests.refreshToken)
    .withResponses(commonResponses.authResponses(authResponseSchemas.auth))
    .handle(async (request: FastifyRequest<RefreshTokenRequest>) => {
      const { refreshToken } = request.body as RefreshTokenRequest["Body"]
      return await controller.refreshToken(
        { refreshToken },
        request.ip,
        request.headers["user-agent"]
      )
    })

  // Logout
  routes.post("/auth/logout", {
    summary: "Logout",
    description: "Invalidate current session",
    requireAuth: true,
  })
    .withResponses({
      ...commonResponses.noContent(),
      ...commonResponses.unauthorized(),
    })
    .authHandle(async (request: FastifyRequest, reply, token: string) => {
      return await controller.logout(token)
    })

  // Forgot password
  routes.post("/auth/forgot-password", {
    summary: "Forgot password",
    description: "Request password reset token",
  })
    .withBody(authRequests.forgotPassword)
    .withResponses({
      200: authResponseSchemas.message,
    })
    .handle(async (request: FastifyRequest<ForgotPasswordRequest>) => {
      const { email } = request.body as ForgotPasswordRequest["Body"]
      return await controller.forgotPassword({ email })
    })

  // Reset password
  routes.post("/auth/reset-password", {
    summary: "Reset password",
    description: "Reset password using token",
  })
    .withBody(authRequests.resetPassword)
    .withResponses({
      200: authResponseSchemas.message,
      ...commonResponses.error(),
    })
    .handle(async (request: FastifyRequest<ResetPasswordRequest>) => {
      const { token, password } = request.body as ResetPasswordRequest["Body"]
      return await controller.resetPassword({ token, password })
    })

  // Change password
  routes.post("/auth/change-password", {
    summary: "Change password",
    description: "Change password for authenticated user",
    requireAuth: true,
  })
    .withBody(authRequests.changePassword)
    .withResponses(commonResponses.authResponses(authResponseSchemas.message))
    .authHandle(async (request: FastifyRequest<ChangePasswordRequest>, reply, token: string) => {
      const { currentPassword, newPassword } = request.body as ChangePasswordRequest["Body"]
      return await controller.changePassword({ currentPassword, newPassword }, token)
    })

  // Verify email
  routes.post("/auth/verify-email", {
    summary: "Verify email",
    description: "Verify email address using token",
  })
    .withBody(authRequests.verifyEmail)
    .withResponses({
      200: authResponseSchemas.message,
      ...commonResponses.error(),
    })
    .handle(async (request: FastifyRequest<VerifyEmailRequest>) => {
      const { token } = request.body as VerifyEmailRequest["Body"]
      return await controller.verifyEmail({ token })
    })

  // Get current user profile
  routes.get("/auth/me", {
    summary: "Get current user",
    description: "Get authenticated user's profile",
    requireAuth: true,
  })
    .withResponses(commonResponses.authResponses(authResponseSchemas.userProfile))
    .authHandle(async (request: FastifyRequest, reply, token: string) => {
      return await controller.getCurrentUser(token)
    })
}