export const AuthConstants = {
  // Token expiration times (in seconds)
  ACCESS_TOKEN_EXPIRES_IN: 15 * 60, // 15 minutes
  REFRESH_TOKEN_EXPIRES_IN: 7 * 24 * 60 * 60, // 7 days
  PASSWORD_RESET_TOKEN_EXPIRES_IN: 60 * 60, // 1 hour
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: 24 * 60 * 60, // 24 hours

  // Security settings
  BCRYPT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  TOKEN_BYTES: 32,

  // Token types
  TOKEN_TYPE: "Bearer",
  REFRESH_TOKEN_TYPE: "refresh",

  // Default values
  DEFAULT_DEVICE_NAME: "Unknown Device",
  DEFAULT_ROLE: "user" as const,
} as const

export const SecurityEventTypes = {
  LOGIN_SUCCESS: "login",
  LOGIN_FAILED: "login_failed",
  LOGOUT: "logout",
  USER_REGISTERED: "account_reactivated", // Use existing enum value that makes sense for new user
  ACCOUNT_INACTIVE_LOGIN: "login_failed",
  PASSWORD_RESET_REQUESTED: "password_reset_request",
  PASSWORD_RESET_COMPLETED: "password_reset_complete",
  PASSWORD_CHANGED: "password_change",
  EMAIL_VERIFIED: "email_verification",
  TOKEN_REFRESH: "token_refresh",
  TOKEN_REVOKED: "token_revoked",
  MFA_ENABLED: "mfa_enabled",
  MFA_DISABLED: "mfa_disabled",
  DEVICE_ADDED: "device_added",
  DEVICE_REMOVED: "device_removed",
  DEVICE_TRUSTED: "device_trusted",
} as const

export const SecurityEventSeverity = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const

export const DeviceTypes = {
  MOBILE: "Mobile",
  TABLET: "Tablet",
  DESKTOP: "Desktop",
  WEB: "Web",
  UNKNOWN: "Unknown",
} as const

export type SecurityEventType = (typeof SecurityEventTypes)[keyof typeof SecurityEventTypes]
export type SecuritySeverity = (typeof SecurityEventSeverity)[keyof typeof SecurityEventSeverity]
export type DeviceType = (typeof DeviceTypes)[keyof typeof DeviceTypes]