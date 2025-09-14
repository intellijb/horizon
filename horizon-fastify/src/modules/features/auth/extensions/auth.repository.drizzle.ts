import { eq, and, desc, gte, lte, or, like, sql, isNull } from "drizzle-orm"
import { NodePgDatabase } from "drizzle-orm/node-postgres"
import crypto from "crypto"
import bcrypt from "bcrypt"
import {
  users,
  devices,
  refreshTokens,
  passwordResetTokens,
  authAttempts,
  securityEvents,
} from "./schema/auth.schema"
import * as schema from "./schema"
import { AuthRepositoryPort } from "../domain/ports/auth-repository.port"
import { User, UserCreateData, UserUpdateData } from "../domain/entities/user.entity"
import { RefreshTokenData, DeviceInfo, SecurityEvent } from "../domain/value-objects/token.value"

type Database = NodePgDatabase<typeof schema>

export class AuthRepositoryDrizzle implements AuthRepositoryPort {
  constructor(private db: Database) {}

  // User operations
  async findUserById(id: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return user ? this.mapToUser(user) : null
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return user ? this.mapToUser(user) : null
  }

  async findUserWithPassword(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return user ? this.mapToUser(user, true) : null
  }

  async createUser(data: UserCreateData): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({
        email: data.email,
        username: data.username || null,
        passwordHash: data.password, // Password should already be hashed
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        role: data.role || "user",
        emailVerified: false,
        isActive: true,
        mfaEnabled: false,
      })
      .returning()

