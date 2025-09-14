import { AuthRepositoryPort } from "../domain/ports/auth-repository.port"
import { User } from "../domain/entities/user.entity"
import { TokenService } from "../business/token.service"
import { PasswordService } from "../business/password.service"
import { ValidationService } from "../business/validation.service"
import { AuthConstants, SecurityEventTypes, SecurityEventSeverity } from "../constants/auth.constants"
import { AuthErrorCodes, AuthError } from "../constants/error.codes"
import { Device } from "../domain/value-objects/device.value"

export interface LoginRequest {
  email: string
  password: string
  deviceName?: string
  ipAddress?: string
  userAgent?: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
  user: Record<string, any>
}

export class LoginUseCase {
  private tokenService: TokenService
  private passwordService: PasswordService
  private validationService: ValidationService

  constructor(private repository: AuthRepositoryPort) {
    this.tokenService = new TokenService()
    this.passwordService = new PasswordService()
    this.validationService = new ValidationService()
  }

  async execute(request: LoginRequest): Promise<LoginResponse> {
    // Validate email
    this.validationService.validateEmail(request.email)
    const email = this.validationService.sanitizeEmail(request.email)

    // Check recent failed attempts
    const recentAttempts = await this.repository.getRecentAuthAttempts(
      email,
      AuthConstants.LOCKOUT_DURATION_MINUTES,
    )

    if (recentAttempts >= AuthConstants.MAX_LOGIN_ATTEMPTS) {
      await this.logFailedAttempt(email, request)
      throw new AuthError(
        AuthErrorCodes.ACCOUNT_LOCKED,
        `Too many failed attempts. Please try again in ${AuthConstants.LOCKOUT_DURATION_MINUTES} minutes`,
        429,
      )
    }

    // Find user with password
    const user = await this.repository.findUserWithPassword(email)
    if (!user || !user.passwordHash) {
      await this.logFailedAttempt(email, request)
      throw new AuthError(
        AuthErrorCodes.INVALID_CREDENTIALS,
        "Invalid email or password",
        401,
      )
    }

    // Verify password
    try {
      await this.passwordService.verifyOrThrow(request.password, user.passwordHash)
    } catch {
      await this.logFailedAttempt(email, request)
      throw new AuthError(
        AuthErrorCodes.INVALID_CREDENTIALS,
        "Invalid email or password",
        401,
      )
    }

    // Check if account is active
    if (!user.canLogin()) {
      await this.logSecurityEvent(
        user.id,
        SecurityEventTypes.ACCOUNT_INACTIVE_LOGIN,
        request,
      )
      throw new AuthError(
        AuthErrorCodes.ACCOUNT_INACTIVE,
        "Account is inactive",
        401,
      )
    }

    // Create or update device
    const deviceType = Device.detectType(request.userAgent)
    const device = await this.repository.createOrUpdateDevice({
      userId: user.id,
      deviceName: request.deviceName || `${deviceType} Device`,
      userAgent: request.userAgent,
      ipAddress: request.ipAddress,
    })

    // Generate tokens
    const tokens = this.tokenService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: "user", // Default role since schema doesn't store roles
      deviceId: device.id,
      sessionId: this.tokenService.generateSessionId(),
    })

    // Save refresh token
    await this.repository.saveRefreshToken({
      userId: user.id,
      deviceId: device.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + AuthConstants.REFRESH_TOKEN_EXPIRES_IN * 1000),
    })

    // Log successful login
    await this.repository.recordAuthAttempt({
      userId: user.id,
      email: email,
      success: true,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    })

    await this.repository.logSecurityEvent({
      userId: user.id,
      deviceId: device.id,
      eventType: SecurityEventTypes.LOGIN_SUCCESS,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    })

    return {
      ...tokens,
      user: user.toPublicJSON(),
    }
  }

  private async logFailedAttempt(email: string, request: LoginRequest): Promise<void> {
    await this.repository.recordAuthAttempt({
      email,
      success: false,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    })
  }

  private async logSecurityEvent(
    userId: string,
    eventType: string,
    request: LoginRequest,
  ): Promise<void> {
    await this.repository.logSecurityEvent({
      userId,
      eventType,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    })
  }
}