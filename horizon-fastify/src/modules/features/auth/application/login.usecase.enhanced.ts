import { AuthRepositoryPort } from "../domain/ports/auth-repository.port"
import { User } from "../domain/entities/user.entity"
import { TokenService } from "../business/token.service"
import { PasswordService } from "../business/password.service"
import { ValidationService } from "../business/validation.service"
import { AuthConstants, SecurityEventTypes, SecurityEventSeverity } from "../constants/auth.constants"
import { AuthErrorCodes, AuthError } from "../constants/error.codes"
import { Device } from "../domain/value-objects/device.value"

// Import event system
import {
  IEventBus,
  UserLoggedInEvent,
  LoginFailedEvent,
  AccountLockedEvent,
  SuspiciousActivityDetectedEvent,
  DeviceAddedEvent
} from "@modules/platform/events"

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

export class LoginUseCaseWithEvents {
  private tokenService: TokenService
  private passwordService: PasswordService
  private validationService: ValidationService

  constructor(
    private repository: AuthRepositoryPort,
    private eventBus: IEventBus
  ) {
    this.tokenService = new TokenService()
    this.passwordService = new PasswordService()
    this.validationService = new ValidationService()
  }

  async execute(request: LoginRequest): Promise<LoginResponse> {
    // Generate correlation ID for tracking this login flow
    const correlationId = this.generateCorrelationId()

    // Validate email
    this.validationService.validateEmail(request.email)
    const email = this.validationService.sanitizeEmail(request.email)

    // Check recent failed attempts
    const recentAttempts = await this.repository.getRecentAuthAttempts(
      email,
      AuthConstants.LOCKOUT_DURATION_MINUTES,
    )

    if (recentAttempts >= AuthConstants.MAX_LOGIN_ATTEMPTS) {
      await this.handleAccountLocked(email, request, recentAttempts, correlationId)
      throw new AuthError(
        AuthErrorCodes.ACCOUNT_LOCKED,
        `Too many failed attempts. Please try again in ${AuthConstants.LOCKOUT_DURATION_MINUTES} minutes`,
        429,
      )
    }

    // Find user with password
    const user = await this.repository.findUserWithPassword(email)
    if (!user || !user.passwordHash) {
      await this.handleLoginFailed(email, request, "Invalid credentials", recentAttempts + 1, correlationId)
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
      await this.handleLoginFailed(email, request, "Invalid password", recentAttempts + 1, correlationId)
      throw new AuthError(
        AuthErrorCodes.INVALID_CREDENTIALS,
        "Invalid email or password",
        401,
      )
    }

    // Check if account is active
    if (!user.canLogin()) {
      await this.handleInactiveAccountLogin(user, request, correlationId)
      throw new AuthError(
        AuthErrorCodes.ACCOUNT_INACTIVE,
        "Account is inactive",
        401,
      )
    }

    // Check for suspicious activity
    await this.checkSuspiciousActivity(user, request, correlationId)

    // Create or update device
    const deviceType = Device.detectType(request.userAgent)
    const device = await this.repository.createOrUpdateDevice({
      userId: user.id,
      deviceName: request.deviceName || `${deviceType} Device`,
      userAgent: request.userAgent,
      ipAddress: request.ipAddress,
    })

    // Publish device added event if new device
    if (device.createdAt === device.updatedAt) {
      await this.eventBus.publish(new DeviceAddedEvent(
        user.id,
        device.id,
        device.deviceName,
        deviceType,
        false,
        { correlationId }
      ))
    }

    // Generate tokens
    const tokens = this.tokenService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: "user",
      deviceId: device.id,
      sessionId: this.tokenService.generateSessionId(),
    })

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
      expiresAt: new Date(Date.now() + AuthConstants.REFRESH_TOKEN_EXPIRES_IN * 1000),
    })

    // Record successful login
    await this.repository.recordAuthAttempt({
      userId: user.id,
      email: email,
      success: true,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    })

    // Publish login success event
    await this.eventBus.publish(new UserLoggedInEvent(
      user.id,
      user.email,
      device.id,
      device.deviceName,
      request.ipAddress,
      request.userAgent,
      'password',
      { correlationId }
    ))

    return {
      ...tokens,
      user: user.toPublicJSON(),
    }
  }

  private async handleLoginFailed(
    email: string,
    request: LoginRequest,
    reason: string,
    attemptNumber: number,
    correlationId: string
  ): Promise<void> {
    // Record failed attempt in repository
    await this.repository.recordAuthAttempt({
      email,
      success: false,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    })

    // Publish login failed event
    await this.eventBus.publish(new LoginFailedEvent(
      email,
      reason,
      request.ipAddress,
      request.userAgent,
      attemptNumber,
      { correlationId }
    ))
  }

  private async handleAccountLocked(
    email: string,
    request: LoginRequest,
    attemptCount: number,
    correlationId: string
  ): Promise<void> {
    // Record failed attempt
    await this.repository.recordAuthAttempt({
      email,
      success: false,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    })

    // Calculate lock expiry
    const lockedUntil = new Date(
      Date.now() + AuthConstants.LOCKOUT_DURATION_MINUTES * 60 * 1000
    )

    // Publish account locked event
    await this.eventBus.publish(new AccountLockedEvent(
      '',  // userId not available yet
      email,
      'Too many failed login attempts',
      lockedUntil,
      attemptCount,
      { correlationId }
    ))
  }

  private async handleInactiveAccountLogin(
    user: User,
    request: LoginRequest,
    correlationId: string
  ): Promise<void> {
    // Log security event
    await this.repository.logSecurityEvent({
      userId: user.id,
      eventType: SecurityEventTypes.ACCOUNT_INACTIVE_LOGIN,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    })

    // Publish suspicious activity event
    await this.eventBus.publish(new SuspiciousActivityDetectedEvent(
      user.id,
      'Inactive account login attempt',
      {
        email: user.email,
        accountStatus: user.status,
      },
      request.ipAddress,
      request.userAgent,
      { correlationId }
    ))
  }

  private async checkSuspiciousActivity(
    user: User,
    request: LoginRequest,
    correlationId: string
  ): Promise<void> {
    // Check for unusual login patterns
    const lastLogin = await this.repository.getLastSuccessfulLogin(user.id)

    if (lastLogin) {
      // Check for geographic anomaly (simplified check)
      if (lastLogin.ipAddress && request.ipAddress &&
          this.isSignificantLocationChange(lastLogin.ipAddress, request.ipAddress)) {
        await this.eventBus.publish(new SuspiciousActivityDetectedEvent(
          user.id,
          'Significant location change detected',
          {
            lastIp: lastLogin.ipAddress,
            currentIp: request.ipAddress,
            timeSinceLastLogin: Date.now() - lastLogin.timestamp.getTime(),
          },
          request.ipAddress,
          request.userAgent,
          { correlationId }
        ))
      }

      // Check for rapid device switching
      if (lastLogin.deviceId && lastLogin.timestamp.getTime() > Date.now() - 60000) {
        // Login from different device within 1 minute
        await this.eventBus.publish(new SuspiciousActivityDetectedEvent(
          user.id,
          'Rapid device switching detected',
          {
            lastDeviceId: lastLogin.deviceId,
            timeSinceLastLogin: Date.now() - lastLogin.timestamp.getTime(),
          },
          request.ipAddress,
          request.userAgent,
          { correlationId }
        ))
      }
    }
  }

  private isSignificantLocationChange(lastIp: string, currentIp: string): boolean {
    // Simplified check - in production would use GeoIP lookup
    // Check if IPs are from different class B networks
    const lastParts = lastIp.split('.')
    const currentParts = currentIp.split('.')

    return lastParts[0] !== currentParts[0] || lastParts[1] !== currentParts[1]
  }

  private generateCorrelationId(): string {
    return `auth-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}