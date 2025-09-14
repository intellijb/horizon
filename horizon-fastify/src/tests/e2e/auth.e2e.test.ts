import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../app'

describe('Auth E2E Tests', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /auth/login', () => {
    test('should validate email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'invalid-email',
          password: 'testpassword'
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('FST_ERR_VALIDATION')
      expect(body.message).toContain('Invalid email address')
    })

    test('should return 401 for invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'wrongpassword'
        }
      })

      // Could be 401 (invalid credentials) or 429 (rate limited)
      expect([401, 429]).toContain(response.statusCode)
      const body = JSON.parse(response.body)
      if (response.statusCode === 401) {
        expect(body.error).toBe('Invalid email or password')
      } else if (response.statusCode === 429) {
        expect(body.error).toContain('attempts')
      }
    })

    test('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com'
          // missing password
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('FST_ERR_VALIDATION')
    })
  })

  describe('POST /auth/register', () => {
    test('should validate password length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: 'short',
          username: 'testuser'
        }
      })

      expect(response.statusCode).toBe(400)
    })

    test('should validate email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'validpassword123',
          username: 'testuser'
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code || body.error).toBeTruthy()
    })
  })

  describe('POST /auth/refresh', () => {
    test('should validate required refreshToken', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {}
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('FST_ERR_VALIDATION')
      expect(body.message).toContain('refreshToken')
    })

    test('should return 401 for invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: 'invalid-token'
        }
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Invalid refresh token')
    })
  })

  describe('POST /auth/forgot-password', () => {
    test('should validate email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: {
          email: 'invalid-email'
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe('FST_ERR_VALIDATION')
    })

    test('should return success message for valid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: {
          email: 'test@example.com'
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.message).toContain('reset link has been sent')
    })
  })

  describe('GET /auth/me', () => {
    test('should return 401 without authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me'
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('POST /auth/logout', () => {
    test('should return 401 without authorization header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout'
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Unauthorized')
    })
  })
})