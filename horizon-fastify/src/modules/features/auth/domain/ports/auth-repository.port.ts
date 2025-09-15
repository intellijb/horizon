import { User, UserCreateData, UserUpdateData } from "../entities/user.entity"
import { RefreshTokenData, DeviceInfo, SecurityEvent } from "../value-objects/token.value"

export interface AuthRepositoryPort {
  // User operations
  findUserById(id: string): Promise<User | null>
  findUserByEmail(email: string): Promise<User | null>
  findUserWithPassword(email: string): Promise<User | null>
  createUser(data: UserCreateData): Promise<User>
  updateUser(id: string, data: UserUpdateData): Promise<User>
  deleteUser(id: string): Promise<void>
  listUsers(options: {
    page: number
    limit: number
    search?: string
    role?: string
    isActive?: boolean
    emailVerified?: boolean
  }): Promise<{ data: User[]; total: number; page: number; limit: number }>

  // Token operations
  saveAccessToken(data: {
    userId: string
    deviceId: string
    jti: string
    expiresAt: Date
  }): Promise<void>
  saveRefreshToken(data: {
    userId: string
    deviceId: string
    token: string
    expiresAt: Date
  }): Promise<RefreshTokenData>
  findRefreshToken(token: string): Promise<RefreshTokenData | null>
  revokeRefreshToken(token: string): Promise<void>
  revokeAllUserTokens(userId: string): Promise<void>
  revokeDeviceTokens(userId: string, deviceId: string): Promise<void>
  cleanExpiredTokens(): Promise<void>

  // Device operations
  createOrUpdateDevice(data: {
    userId: string
    deviceName?: string
    userAgent?: string
    ipAddress?: string
  }): Promise<DeviceInfo>
  findDevice(id: string): Promise<DeviceInfo | null>
  listUserDevices(
    userId: string,
    options: { page: number; limit: number },
  ): Promise<{ data: DeviceInfo[]; total: number; page: number; limit: number }>
  updateDevice(id: string, data: { name?: string; isTrusted?: boolean }): Promise<DeviceInfo>
  deleteDevice(id: string, userId: string): Promise<void>

  // Security operations
  logSecurityEvent(event: Omit<SecurityEvent, "id" | "createdAt">): Promise<void>
  listSecurityEvents(options: {
    page: number
    limit: number
    userId?: string
    deviceId?: string
    eventType?: string
    severity?: string
    startDate?: string
    endDate?: string
  }): Promise<{ data: SecurityEvent[]; total: number; page: number; limit: number }>
  recordAuthAttempt(data: {
    userId?: string
    email: string
    success: boolean
    ipAddress?: string
    userAgent?: string
  }): Promise<void>
  getRecentAuthAttempts(email: string, minutes?: number): Promise<number>

  // Password reset
  savePasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>
  findPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date } | null>
  deletePasswordResetToken(token: string): Promise<void>

  // Email verification
  saveEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void>
  findEmailVerificationToken(token: string): Promise<{ userId: string; expiresAt: Date } | null>
  deleteEmailVerificationToken(token: string): Promise<void>
  markEmailAsVerified(userId: string): Promise<void>
}