    return this.mapToUser(user)
  }

  async updateUser(id: string, data: UserUpdateData): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({
        ...(data.email && { email: data.email }),
        ...(data.username && { username: data.username }),
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.role && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.emailVerified !== undefined && { emailVerified: data.emailVerified }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()

    return this.mapToUser(user)
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id))
  }

  async listUsers(options: {
    page: number
    limit: number
    search?: string
    role?: string
    isActive?: boolean
    emailVerified?: boolean
  }): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const conditions = []

    if (options.search) {
      conditions.push(
        or(
          like(users.email, `%${options.search}%`),
          like(users.username, `%${options.search}%`),
        ),
      )
    }

    if (options.role) {
      conditions.push(eq(users.role, options.role as "user" | "admin"))
    }

    if (options.isActive !== undefined) {
      conditions.push(eq(users.isActive, options.isActive))
    }

    if (options.emailVerified !== undefined) {
      conditions.push(eq(users.emailVerified, options.emailVerified))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined
    const offset = (options.page - 1) * options.limit

    const [totalResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause)

    const results = await this.db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(options.limit)
      .offset(offset)

    return {
      data: results.map((user) => this.mapToUser(user)),
      total: totalResult?.count || 0,
      page: options.page,
      limit: options.limit,
    }
  }

  // Token operations
  async saveRefreshToken(data: {
    userId: string
    deviceId: string
    token: string
    expiresAt: Date
  }): Promise<RefreshTokenData> {
    const [token] = await this.db
      .insert(refreshTokens)
      .values({
        userId: data.userId,
        deviceId: data.deviceId,
        token: data.token,
        expiresAt: data.expiresAt,
      })
      .returning()

    return this.mapToRefreshToken(token)
  }

  async findRefreshToken(token: string): Promise<RefreshTokenData | null> {
    const [result] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token))
      .limit(1)

    return result ? this.mapToRefreshToken(result) : null
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.token, token))
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
  }

  async revokeDeviceTokens(userId: string, deviceId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.deviceId, deviceId),
          isNull(refreshTokens.revokedAt),
        ),
      )
  }

  async cleanExpiredTokens(): Promise<void> {
    await this.db
      .delete(refreshTokens)
      .where(lte(refreshTokens.expiresAt, new Date()))
  }

  // Device operations
  async createOrUpdateDevice(data: {
    userId: string
    deviceName?: string
    userAgent?: string
    ipAddress?: string
  }): Promise<DeviceInfo> {
    const deviceId = crypto.randomUUID()
    const deviceType = this.detectDeviceType(data.userAgent)

    const [device] = await this.db
      .insert(devices)
      .values({
        id: deviceId,
        userId: data.userId,
        name: data.deviceName || `${deviceType} Device`,
        deviceType,
        userAgent: data.userAgent || null,
        ipAddress: data.ipAddress || null,
        lastActive: new Date(),
        trusted: false,
      })
      .onConflictDoUpdate({
        target: [devices.userId, devices.userAgent],
        set: {
          lastActive: new Date(),
          ipAddress: data.ipAddress || null,
        },
      })
      .returning()

    return this.mapToDevice(device)
  }

  async findDevice(id: string): Promise<DeviceInfo | null> {
    const [device] = await this.db
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1)

    return device ? this.mapToDevice(device) : null
  }

  async listUserDevices(
    userId: string,
    options: { page: number; limit: number },
  ): Promise<{ data: DeviceInfo[]; total: number; page: number; limit: number }> {
    const offset = (options.page - 1) * options.limit

    const [totalResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(devices)
      .where(eq(devices.userId, userId))

    const results = await this.db
      .select()
      .from(devices)
      .where(eq(devices.userId, userId))
      .orderBy(desc(devices.lastActive))
      .limit(options.limit)
      .offset(offset)

    return {
      data: results.map((device) => this.mapToDevice(device)),
      total: totalResult?.count || 0,
      page: options.page,
      limit: options.limit,
    }
  }

  async updateDevice(
    id: string,
    data: { name?: string; isTrusted?: boolean },
  ): Promise<DeviceInfo> {
    const [device] = await this.db
      .update(devices)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.isTrusted !== undefined && { trusted: data.isTrusted }),
        updatedAt: new Date(),
      })
      .where(eq(devices.id, id))
      .returning()

    return this.mapToDevice(device)
  }

  async deleteDevice(id: string, userId: string): Promise<void> {
    await this.db
      .delete(devices)
      .where(and(eq(devices.id, id), eq(devices.userId, userId)))
  }

  // Security operations
  async logSecurityEvent(event: Omit<SecurityEvent, "id" | "createdAt">): Promise<void> {
    await this.db.insert(securityEvents).values({
      userId: event.userId,
      deviceId: event.deviceId || null,
      eventType: event.eventType,
      severity: event.severity,
      description: event.description,
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
      metadata: event.metadata || null,
    })
  }

  async listSecurityEvents(options: {
    page: number
    limit: number
    userId?: string
    deviceId?: string
    eventType?: string
    severity?: string
    startDate?: string
    endDate?: string
  }): Promise<{ data: SecurityEvent[]; total: number; page: number; limit: number }> {
    const conditions = []

    if (options.userId) {
      conditions.push(eq(securityEvents.userId, options.userId))
    }

    if (options.deviceId) {
      conditions.push(eq(securityEvents.deviceId, options.deviceId))
    }

    if (options.eventType) {
      conditions.push(eq(securityEvents.eventType, options.eventType))
    }

    if (options.severity) {
      conditions.push(eq(securityEvents.severity, options.severity as any))
    }

    if (options.startDate) {
      conditions.push(gte(securityEvents.createdAt, new Date(options.startDate)))
    }

    if (options.endDate) {
      conditions.push(lte(securityEvents.createdAt, new Date(options.endDate)))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined
    const offset = (options.page - 1) * options.limit

    const [totalResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(securityEvents)
      .where(whereClause)

    const results = await this.db
      .select()
      .from(securityEvents)
      .where(whereClause)
      .orderBy(desc(securityEvents.createdAt))
      .limit(options.limit)
      .offset(offset)

    return {
      data: results.map((event) => this.mapToSecurityEvent(event)),
      total: totalResult?.count || 0,
      page: options.page,
      limit: options.limit,
    }
  }

  async recordAuthAttempt(data: {
    userId?: string
    email: string
    success: boolean
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    await this.db.insert(authAttempts).values({
      userId: data.userId || null,
      email: data.email,
      success: data.success,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      attemptType: "password",
    })
  }

  async getRecentAuthAttempts(email: string, minutes = 15): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000)

    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.email, email),
          eq(authAttempts.success, false),
          gte(authAttempts.attemptedAt, since),
        ),
      )

    return result?.count || 0
  }

  // Password reset
  async savePasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    })
  }

  async findPasswordResetToken(
    token: string,
  ): Promise<{ userId: string; expiresAt: Date } | null> {
    const [result] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1)

    return result
      ? { userId: result.userId, expiresAt: result.expiresAt }
      : null
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await this.db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
  }

  // Email verification
  async saveEmailVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    // Using password reset tokens table for email verification
    // In production, you might want a separate table
    await this.db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    })
  }

  async findEmailVerificationToken(
    token: string,
  ): Promise<{ userId: string; expiresAt: Date } | null> {
    return this.findPasswordResetToken(token)
  }

  async deleteEmailVerificationToken(token: string): Promise<void> {
    return this.deletePasswordResetToken(token)
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
  }

  // Helper methods
  private mapToUser(data: any, includePassword = false): User {
    return User.create({
      id: data.id,
      email: data.email,
      username: data.username,
      passwordHash: includePassword ? data.passwordHash : undefined,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      isActive: data.isActive,
      emailVerified: data.emailVerified,
      mfaEnabled: data.mfaEnabled,
      mfaSecret: data.mfaSecret,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  }

  private mapToRefreshToken(data: any): RefreshTokenData {
    return {
      id: data.id,
      userId: data.userId,
      deviceId: data.deviceId,
      token: data.token,
      expiresAt: data.expiresAt,
      revokedAt: data.revokedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  }

  private mapToDevice(data: any): DeviceInfo {
    return {
      id: data.id,
      userId: data.userId,
      name: data.name,
      deviceType: data.deviceType,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      lastActive: data.lastActive,
      isTrusted: data.trusted,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  }

  private mapToSecurityEvent(data: any): SecurityEvent {
    return {
      id: data.id,
      userId: data.userId,
      deviceId: data.deviceId,
      eventType: data.eventType,
      severity: data.severity,
      description: data.description,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: data.metadata,
      createdAt: data.createdAt,
    }
  }

  private detectDeviceType(userAgent?: string): string {
    if (!userAgent) return "Unknown"

    const ua = userAgent.toLowerCase()
    if (ua.includes("mobile")) return "Mobile"
    if (ua.includes("tablet")) return "Tablet"
    if (ua.includes("desktop")) return "Desktop"

    return "Web"
  }
}