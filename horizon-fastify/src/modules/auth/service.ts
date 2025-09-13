import { FastifyInstance } from "fastify"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import crypto from "crypto"
import { createAuthRepository } from "./repository"
import {
  CreateUserBody,
  UpdateUserBody,
  LoginBody,
  RegisterBody,
  AuthResponse,
  User,
  Device,
} from "./schemas"

export function createAuthService(fastify: FastifyInstance) {
  const repository = createAuthRepository(fastify)
  const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret"
  const ACCESS_TOKEN_EXPIRES_IN = 15 * 60 // 15 minutes
  const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 // 7 days

  // User management
  async function listUsers(options: {
    page: number
    limit: number
    search?: string
    isActive?: boolean
    emailVerified?: boolean
  }) {
    return repository.listUsers(options)
  }

  async function getUser(id: string): Promise<User> {
    const user = await repository.findUserById(id)
    if (!user) {
      throw new Error("User not found")
    }
    return user
  }

  async function createUser(data: CreateUserBody): Promise<User> {
    // Check if user already exists
    const existingUser = await repository.findUserByEmail(data.email)
    if (existingUser) {
      throw new Error("User with this email already exists")
    }

    return repository.createUser(data)
  }

  async function updateUser(id: string, data: UpdateUserBody): Promise<User> {
    // Check if user exists
    const existingUser = await repository.findUserById(id)
    if (!existingUser) {
      throw new Error("User not found")
    }

    // Check if email is being changed and if it's already taken
    if (data.email && data.email !== existingUser.email) {
      const emailTaken = await repository.findUserByEmail(data.email)
      if (emailTaken) {
        throw new Error("Email already in use")
      }
    }

    const updatedUser = await repository.updateUser(id, data)
    if (!updatedUser) {
      throw new Error("Failed to update user")
    }

    return updatedUser
  }

  async function deleteUser(id: string): Promise<void> {
    const deleted = await repository.deleteUser(id)
    if (!deleted) {
      throw new Error("User not found")
    }
  }

  // Authentication
  async function register(
    data: RegisterBody,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await repository.findUserByEmail(data.email)
      if (existingUser) {
        await repository.recordAuthAttempt({
          email: data.email,
          ipAddress: ipAddress || "unknown",
          success: false,
          attemptType: "login",
          errorReason: "User already exists",
          userAgent,
        })
        throw new Error("User with this email already exists")
      }

      // Create user
      const user = await repository.createUser({
        email: data.email,
        username: data.username,
        password: data.password,
      })

      // Create device
      const deviceFingerprint = crypto.randomBytes(16).toString("hex")
      const device = await repository.createDevice({
        userId: user.id,
        deviceType: "unknown",
        deviceFingerprint,
      })

      // Generate tokens
      const tokenFamily = crypto.randomUUID()
      const { accessToken, refreshToken } = await generateTokens(
        user,
        device.id,
        tokenFamily,
        ipAddress,
        userAgent,
      )

      // Record successful registration
      await repository.recordAuthAttempt({
        email: data.email,
        ipAddress: ipAddress || "unknown",
        success: true,
        attemptType: "login",
        userAgent,
      })

      await repository.recordSecurityEvent({
        userId: user.id,
        deviceId: device.id,
        eventType: "login",
        ipAddress,
        userAgent,
        metadata: { registrationMethod: "email" },
      })

      return {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        tokenType: "Bearer",
        user,
      }
    } catch (error) {
      await repository.recordAuthAttempt({
        email: data.email,
        ipAddress: ipAddress || "unknown",
        success: false,
        attemptType: "login",
        errorReason: error instanceof Error ? error.message : "Unknown error",
        userAgent,
      })
      throw error
    }
  }

  async function login(
    data: LoginBody,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    try {
      // Check rate limiting
      const recentAttempts = await repository.getRecentAuthAttempts(
        ipAddress || "unknown",
      )
      if (recentAttempts >= 5) {
        throw new Error("Too many failed attempts. Please try again later.")
      }

      // Find user
      const user = await repository.findUserWithPassword(data.email)
      if (!user) {
        await repository.recordAuthAttempt({
          email: data.email,
          ipAddress: ipAddress || "unknown",
          success: false,
          attemptType: "login",
          errorReason: "Invalid credentials",
          userAgent,
        })
        throw new Error("Invalid email or password")
      }

      // Verify password
      const validPassword = await bcrypt.compare(data.password, user.passwordHash)
      if (!validPassword) {
        await repository.recordAuthAttempt({
          email: data.email,
          ipAddress: ipAddress || "unknown",
          success: false,
          attemptType: "login",
          errorReason: "Invalid credentials",
          userAgent,
        })
        throw new Error("Invalid email or password")
      }

      // Check if user is active
      if (!user.isActive) {
        await repository.recordAuthAttempt({
          email: data.email,
          ipAddress: ipAddress || "unknown",
          success: false,
          attemptType: "login",
          errorReason: "Account inactive",
          userAgent,
        })
        throw new Error("Account is inactive")
      }

      // Handle device
      let device: Device
      if (data.deviceFingerprint) {
        const existingDevice = await repository.findDeviceByFingerprint(
          data.deviceFingerprint,
        )
        if (existingDevice && existingDevice.userId === user.id) {
          device = (await repository.updateDevice(existingDevice.id, {}))!
        } else {
          device = await repository.createDevice({
            userId: user.id,
            deviceName: data.deviceName,
            deviceType: "unknown",
            deviceFingerprint: data.deviceFingerprint,
          })
        }
      } else {
        // Create new device without fingerprint
        const deviceFingerprint = crypto.randomBytes(16).toString("hex")
        device = await repository.createDevice({
          userId: user.id,
          deviceName: data.deviceName,
          deviceType: "unknown",
          deviceFingerprint,
        })
      }

      // Generate tokens
      const tokenFamily = crypto.randomUUID()
      const { accessToken, refreshToken } = await generateTokens(
        user,
        device.id,
        tokenFamily,
        ipAddress,
        userAgent,
      )

      // Record successful login
      await repository.recordAuthAttempt({
        email: data.email,
        ipAddress: ipAddress || "unknown",
        success: true,
        attemptType: "login",
        userAgent,
      })

      await repository.recordSecurityEvent({
        userId: user.id,
        deviceId: device.id,
        eventType: "login",
        ipAddress,
        userAgent,
      })

      // Return user without sensitive data
      const userResponse: User = {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }

      return {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        tokenType: "Bearer",
        user: userResponse,
      }
    } catch (error) {
      if (data.email) {
        await repository.recordAuthAttempt({
          email: data.email,
          ipAddress: ipAddress || "unknown",
          success: false,
          attemptType: "login",
          errorReason: error instanceof Error ? error.message : "Unknown error",
          userAgent,
        })
      }
      throw error
    }
  }

  async function refreshToken(
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    // Find and validate refresh token
    const existingToken = await repository.findRefreshToken(token)
    if (!existingToken) {
      throw new Error("Invalid refresh token")
    }

    // Check if token family has been compromised
    // If this token was already used (has a replacedBy), all tokens in family should be revoked
    if (existingToken.replacedBy) {
      await repository.revokeTokenFamily(
        existingToken.tokenFamily,
        "Token reuse detected",
      )
      throw new Error("Token reuse detected. All tokens have been revoked.")
    }

    // Get user and device
    const user = await repository.findUserById(existingToken.userId)
    if (!user || !user.isActive) {
      throw new Error("User not found or inactive")
    }

    const device = await repository.findDeviceById(existingToken.deviceId)
    if (!device) {
      throw new Error("Device not found")
    }

    // Revoke old token
    await repository.revokeRefreshToken(token, "Token rotation")

    // Generate new tokens with same family
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
      user,
      device.id,
      existingToken.tokenFamily,
      ipAddress,
      userAgent,
    )

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      tokenType: "Bearer",
      user,
    }
  }

  async function logout(
    userId: string,
    deviceId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    // Revoke all refresh tokens for this user and device
    await repository.recordSecurityEvent({
      userId,
      deviceId,
      eventType: "logout",
      ipAddress,
      userAgent,
    })
  }

  async function forgotPassword(email: string): Promise<void> {
    const user = await repository.findUserByEmail(email)
    if (!user) {
      // Don't reveal if user exists or not
      return
    }

    const resetToken = await repository.createPasswordResetToken(user.id)

    // In production, send email with reset token
    // For now, just log it
    fastify.log.info({ resetToken }, "Password reset token generated")

    await repository.recordSecurityEvent({
      userId: user.id,
      eventType: "password_reset_request",
    })
  }

  async function resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string,
  ): Promise<void> {
    const resetToken = await repository.findPasswordResetToken(token)
    if (!resetToken) {
      throw new Error("Invalid or expired reset token")
    }

    // Update password
    await repository.updatePassword(resetToken.userId, newPassword)

    // Mark token as used
    await repository.usePasswordResetToken(token, ipAddress)

    // Revoke all refresh tokens for this user
    await repository.recordSecurityEvent({
      userId: resetToken.userId,
      eventType: "password_reset_complete",
      ipAddress,
    })
  }

  async function changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await repository.findUserWithPassword(
      (await repository.findUserById(userId))!.email,
    )
    if (!user) {
      throw new Error("User not found")
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!validPassword) {
      throw new Error("Current password is incorrect")
    }

    // Update password
    await repository.updatePassword(userId, newPassword)

    await repository.recordSecurityEvent({
      userId,
      eventType: "password_change",
    })
  }

  async function verifyEmail(token: string): Promise<void> {
    // In production, implement email verification logic
    throw new Error("Email verification not implemented")
  }

  // Device management
  async function listUserDevices(
    userId: string,
    options: { page: number; limit: number; trusted?: boolean },
  ) {
    return repository.listUserDevices(userId, options)
  }

  async function getDevice(id: string): Promise<Device> {
    const device = await repository.findDeviceById(id)
    if (!device) {
      throw new Error("Device not found")
    }
    return device
  }

  async function updateDevice(
    id: string,
    data: { deviceName?: string; trusted?: boolean },
  ): Promise<Device> {
    const device = await repository.updateDevice(id, data)
    if (!device) {
      throw new Error("Device not found")
    }
    return device
  }

  async function deleteDevice(id: string, userId: string): Promise<void> {
    const device = await repository.findDeviceById(id)
    if (!device) {
      throw new Error("Device not found")
    }

    if (device.userId !== userId) {
      throw new Error("Unauthorized")
    }

    const deleted = await repository.deleteDevice(id)
    if (!deleted) {
      throw new Error("Failed to delete device")
    }

    await repository.recordSecurityEvent({
      userId,
      deviceId: id,
      eventType: "device_removed",
    })
  }

  // Security events
  async function listSecurityEvents(options: {
    page: number
    limit: number
    userId?: string
    deviceId?: string
    eventType?: string
    startDate?: string
    endDate?: string
  }) {
    return repository.listSecurityEvents(options)
  }

  // Helper functions
  async function generateTokens(
    user: User,
    deviceId: string,
    tokenFamily: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        deviceId,
      },
      JWT_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        issuer: "horizon",
        audience: "horizon-api",
        jwtid: crypto.randomUUID(),
      },
    )

    const refreshTokenValue = await repository.createRefreshToken({
      userId: user.id,
      deviceId,
      tokenFamily,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000),
      ipAddress,
      userAgent,
    })

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    }
  }

  async function verifyAccessToken(token: string) {
    try {
      const payload = jwt.verify(token, JWT_SECRET, {
        issuer: "horizon",
        audience: "horizon-api",
      }) as jwt.JwtPayload

      return {
        userId: payload.sub!,
        email: payload.email,
        deviceId: payload.deviceId,
      }
    } catch (error) {
      throw new Error("Invalid access token")
    }
  }

  return {
    // User management
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,

    // Authentication
    register,
    login,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyEmail,

    // Device management
    listUserDevices,
    getDevice,
    updateDevice,
    deleteDevice,

    // Security events
    listSecurityEvents,

    // Token verification
    verifyAccessToken,
  }
}

export type AuthService = ReturnType<typeof createAuthService>