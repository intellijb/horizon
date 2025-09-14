import { pgEnum } from "drizzle-orm/pg-core"

export const deviceTypeEnum = pgEnum("device_type", [
  "mobile",
  "desktop",
  "tablet",
  "tv",
  "watch",
  "unknown",
])

export const authEventTypeEnum = pgEnum("auth_event_type", [
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
])

export const authAttemptTypeEnum = pgEnum("auth_attempt_type", [
  "login",
  "refresh",
  "password_reset",
  "email_verification",
  "mfa_verification",
])

export const oauthProviderEnum = pgEnum("oauth_provider", [
  "google",
  "github",
  "facebook",
  "twitter",
  "apple",
  "microsoft",
  "discord",
  "linkedin",
])