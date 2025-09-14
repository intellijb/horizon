import { LoginUseCase } from "./login.usecase"
import { RegisterUseCase } from "./register.usecase"
import { RefreshTokenUseCase } from "./refresh-token.usecase"
import { AuthRepositoryDrizzle } from "../extensions/auth.repository.drizzle"
import { AuthErrorCodes, AuthError } from "../constants/error.codes"
import { TokenService } from "../business/token.service"
import { PasswordService } from "../business/password.service"
import {
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  VerifyEmailRequest,
} from "./auth.types"

export class AuthController {
  private loginUseCase: LoginUseCase
  private registerUseCase: RegisterUseCase
  private refreshTokenUseCase: RefreshTokenUseCase
  private tokenService: TokenService
  private passwordService: PasswordService
  private repository: AuthRepositoryDrizzle

  constructor(db: any) {
    this.repository = new AuthRepositoryDrizzle(db)
    this.loginUseCase = new LoginUseCase(this.repository)
    this.registerUseCase = new RegisterUseCase(this.repository)
    this.refreshTokenUseCase = new RefreshTokenUseCase(this.repository)
    this.tokenService = new TokenService()
    this.passwordService = new PasswordService()
  }

  async register(data: RegisterRequest["Body"], ipAddress: string, userAgent?: string) {
    const response = await this.registerUseCase.execute({
      ...data,
      ipAddress,
      userAgent,
    })
    return { data: response, statusCode: 201 }
  }

  async login(data: LoginRequest["Body"], ipAddress: string, userAgent?: string) {
    const response = await this.loginUseCase.execute({
      ...data,
      ipAddress,
      userAgent,
    })
    return { data: response, statusCode: 200 }
  }

  async refreshToken(data: RefreshTokenRequest["Body"], ipAddress: string, userAgent?: string) {
    const response = await this.refreshTokenUseCase.execute({
      refreshToken: data.refreshToken,
      ipAddress,
      userAgent,
    })
    return { data: response, statusCode: 200 }
  }

  async logout(token: string) {
    const payload = this.tokenService.verifyAccessToken(token)
    if (payload.deviceId) {
      await this.repository.revokeDeviceTokens(payload.userId, payload.deviceId)
    }
    return { statusCode: 204 }
  }

  async forgotPassword(data: ForgotPasswordRequest["Body"]) {
    const user = await this.repository.findUserByEmail(data.email)

    if (user) {
      const resetToken = this.tokenService.generateRandomToken()
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await this.repository.savePasswordResetToken(user.id, resetToken, expiresAt)

      // TODO: In production, send email here
      console.log("Password reset token generated:", resetToken)
    }

    // Always return success to prevent email enumeration
    return {
      data: { message: "If the email exists, a reset link has been sent" },
      statusCode: 200,
    }
  }

  async resetPassword(data: ResetPasswordRequest["Body"]) {
    const tokenData = await this.repository.findPasswordResetToken(data.token)

    if (!tokenData || new Date() > tokenData.expiresAt) {
      throw new AuthError(
        AuthErrorCodes.PASSWORD_RESET_TOKEN_EXPIRED,
        "Invalid or expired token",
        400
      )
    }

    const passwordHash = await this.passwordService.hash(data.password)
    await this.repository.updateUser(tokenData.userId, { passwordHash } as any)
    await this.repository.deletePasswordResetToken(data.token)

    return {
      data: { message: "Password has been reset successfully" },
      statusCode: 200,
    }
  }

  async changePassword(data: ChangePasswordRequest["Body"], token: string) {
    const payload = this.tokenService.verifyAccessToken(token)
    const user = await this.repository.findUserWithPassword(payload.email)

    if (!user || !user.passwordHash) {
      throw new AuthError(AuthErrorCodes.USER_NOT_FOUND, "User not found", 404)
    }

    await this.passwordService.verifyOrThrow(data.currentPassword, user.passwordHash)
    const newPasswordHash = await this.passwordService.hash(data.newPassword)
    await this.repository.updateUser(user.id, { passwordHash: newPasswordHash } as any)

    return {
      data: { message: "Password changed successfully" },
      statusCode: 200,
    }
  }

  async verifyEmail(data: VerifyEmailRequest["Body"]) {
    const tokenData = await this.repository.findEmailVerificationToken(data.token)

    if (!tokenData || new Date() > tokenData.expiresAt) {
      throw new AuthError(
        AuthErrorCodes.TOKEN_EXPIRED,
        "Invalid or expired token",
        400
      )
    }

    await this.repository.markEmailAsVerified(tokenData.userId)
    await this.repository.deleteEmailVerificationToken(data.token)

    return {
      data: { message: "Email verified successfully" },
      statusCode: 200,
    }
  }

  async getCurrentUser(token: string) {
    const payload = this.tokenService.verifyAccessToken(token)
    const user = await this.repository.findUserById(payload.userId)

    if (!user) {
      throw new AuthError(AuthErrorCodes.USER_NOT_FOUND, "User not found", 404)
    }

    return {
      data: user.toPublicJSON(),
      statusCode: 200,
    }
  }
}