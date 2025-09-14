import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { LoginUseCase } from "./login.usecase"
import { AuthError } from "../constants/error.codes"
import { AuthConstants } from "../constants/auth.constants"

describe("LoginUseCase", () => {
  let loginUseCase: LoginUseCase
  let mockRepository: any

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findUserByEmail: jest.fn(),
      findUserWithPassword: jest.fn(),
      getRecentAuthAttempts: jest.fn(),
      recordAuthAttempt: jest.fn(),
      createOrUpdateDevice: jest.fn(),
      saveRefreshToken: jest.fn(),
      logSecurityEvent: jest.fn(),
    }

    loginUseCase = new LoginUseCase(mockRepository)
    jest.clearAllMocks()
  })

  describe("execute", () => {
    const validRequest = {
      email: "user@example.com",
      password: "ValidPassword123!",
      deviceName: "Test Device",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0",
    }

    const mockUser = {
      id: "user-123",
      email: "user@example.com",
      username: "johndoe",
      passwordHash: "$2b$12$hashedpassword",
      role: "user",
      isActive: true,
      emailVerified: true,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      canLogin: () => true,
      toPublicJSON: () => ({
        id: "user-123",
        email: "user@example.com",
        username: "johndoe",
        role: "user",
        isActive: true,
        emailVerified: true,
      }),
    }

    const mockDevice = {
      id: "device-123",
      userId: "user-123",
      name: "Test Device",
      deviceType: "Web",
      userAgent: "Mozilla/5.0",
      ipAddress: "127.0.0.1",
      lastActive: new Date(),
      isTrusted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it("should throw error when too many failed attempts", async () => {
      mockRepository.getRecentAuthAttempts.mockResolvedValue(
        AuthConstants.MAX_LOGIN_ATTEMPTS
      )

      await expect(loginUseCase.execute(validRequest)).rejects.toThrow(AuthError)
      await expect(loginUseCase.execute(validRequest)).rejects.toThrow(
        `Too many failed attempts. Please try again in ${AuthConstants.LOCKOUT_DURATION_MINUTES} minutes`
      )

      expect(mockRepository.recordAuthAttempt).toHaveBeenCalledWith({
        email: "user@example.com",
        success: false,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
      })
    })

    it("should throw error when user not found", async () => {
      mockRepository.getRecentAuthAttempts.mockResolvedValue(0)
      mockRepository.findUserWithPassword.mockResolvedValue(null)

      await expect(loginUseCase.execute(validRequest)).rejects.toThrow(AuthError)
      await expect(loginUseCase.execute(validRequest)).rejects.toThrow(
        "Invalid email or password"
      )
    })

    it("should throw error when account is inactive", async () => {
      const inactiveUser = {
        ...mockUser,
        isActive: false,
        canLogin: () => false,
      }

      mockRepository.getRecentAuthAttempts.mockResolvedValue(0)
      mockRepository.findUserWithPassword.mockResolvedValue(inactiveUser)

      // Create a real password hash for testing
      const passwordService = (loginUseCase as any).passwordService
      const realHash = await passwordService.hash(validRequest.password)
      inactiveUser.passwordHash = realHash

      await expect(loginUseCase.execute(validRequest)).rejects.toThrow(AuthError)
      await expect(loginUseCase.execute(validRequest)).rejects.toThrow(
        "Account is inactive"
      )

      expect(mockRepository.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          eventType: "ACCOUNT_INACTIVE_LOGIN",
        })
      )
    })

    it("should throw error for invalid email format", async () => {
      const invalidRequest = {
        ...validRequest,
        email: "invalid-email",
      }

      await expect(loginUseCase.execute(invalidRequest)).rejects.toThrow(AuthError)
      await expect(loginUseCase.execute(invalidRequest)).rejects.toThrow(
        "Invalid email format"
      )
    })

    it("should throw error for invalid password", async () => {
      mockRepository.getRecentAuthAttempts.mockResolvedValue(0)
      mockRepository.findUserWithPassword.mockResolvedValue(mockUser)

      // Use a different password hash that won't match
      mockUser.passwordHash = "$2b$12$differenthash"

      await expect(loginUseCase.execute(validRequest)).rejects.toThrow(AuthError)
      await expect(loginUseCase.execute(validRequest)).rejects.toThrow(
        "Invalid email or password"
      )

      expect(mockRepository.recordAuthAttempt).toHaveBeenCalledWith({
        userId: "user-123",
        email: "user@example.com",
        success: false,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
      })
    })

    it("should successfully login with valid credentials", async () => {
      mockRepository.getRecentAuthAttempts.mockResolvedValue(0)
      mockRepository.findUserWithPassword.mockResolvedValue(mockUser)
      mockRepository.createOrUpdateDevice.mockResolvedValue(mockDevice)
      mockRepository.saveRefreshToken.mockResolvedValue(undefined)
      mockRepository.recordAuthAttempt.mockResolvedValue(undefined)
      mockRepository.logSecurityEvent.mockResolvedValue(undefined)

      // Create a real password hash for the mock user
      const passwordService = (loginUseCase as any).passwordService
      const realHash = await passwordService.hash(validRequest.password)
      mockUser.passwordHash = realHash

      const result = await loginUseCase.execute(validRequest)

      expect(result).toHaveProperty("accessToken")
      expect(result).toHaveProperty("refreshToken")
      expect(result).toHaveProperty("expiresIn")
      expect(result).toHaveProperty("tokenType")
      expect(result).toHaveProperty("user")
      expect(result.user.email).toBe("user@example.com")
      expect(typeof result.accessToken).toBe("string")
      expect(typeof result.refreshToken).toBe("string")

      expect(mockRepository.recordAuthAttempt).toHaveBeenCalledWith({
        userId: "user-123",
        email: "user@example.com",
        success: true,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
      })
    })
  })
})