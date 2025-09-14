import jwt from "jsonwebtoken"
import crypto from "crypto"
import { AuthRepositoryPort } from "../domain/ports/auth-repository.port"
import { TokenPair, TokenPayload } from "../domain/value-objects/token.value"

export interface RefreshTokenRequest {
  refreshToken: string
  ipAddress?: string
  userAgent?: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export class RefreshTokenUseCase {
  private readonly JWT_SECRET: string
  private readonly JWT_REFRESH_SECRET: string
  private readonly ACCESS_TOKEN_EXPIRES_IN = 15 * 60 // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 // 7 days

  constructor(private repository: AuthRepositoryPort) {
    this.JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret"
  }

  async execute(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    // Verify refresh token
    let payload: any
    try {
      payload = jwt.verify(request.refreshToken, this.JWT_REFRESH_SECRET)
    } catch (error) {
      throw new Error("Invalid refresh token")
    }

    // Check if token exists in database
    const storedToken = await this.repository.findRefreshToken(request.refreshToken)
    if (!storedToken) {
      throw new Error("Refresh token not found")
    }

    // Check if token is revoked
    if (storedToken.revokedAt) {
      await this.repository.logSecurityEvent({
        userId: payload.userId,
        eventType: "REVOKED_TOKEN_USE",
        severity: "high",
        description: "Attempted to use a revoked refresh token",
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      })
      throw new Error("Refresh token has been revoked")
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      throw new Error("Refresh token has expired")
    }

    // Get user
    const user = await this.repository.findUserById(payload.userId)
    if (!user) {
      throw new Error("User not found")
    }

    if (!user.isActive) {
      throw new Error("Account is inactive")
    }

    // Revoke old refresh token
    await this.repository.revokeRefreshToken(request.refreshToken)

    // Generate new tokens
    const newPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      deviceId: payload.deviceId,
      sessionId: crypto.randomUUID(),
    }

    const accessToken = jwt.sign(newPayload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    })

    const refreshToken = jwt.sign(
      { ...newPayload, type: "refresh" },
      this.JWT_REFRESH_SECRET,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      },
    )

    // Save new refresh token
    await this.repository.saveRefreshToken({
      userId: user.id,
      deviceId: payload.deviceId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_IN * 1000),
    })

    // Update device last active
    if (payload.deviceId) {
      const device = await this.repository.findDevice(payload.deviceId)
      if (device) {
        await this.repository.createOrUpdateDevice({
          userId: user.id,
          userAgent: request.userAgent,
          ipAddress: request.ipAddress,
        })
      }
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      tokenType: "Bearer",
    }
  }
}