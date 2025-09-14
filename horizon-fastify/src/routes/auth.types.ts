import { z } from "zod"

// Zod schemas for request validation
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceName: z.string().optional(),
})

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
})

export const verifyEmailSchema = z.object({
  token: z.string(),
})

// Response schemas
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  role: z.string(),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.string(),
  user: userSchema,
})

export const errorResponseSchema = z.object({
  error: z.string(),
})

export const messageResponseSchema = z.object({
  message: z.string(),
})

export const userProfileSchema = userSchema

// Type definitions for FastifyRequest
export interface LoginRequest {
  Body: z.infer<typeof loginSchema>
}

export interface RegisterRequest {
  Body: z.infer<typeof registerSchema>
}

export interface RefreshTokenRequest {
  Body: z.infer<typeof refreshTokenSchema>
}

export interface ForgotPasswordRequest {
  Body: z.infer<typeof forgotPasswordSchema>
}

export interface ResetPasswordRequest {
  Body: z.infer<typeof resetPasswordSchema>
}

export interface ChangePasswordRequest {
  Body: z.infer<typeof changePasswordSchema>
}

export interface VerifyEmailRequest {
  Body: z.infer<typeof verifyEmailSchema>
}