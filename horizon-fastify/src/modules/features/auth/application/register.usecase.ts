import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { AuthRepositoryPort } from "../domain/ports/auth-repository.port"
import { User } from "../domain/entities/user.entity"
import { TokenPair, TokenPayload } from "../domain/value-objects/token.value"
import { SecurityEventTypes } from "../constants/auth.constants"
import { TokenService } from "../business/token.service"

export interface RegisterRequest {
  email: string
  password: string
  username?: string
  firstName?: string
  lastName?: string
  ipAddress?: string
  userAgent?: string
}

export interface RegisterResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
  user: Record<string, any>
}

export class RegisterUseCase {
  private readonly JWT_SECRET: string
  private readonly JWT_REFRESH_SECRET: string
  private readonly ACCESS_TOKEN_EXPIRES_IN = 15 * 60 // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 // 7 days
  private readonly BCRYPT_ROUNDS = 12
  private tokenService: TokenService

  constructor(private repository: AuthRepositoryPort) {
    this.JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret"
    this.tokenService = new TokenService()
  }

  async execute(request: RegisterRequest): Promise<RegisterResponse> {
    // Validate email format
    if (!this.isValidEmail(request.email)) {
      throw new Error("Invalid email format")
    }

    // Validate password strength
    if (!this.isStrongPassword(request.password)) {
      throw new Error("Password must be at least 8 characters long")
    }

    // Check if user already exists
    const existingUser = await this.repository.findUserByEmail(request.email)
    if (existingUser) {
      throw new Error("User with this email already exists")
    }

    // Hash password
    const passwordHash = await bcrypt.hash(request.password, this.BCRYPT_ROUNDS)

    // Create user
    const user = await this.repository.createUser({
      email: request.email,
      username: request.username,
      passwordHash: passwordHash,
    })

    // Create device
    const device = await this.repository.createOrUpdateDevice({
      userId: user.id,
      userAgent: request.userAgent,
      ipAddress: request.ipAddress,
    })

    // Generate tokens
    const tokens = await this.generateTokens(user, device.id)

    // Decode access token to get JTI and expiration
    const decodedAccessToken = this.tokenService.decodeToken(tokens.accessToken) as any

    // Save access token
    await this.repository.saveAccessToken({
      userId: user.id,
      deviceId: device.id,
      jti: decodedAccessToken.jti,
      expiresAt: new Date(decodedAccessToken.exp * 1000),
    })

    // Save refresh token
    await this.repository.saveRefreshToken({
      userId: user.id,
      deviceId: device.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_IN * 1000),
    })

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex")
    await this.repository.saveEmailVerificationToken(
      user.id,
      verificationToken,
      new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    )

    // Log security event
    await this.repository.logSecurityEvent({
      userId: user.id,
      deviceId: device.id,
      eventType: SecurityEventTypes.USER_REGISTERED,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      metadata: {
        email: request.email,
        username: request.username,
      },
    })

    // In production, send verification email here
    console.log("Verification token:", verificationToken)

    return {
      ...tokens,
      user: User.create(user).toPublicJSON(),
    }
  }

  private async generateTokens(user: User, deviceId: string): Promise<TokenPair> {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: "user", // Default role since schema doesn't store roles
      deviceId,
      sessionId: this.tokenService.generateSessionId(),
    }

    return this.tokenService.generateTokenPair(payload)
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private isStrongPassword(password: string): boolean {
    return password.length >= 8
  }
}