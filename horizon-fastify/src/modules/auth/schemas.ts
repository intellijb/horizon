import { z } from "zod"

// User schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().nullable(),
  emailVerified: z.boolean(),
  isActive: z.boolean(),
  mfaEnabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateUserBodySchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).optional(),
  password: z.string().min(8).max(128),
})

export const UpdateUserBodySchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(30).nullable().optional(),
  isActive: z.boolean().optional(),
})

export const UserParamsSchema = z.object({
  id: z.string().uuid(),
})

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  emailVerified: z.coerce.boolean().optional(),
})

export const UserListSchema = z.object({
  data: z.array(UserSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

// Auth schemas
export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
  deviceFingerprint: z.string().optional(),
  deviceName: z.string().optional(),
})

export const RefreshTokenBodySchema = z.object({
  refreshToken: z.string(),
})

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.literal("Bearer"),
  user: UserSchema,
})

export const RegisterBodySchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).optional(),
  password: z.string().min(8).max(128),
})

export const ForgotPasswordBodySchema = z.object({
  email: z.string().email(),
})

export const ResetPasswordBodySchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
})

export const VerifyEmailBodySchema = z.object({
  token: z.string(),
})

export const ChangePasswordBodySchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(128),
})

// Device schemas
export const DeviceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceName: z.string().nullable(),
  deviceType: z.enum(["mobile", "desktop", "tablet", "tv", "watch", "unknown"]),
  deviceFingerprint: z.string(),
  trusted: z.boolean(),
  lastSeenAt: z.date(),
  createdAt: z.date(),
})

export const ListDevicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  trusted: z.coerce.boolean().optional(),
})

export const DeviceListSchema = z.object({
  data: z.array(DeviceSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

export const DeviceParamsSchema = z.object({
  id: z.string().uuid(),
})

export const UpdateDeviceBodySchema = z.object({
  deviceName: z.string().max(255).optional(),
  trusted: z.boolean().optional(),
})

// OAuth schemas
export const OAuthProviderSchema = z.enum(["google", "github", "microsoft", "apple"])

export const OAuthCallbackQuerySchema = z.object({
  code: z.string(),
  state: z.string(),
})

// Security event schemas
export const SecurityEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  deviceId: z.string().uuid().nullable(),
  eventType: z.enum([
    "login",
    "logout",
    "token_refresh",
    "password_change",
    "password_reset_request",
    "password_reset_complete",
    "email_verification",
    "mfa_enabled",
    "mfa_disabled",
    "device_added",
    "device_removed",
    "device_trusted",
    "oauth_linked",
    "oauth_unlinked",
    "account_suspended",
    "account_reactivated",
    "login_failed",
    "token_revoked",
  ]),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.date(),
})

export const ListSecurityEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  userId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional(),
  eventType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const SecurityEventListSchema = z.object({
  data: z.array(SecurityEventSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

// Type exports
export type User = z.infer<typeof UserSchema>
export type CreateUserBody = z.infer<typeof CreateUserBodySchema>
export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>
export type LoginBody = z.infer<typeof LoginBodySchema>
export type RefreshTokenBody = z.infer<typeof RefreshTokenBodySchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
export type RegisterBody = z.infer<typeof RegisterBodySchema>
export type Device = z.infer<typeof DeviceSchema>
export type SecurityEvent = z.infer<typeof SecurityEventSchema>