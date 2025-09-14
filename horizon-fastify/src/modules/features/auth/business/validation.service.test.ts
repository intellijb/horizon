import { describe, it, expect, beforeEach } from '@jest/globals'
import { ValidationService } from './validation.service'
import { AuthError, AuthErrorCodes } from '../constants/error.codes'

describe('ValidationService', () => {
  let validationService: ValidationService

  beforeEach(() => {
    validationService = new ValidationService()
  })

  describe('validateEmail', () => {
    it('should not throw for valid email', () => {
      expect(() => {
        validationService.validateEmail('user@example.com')
      }).not.toThrow()

      expect(() => {
        validationService.validateEmail('user.name+tag@example.co.uk')
      }).not.toThrow()
    })

    it('should throw AuthError for invalid email', () => {
      expect(() => {
        validationService.validateEmail('invalid-email')
      }).toThrow(AuthError)

      expect(() => {
        validationService.validateEmail('invalid-email')
      }).toThrow('Invalid email format')

      expect(() => {
        validationService.validateEmail('user@')
      }).toThrow(AuthError)

      expect(() => {
        validationService.validateEmail('@example.com')
      }).toThrow(AuthError)
    })
  })

  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(validationService.isValidEmail('user@example.com')).toBe(true)
      expect(validationService.isValidEmail('user.name@example.co.uk')).toBe(true)
    })

    it('should return false for invalid email', () => {
      expect(validationService.isValidEmail('invalid-email')).toBe(false)
      expect(validationService.isValidEmail('user@')).toBe(false)
      expect(validationService.isValidEmail('@example.com')).toBe(false)
    })
  })

  describe('validateUsername', () => {
    it('should not throw for valid username', () => {
      expect(() => {
        validationService.validateUsername('john_doe')
      }).not.toThrow()

      expect(() => {
        validationService.validateUsername('user-123')
      }).not.toThrow()

      expect(() => {
        validationService.validateUsername('JohnDoe2024')
      }).not.toThrow()
    })

    it('should throw for username shorter than 3 characters', () => {
      expect(() => {
        validationService.validateUsername('ab')
      }).toThrow(AuthError)

      expect(() => {
        validationService.validateUsername('ab')
      }).toThrow('Username must be at least 3 characters long')
    })

    it('should throw for username with invalid characters', () => {
      expect(() => {
        validationService.validateUsername('user@name')
      }).toThrow(AuthError)

      expect(() => {
        validationService.validateUsername('user name')
      }).toThrow('Username can only contain letters, numbers, underscores, and hyphens')
    })
  })

  describe('sanitizeInput', () => {
    it('should trim and lowercase input', () => {
      expect(validationService.sanitizeInput('  HELLO  ')).toBe('hello')
      expect(validationService.sanitizeInput('MiXeD cAsE')).toBe('mixed case')
    })
  })

  describe('sanitizeEmail', () => {
    it('should trim and lowercase email', () => {
      expect(validationService.sanitizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com')
      expect(validationService.sanitizeEmail('John.Doe@Example.Com')).toBe('john.doe@example.com')
    })
  })
})