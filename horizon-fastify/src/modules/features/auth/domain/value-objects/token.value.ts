export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export interface TokenPayload {
  userId: string
  email: string
  role: string
  deviceId?: string
  sessionId?: string
}

export interface RefreshTokenData {
  id: string
  userId: string
  deviceId: string
  token: string
  expiresAt: Date
  revokedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface SecurityEvent {
  id: string
  userId: string
  deviceId?: string
  eventType: string
  severity: "low" | "medium" | "high" | "critical"
  description: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  createdAt: Date
}

export type { DeviceInfo } from "./device.value"

export class Token {
  constructor(
    private value: string,
    private expiresAt: Date,
  ) {}

  isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  toString(): string {
    return this.value
  }

  getExpiresAt(): Date {
    return this.expiresAt
  }

  static fromExpiresIn(value: string, expiresInSeconds: number): Token {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
    return new Token(value, expiresAt)
  }
}