import { relations } from "drizzle-orm"
import {
  users,
  devices,
  refreshTokens,
  accessTokens,
  passwordResetTokens,
  oauthAccounts,
  authAttempts,
  securityEvents,
} from "./auth.schema"

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  devices: many(devices),
  refreshTokens: many(refreshTokens),
  accessTokens: many(accessTokens),
  passwordResetTokens: many(passwordResetTokens),
  oauthAccounts: many(oauthAccounts),
  securityEvents: many(securityEvents),
}))

// Device relations
export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, {
    fields: [devices.userId],
    references: [users.id],
  }),
  refreshTokens: many(refreshTokens),
  accessTokens: many(accessTokens),
  securityEvents: many(securityEvents),
}))

// Refresh token relations
export const refreshTokensRelations = relations(
  refreshTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [refreshTokens.userId],
      references: [users.id],
    }),
    device: one(devices, {
      fields: [refreshTokens.deviceId],
      references: [devices.id],
    }),
    replacedByToken: one(refreshTokens, {
      fields: [refreshTokens.replacedBy],
      references: [refreshTokens.id],
      relationName: "tokenReplacement",
    }),
  }),
)

// Access token relations
export const accessTokensRelations = relations(accessTokens, ({ one }) => ({
  user: one(users, {
    fields: [accessTokens.userId],
    references: [users.id],
  }),
  device: one(devices, {
    fields: [accessTokens.deviceId],
    references: [devices.id],
  }),
}))

// Password reset token relations
export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  }),
)

// OAuth account relations
export const oauthAccountsRelations = relations(
  oauthAccounts,
  ({ one }) => ({
    user: one(users, {
      fields: [oauthAccounts.userId],
      references: [users.id],
    }),
  }),
)

// Security events relations
export const securityEventsRelations = relations(
  securityEvents,
  ({ one }) => ({
    user: one(users, {
      fields: [securityEvents.userId],
      references: [users.id],
    }),
    device: one(devices, {
      fields: [securityEvents.deviceId],
      references: [devices.id],
    }),
  }),
)