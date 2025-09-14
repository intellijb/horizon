// Request type definitions for auth routes
export interface LoginRequest {
  Body: {
    email: string
    password: string
    deviceName?: string
  }
}

export interface RegisterRequest {
  Body: {
    email: string
    password: string
    username?: string
    firstName?: string
    lastName?: string
  }
}

export interface RefreshTokenRequest {
  Body: {
    refreshToken: string
  }
}

export interface ForgotPasswordRequest {
  Body: {
    email: string
  }
}

export interface ResetPasswordRequest {
  Body: {
    token: string
    password: string
  }
}

export interface ChangePasswordRequest {
  Body: {
    currentPassword: string
    newPassword: string
  }
}

export interface VerifyEmailRequest {
  Body: {
    token: string
  }
}

// OpenAPI schemas for documentation
export const authResponseSchema = {
  type: "object",
  properties: {
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
    expiresIn: { type: "number" },
    tokenType: { type: "string" },
    user: {
      type: "object",
      properties: {
        id: { type: "string" },
        email: { type: "string" },
        username: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        role: { type: "string" },
        isActive: { type: "boolean" },
        emailVerified: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
  },
} as const

export const errorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
} as const

export const messageResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
} as const

export const userProfileSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    email: { type: "string" },
    username: { type: "string" },
    firstName: { type: "string" },
    lastName: { type: "string" },
    role: { type: "string" },
    isActive: { type: "boolean" },
    emailVerified: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const