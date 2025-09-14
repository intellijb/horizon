export const AuthErrorCodes = {
  // Authentication errors
  INVALID_CREDENTIALS: "AUTH001",
  ACCOUNT_INACTIVE: "AUTH002",
  ACCOUNT_LOCKED: "AUTH003",
  TOKEN_INVALID: "AUTH004",
  TOKEN_EXPIRED: "AUTH005",
  TOKEN_REVOKED: "AUTH006",
  TOKEN_NOT_FOUND: "AUTH007",

  // Registration errors
  EMAIL_ALREADY_EXISTS: "REG001",
  USERNAME_ALREADY_EXISTS: "REG002",
  INVALID_EMAIL_FORMAT: "REG003",
  WEAK_PASSWORD: "REG004",

  // User errors
  USER_NOT_FOUND: "USR001",
  USER_NOT_ACTIVE: "USR002",
  EMAIL_NOT_VERIFIED: "USR003",

  // Device errors
  DEVICE_NOT_FOUND: "DEV001",
  DEVICE_NOT_TRUSTED: "DEV002",

  // Password errors
  INVALID_CURRENT_PASSWORD: "PWD001",
  PASSWORD_RESET_TOKEN_INVALID: "PWD002",
  PASSWORD_RESET_TOKEN_EXPIRED: "PWD003",

  // Rate limiting
  TOO_MANY_ATTEMPTS: "RATE001",

  // General errors
  UNAUTHORIZED: "GEN001",
  FORBIDDEN: "GEN002",
  VALIDATION_ERROR: "GEN003",
} as const

export type AuthErrorCode = (typeof AuthErrorCodes)[keyof typeof AuthErrorCodes]

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message)
    this.name = "AuthError"
  }
}