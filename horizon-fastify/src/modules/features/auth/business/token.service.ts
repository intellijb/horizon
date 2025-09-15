import jwt from "jsonwebtoken"
import crypto from "crypto"
import { AuthConstants } from "../constants/auth.constants"
import { AuthErrorCodes, AuthError } from "../constants/error.codes"
import { TokenPair, TokenPayload } from "../domain/value-objects/token.value"

export class TokenService {
  private readonly jwtSecret: string
  private readonly jwtRefreshSecret: string

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "your-secret-key"
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || "your-refresh-secret"
  }

  generateTokenPair(payload: TokenPayload): TokenPair {
    const accessToken = this.generateAccessToken(payload)
    const refreshToken = this.generateRefreshToken(payload)

    return {
      accessToken,
      refreshToken,
      expiresIn: AuthConstants.ACCESS_TOKEN_EXPIRES_IN,
      tokenType: AuthConstants.TOKEN_TYPE,
    }
  }

  generateAccessToken(payload: TokenPayload): string {
    const jti = crypto.randomUUID()
    return jwt.sign({ ...payload, jti }, this.jwtSecret, {
      expiresIn: AuthConstants.ACCESS_TOKEN_EXPIRES_IN,
    })
  }

  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(
      { ...payload, type: AuthConstants.REFRESH_TOKEN_TYPE },
      this.jwtRefreshSecret,
      {
        expiresIn: AuthConstants.REFRESH_TOKEN_EXPIRES_IN,
      },
    )
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as any
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        deviceId: payload.deviceId,
        sessionId: payload.sessionId,
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError(AuthErrorCodes.TOKEN_EXPIRED, "Access token has expired", 401)
      }
      throw new AuthError(AuthErrorCodes.TOKEN_INVALID, "Invalid access token", 401)
    }
  }

  verifyRefreshToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.jwtRefreshSecret) as any
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        deviceId: payload.deviceId,
        sessionId: payload.sessionId,
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError(AuthErrorCodes.TOKEN_EXPIRED, "Refresh token has expired", 401)
      }
      throw new AuthError(AuthErrorCodes.TOKEN_INVALID, "Invalid refresh token", 401)
    }
  }

  generateRandomToken(bytes: number = AuthConstants.TOKEN_BYTES): string {
    return crypto.randomBytes(bytes).toString("hex")
  }

  generateSessionId(): string {
    return crypto.randomUUID()
  }

  decodeToken(token: string): any {
    return jwt.decode(token)
  }
}