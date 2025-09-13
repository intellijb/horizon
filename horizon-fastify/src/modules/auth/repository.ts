import { FastifyInstance } from "fastify"
import { eq, and, desc, gte, lte, or, like, sql } from "drizzle-orm"
import {
  users,
  devices,
  refreshTokens,
  accessTokens,
  passwordResetTokens,
  oauthAccounts,
  authAttempts,
  securityEvents,
} from "@/db/schema/auth.schema"
import {
  CreateUserBody,
  UpdateUserBody,
  User,
  Device,
  SecurityEvent,
} from "./schemas"
import bcrypt from "bcrypt"
import crypto from "crypto"

export function createAuthRepository(fastify: FastifyInstance) {
  const { db } = fastify

  // User operations
  async function findUserById(id: string): Promise<User | null> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        mfaEnabled: users.mfaEnabled,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return user || null
  }

  async function findUserByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        mfaEnabled: users.mfaEnabled,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return user || null
  }

  async function findUserWithPassword(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return user || null
  }

  async function createUser(data: CreateUserBody): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, 12)

    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        username: data.username || null,
        passwordHash,
        emailVerified: false,
        isActive: true,
        mfaEnabled: false,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        mfaEnabled: users.mfaEnabled,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })

    return user
  }

  async function updateUser(id: string, data: UpdateUserBody): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        mfaEnabled: users.mfaEnabled,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })

    return user || null
  }

  async function listUsers(options: {
    page: number
    limit: number
    search?: string
    isActive?: boolean
    emailVerified?: boolean
  }) {
    const offset = (options.page - 1) * options.limit
    const conditions: any[] = []

    if (options.search) {
      conditions.push(
        or(
          like(users.email, `%${options.search}%`),
          like(users.username, `%${options.search}%`),
        ),
      )
    }

    if (options.isActive !== undefined) {
      conditions.push(eq(users.isActive, options.isActive))
    }

    if (options.emailVerified !== undefined) {
      conditions.push(eq(users.emailVerified, options.emailVerified))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          emailVerified: users.emailVerified,
          isActive: users.isActive,
          mfaEnabled: users.mfaEnabled,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(options.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause),
    ])

    const count = countResult[0]?.count || 0

    return {
      data,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: count,
        totalPages: Math.ceil(count / options.limit),
      },
    }
  }

  async function deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id))
    return (result.rowCount ?? 0) > 0
  }

  // Device operations
  async function findDeviceById(id: string): Promise<Device | null> {
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1)

    return device || null
  }

  async function findDeviceByFingerprint(fingerprint: string): Promise<Device | null> {
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.deviceFingerprint, fingerprint))
      .limit(1)

    return device || null
  }

  async function createDevice(data: {
    userId: string
    deviceName?: string
    deviceType: "mobile" | "desktop" | "tablet" | "tv" | "watch" | "unknown"
    deviceFingerprint: string
  }): Promise<Device> {
    const [device] = await db
      .insert(devices)
      .values({
        userId: data.userId,
        deviceName: data.deviceName || null,
        deviceType: data.deviceType,
        deviceFingerprint: data.deviceFingerprint,
        trusted: false,
        lastSeenAt: new Date(),
      })
      .returning()

    return device
  }

  async function updateDevice(
    id: string,
    data: { deviceName?: string; trusted?: boolean },
  ): Promise<Device | null> {
    const [device] = await db
      .update(devices)
      .set({
        ...data,
        lastSeenAt: new Date(),
      })
      .where(eq(devices.id, id))
      .returning()

    return device || null
  }

  async function listUserDevices(
    userId: string,
    options: { page: number; limit: number; trusted?: boolean },
  ) {
    const offset = (options.page - 1) * options.limit
    const conditions: any[] = [eq(devices.userId, userId)]

    if (options.trusted !== undefined) {
      conditions.push(eq(devices.trusted, options.trusted))
    }

    const whereClause = and(...conditions)

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(devices)
        .where(whereClause)
        .orderBy(desc(devices.lastSeenAt))
        .limit(options.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(devices)
        .where(whereClause),
    ])

    const count = countResult[0]?.count || 0

    return {
      data,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: count,
        totalPages: Math.ceil(count / options.limit),
      },
    }
  }

  async function deleteDevice(id: string): Promise<boolean> {
    const result = await db.delete(devices).where(eq(devices.id, id))
    return (result.rowCount ?? 0) > 0
  }

  // Token operations
  async function createRefreshToken(data: {
    userId: string
    deviceId: string
    tokenFamily: string
    expiresAt: Date
    ipAddress?: string
    userAgent?: string
  }) {
    const tokenHash = crypto.randomBytes(32).toString("hex")

    await db.insert(refreshTokens).values({
      userId: data.userId,
      deviceId: data.deviceId,
      tokenHash,
      tokenFamily: data.tokenFamily,
      expiresAt: data.expiresAt,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    })

    return tokenHash
  }

  async function findRefreshToken(tokenHash: string) {
    const [token] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          gte(refreshTokens.expiresAt, new Date()),
          eq(refreshTokens.revokedAt, null),
        ),
      )
      .limit(1)

    return token || null
  }

  async function revokeRefreshToken(
    tokenHash: string,
    reason: string,
    replacedBy?: string,
  ) {
    await db
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        revokedReason: reason,
        replacedBy: replacedBy || null,
      })
      .where(eq(refreshTokens.tokenHash, tokenHash))
  }

  async function revokeTokenFamily(tokenFamily: string, reason: string) {
    await db
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        revokedReason: reason,
      })
      .where(
        and(eq(refreshTokens.tokenFamily, tokenFamily), eq(refreshTokens.revokedAt, null)),
      )
  }

  async function createPasswordResetToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.insert(passwordResetTokens).values({
      userId,
      tokenHash,
      expiresAt,
    })

    return token
  }

  async function findPasswordResetToken(token: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          gte(passwordResetTokens.expiresAt, new Date()),
          sql`${passwordResetTokens.usedAt} IS NULL`,
        ),
      )
      .limit(1)

    return resetToken || null
  }

  async function usePasswordResetToken(token: string, ipAddress?: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    await db
      .update(passwordResetTokens)
      .set({
        usedAt: new Date(),
        ipAddress: ipAddress || null,
      })
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
  }

  async function updatePassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 12)

    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
  }

  // Auth attempts
  async function recordAuthAttempt(data: {
    email?: string
    ipAddress: string
    success: boolean
    attemptType: "login" | "refresh" | "password_reset" | "email_verification" | "mfa_verification"
    errorReason?: string
    userAgent?: string
  }) {
    await db.insert(authAttempts).values({
      email: data.email || null,
      ipAddress: data.ipAddress,
      success: data.success,
      attemptType: data.attemptType,
      errorReason: data.errorReason || null,
      userAgent: data.userAgent || null,
    })
  }

  async function getRecentAuthAttempts(
    ipAddress: string,
    minutes: number = 15,
  ): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000)

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.ipAddress, ipAddress),
          eq(authAttempts.success, false),
          gte(authAttempts.createdAt, since),
        ),
      )

    return result.count
  }

  // Security events
  async function recordSecurityEvent(data: {
    userId?: string
    deviceId?: string
    eventType: string
    ipAddress?: string
    userAgent?: string
    metadata?: Record<string, any>
  }) {
    await db.insert(securityEvents).values({
      userId: data.userId || null,
      deviceId: data.deviceId || null,
      eventType: data.eventType as any,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      metadata: data.metadata || null,
    })
  }

  async function listSecurityEvents(options: {
    page: number
    limit: number
    userId?: string
    deviceId?: string
    eventType?: string
    startDate?: string
    endDate?: string
  }) {
    const offset = (options.page - 1) * options.limit
    const conditions: any[] = []

    if (options.userId) {
      conditions.push(eq(securityEvents.userId, options.userId))
    }

    if (options.deviceId) {
      conditions.push(eq(securityEvents.deviceId, options.deviceId))
    }

    if (options.eventType) {
      conditions.push(eq(securityEvents.eventType, options.eventType as any))
    }

    if (options.startDate) {
      conditions.push(gte(securityEvents.createdAt, new Date(options.startDate)))
    }

    if (options.endDate) {
      conditions.push(lte(securityEvents.createdAt, new Date(options.endDate)))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(securityEvents)
        .where(whereClause)
        .orderBy(desc(securityEvents.createdAt))
        .limit(options.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(securityEvents)
        .where(whereClause),
    ])

    const count = countResult[0]?.count || 0

    return {
      data: data as SecurityEvent[],
      pagination: {
        page: options.page,
        limit: options.limit,
        total: count,
        totalPages: Math.ceil(count / options.limit),
      },
    }
  }

  // OAuth operations
  async function findOAuthAccount(provider: string, providerUserId: string) {
    const [account] = await db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, provider as any),
          eq(oauthAccounts.providerUserId, providerUserId),
        ),
      )
      .limit(1)

    return account || null
  }

  async function createOAuthAccount(data: {
    userId: string
    provider: string
    providerUserId: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: Date
  }) {
    await db.insert(oauthAccounts).values({
      userId: data.userId,
      provider: data.provider as any,
      providerUserId: data.providerUserId,
      accessToken: data.accessToken || null,
      refreshToken: data.refreshToken || null,
      expiresAt: data.expiresAt || null,
    })
  }

  return {
    // User operations
    findUserById,
    findUserByEmail,
    findUserWithPassword,
    createUser,
    updateUser,
    listUsers,
    deleteUser,

    // Device operations
    findDeviceById,
    findDeviceByFingerprint,
    createDevice,
    updateDevice,
    listUserDevices,
    deleteDevice,

    // Token operations
    createRefreshToken,
    findRefreshToken,
    revokeRefreshToken,
    revokeTokenFamily,
    createPasswordResetToken,
    findPasswordResetToken,
    usePasswordResetToken,
    updatePassword,

    // Auth attempts
    recordAuthAttempt,
    getRecentAuthAttempts,

    // Security events
    recordSecurityEvent,
    listSecurityEvents,

    // OAuth
    findOAuthAccount,
    createOAuthAccount,
  }
}

export type AuthRepository = ReturnType<typeof createAuthRepository>