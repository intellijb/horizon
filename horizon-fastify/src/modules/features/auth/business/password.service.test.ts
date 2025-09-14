import { describe, it, expect, beforeEach } from "@jest/globals"
import { PasswordService } from "./password.service"
import { AuthError } from "../constants/error.codes"

describe("PasswordService", () => {
  let passwordService: PasswordService

  beforeEach(() => {
    passwordService = new PasswordService()
  })

  describe("hash", () => {
    it("should hash a password", async () => {
      const password = "MySecurePassword123!"

      const result = await passwordService.hash(password)

      expect(typeof result).toBe("string")
      expect(result).not.toBe(password)
      expect(result.length).toBeGreaterThan(0)
      // bcrypt hashes start with $2b$
      expect(result).toMatch(/^\$2[aby]\$/)
    })

    it("should generate different hashes for the same password", async () => {
      const password = "TestPassword123"

      const hash1 = await passwordService.hash(password)
      const hash2 = await passwordService.hash(password)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe("verify", () => {
    it("should return true for correct password", async () => {
      const password = "CorrectPassword123"
      const hash = await passwordService.hash(password)

      const result = await passwordService.verify(password, hash)

      expect(result).toBe(true)
    })

    it("should return false for incorrect password", async () => {
      const password = "CorrectPassword123"
      const wrongPassword = "WrongPassword123"
      const hash = await passwordService.hash(password)

      const result = await passwordService.verify(wrongPassword, hash)

      expect(result).toBe(false)
    })
  })

  describe("verifyOrThrow", () => {
    it("should not throw for correct password", async () => {
      const password = "CorrectPassword123"
      const hash = await passwordService.hash(password)

      await expect(
        passwordService.verifyOrThrow(password, hash)
      ).resolves.toBeUndefined()
    })

    it("should throw AuthError for incorrect password", async () => {
      const password = "CorrectPassword123"
      const wrongPassword = "WrongPassword123"
      const hash = await passwordService.hash(password)

      await expect(
        passwordService.verifyOrThrow(wrongPassword, hash)
      ).rejects.toThrow(AuthError)

      await expect(
        passwordService.verifyOrThrow(wrongPassword, hash)
      ).rejects.toThrow("Invalid email or password")
    })
  })

  describe("validateStrength", () => {
    it("should throw for password shorter than 8 characters", () => {
      expect(() => {
        passwordService.validateStrength("short")
      }).toThrow(AuthError)

      expect(() => {
        passwordService.validateStrength("short")
      }).toThrow("Password must be at least 8 characters long")
    })

    it("should not throw for valid password", () => {
      expect(() => {
        passwordService.validateStrength("ValidPassword123!")
      }).not.toThrow()

      expect(() => {
        passwordService.validateStrength("12345678")
      }).not.toThrow()
    })

    it("should throw for empty password", () => {
      expect(() => {
        passwordService.validateStrength("")
      }).toThrow(AuthError)
    })
  })

  describe("isStrongPassword", () => {
    it("should return true for password with 8 or more characters", () => {
      expect(passwordService.isStrongPassword("ValidPassword123!")).toBe(true)
      expect(passwordService.isStrongPassword("Str0ng@Pass")).toBe(true)
      expect(passwordService.isStrongPassword("12345678")).toBe(true)
      expect(passwordService.isStrongPassword("password")).toBe(true)
      expect(passwordService.isStrongPassword("PASSWORD")).toBe(true)
    })

    it("should return false for password shorter than 8 characters", () => {
      expect(passwordService.isStrongPassword("weak")).toBe(false)
      expect(passwordService.isStrongPassword("1234567")).toBe(false)
      expect(passwordService.isStrongPassword("")).toBe(false)
      expect(passwordService.isStrongPassword("abc")).toBe(false)
    })
  })
})