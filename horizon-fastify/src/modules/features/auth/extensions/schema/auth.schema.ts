import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  inet,
  jsonb,
  varchar,
  index,
  unique,
  pgSchema,
} from "drizzle-orm/pg-core"
import {
  deviceTypeEnum,
  authEventTypeEnum,
  authAttemptTypeEnum,
  oauthProviderEnum,
} from "./enums"

// Create auth schema
export const authSchema = pgSchema("auth")

// Users table
export const users = authSchema.table(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    username: text("username").unique(),
    passwordHash: text("password_hash").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    emailVerificationToken: text("email_verification_token"),
    emailVerificationExpires: timestamp("email_verification_expires", {
      withTimezone: true,
    }),
    isActive: boolean("is_active").default(true).notNull(),
    mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
    mfaSecret: text("mfa_secret"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    usernameIdx: index("users_username_idx").on(table.username),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
  }),
)

// Devices table
export const devices = authSchema.table(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceName: varchar("device_name", { length: 255 }),
    deviceType: deviceTypeEnum("device_type").notNull(),
    deviceFingerprint: text("device_fingerprint").notNull().unique(),
    trusted: boolean("trusted").default(false).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("devices_user_id_idx").on(table.userId),
    fingerprintIdx: index("devices_fingerprint_idx").on(table.deviceFingerprint),
    lastSeenIdx: index("devices_last_seen_idx").on(table.lastSeenAt),
  }),
)

// Refresh tokens table
export const refreshTokens = authSchema.table(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    tokenFamily: uuid("token_family").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
    replacedBy: uuid("replaced_by").references(() => refreshTokens.id),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("refresh_tokens_user_id_idx").on(table.userId),
    deviceIdIdx: index("refresh_tokens_device_id_idx").on(table.deviceId),
    tokenHashIdx: index("refresh_tokens_token_hash_idx").on(table.tokenHash),
    tokenFamilyIdx: index("refresh_tokens_family_idx").on(table.tokenFamily),
    expiresAtIdx: index("refresh_tokens_expires_at_idx").on(table.expiresAt),
    userDeviceIdx: index("refresh_tokens_user_device_idx").on(
      table.userId,
      table.deviceId,
    ),
  }),
)

// Access tokens table (optional, for revocation tracking)
export const accessTokens = authSchema.table(
  "access_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    jti: varchar("jti", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    jtiIdx: index("access_tokens_jti_idx").on(table.jti),
    userDeviceIdx: index("access_tokens_user_device_idx").on(
      table.userId,
      table.deviceId,
    ),
    expiresAtIdx: index("access_tokens_expires_at_idx").on(table.expiresAt),
  }),
)

// Password reset tokens table
export const passwordResetTokens = authSchema.table(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
    tokenHashIdx: index("password_reset_tokens_token_hash_idx").on(
      table.tokenHash,
    ),
    expiresAtIdx: index("password_reset_tokens_expires_at_idx").on(
      table.expiresAt,
    ),
  }),
)

// OAuth accounts table
export const oauthAccounts = authSchema.table(
  "oauth_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: oauthProviderEnum("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("oauth_accounts_user_id_idx").on(table.userId),
    providerUnique: unique("oauth_accounts_provider_user_unique").on(
      table.provider,
      table.providerUserId,
    ),
  }),
)

// Authentication attempts table
export const authAttempts = authSchema.table(
  "auth_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email"),
    ipAddress: inet("ip_address").notNull(),
    success: boolean("success").notNull(),
    attemptType: authAttemptTypeEnum("attempt_type").notNull(),
    errorReason: text("error_reason"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("auth_attempts_email_idx").on(table.email),
    ipAddressIdx: index("auth_attempts_ip_address_idx").on(table.ipAddress),
    createdAtIdx: index("auth_attempts_created_at_idx").on(table.createdAt),
    attemptTypeIdx: index("auth_attempts_type_idx").on(table.attemptType),
  }),
)

// Security events table (audit log)
export const securityEvents = authSchema.table(
  "security_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    deviceId: uuid("device_id").references(() => devices.id, {
      onDelete: "set null",
    }),
    eventType: authEventTypeEnum("event_type").notNull(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("security_events_user_id_idx").on(table.userId),
    deviceIdIdx: index("security_events_device_id_idx").on(table.deviceId),
    eventTypeIdx: index("security_events_event_type_idx").on(table.eventType),
    createdAtIdx: index("security_events_created_at_idx").on(table.createdAt),
    userEventIdx: index("security_events_user_event_idx").on(
      table.userId,
      table.eventType,
    ),
  }),
)