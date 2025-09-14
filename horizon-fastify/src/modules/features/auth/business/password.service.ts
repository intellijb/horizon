import bcrypt from "bcrypt"
import { AuthConstants } from "../constants/auth.constants"
import { AuthErrorCodes, AuthError } from "../constants/error.codes"

export class PasswordService {
  private readonly bcryptRounds: number

  constructor() {
    this.bcryptRounds = AuthConstants.BCRYPT_ROUNDS
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds)
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  async verifyOrThrow(password: string, hash: string): Promise<void> {
    const isValid = await this.verify(password, hash)
    if (!isValid) {
      throw new AuthError(
        AuthErrorCodes.INVALID_CREDENTIALS,
        "Invalid email or password",
        401,
      )
    }
  }

  validateStrength(password: string): void {
    if (password.length < 8) {
      throw new AuthError(
        AuthErrorCodes.WEAK_PASSWORD,
        "Password must be at least 8 characters long",
      )
    }

    // Add more validation rules as needed
    // e.g., require uppercase, lowercase, numbers, special characters
  }

  isStrongPassword(password: string): boolean {
    try {
      this.validateStrength(password)
      return true
    } catch {
      return false
    }
  }
}