import { AuthErrorCodes, AuthError } from "../constants/error.codes"

export class ValidationService {
  validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new AuthError(
        AuthErrorCodes.INVALID_EMAIL_FORMAT,
        "Invalid email format",
      )
    }
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  validateUsername(username: string): void {
    if (username.length < 3) {
      throw new AuthError(
        AuthErrorCodes.VALIDATION_ERROR,
        "Username must be at least 3 characters long",
      )
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new AuthError(
        AuthErrorCodes.VALIDATION_ERROR,
        "Username can only contain letters, numbers, underscores, and hyphens",
      )
    }
  }

  sanitizeInput(input: string): string {
    return input.trim().toLowerCase()
  }

  sanitizeEmail(email: string): string {
    return this.sanitizeInput(email)
  }
}