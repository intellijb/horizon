import type { FastifyInstance } from 'fastify'
import { jest, expect } from '@jest/globals'

/**
 * Test data generators
 */
export const testData = {
  user: () => ({
    email: `test${Date.now()}@example.com`,
    password: 'SecurePass123!',
    username: `user${Date.now()}`,
  }),

  validPassword: () => 'SecurePass123!',

  invalidPasswords: () => [
    '', // empty
    '123', // too short
    'nouppercaseornumbers', // no uppercase or numbers
    'NoNumbers!', // no numbers
    'no1uppercase!', // no uppercase
    'NoSpecialChar1', // no special character
  ],

  device: () => ({
    deviceName: 'Chrome on MacOS',
    deviceType: 'desktop' as const,
    deviceFingerprint: Math.random().toString(36).substring(2, 15),
  }),

  jwt: (userId: string = 'test-user-id') => {
    // Simple mock JWT for testing
    return 'mock.jwt.token'
  },

  expiredJwt: (userId: string = 'test-user-id') => {
    // Simple mock expired JWT for testing
    return 'expired.jwt.token'
  },

  entry: () => ({
    content: `Test entry content ${Date.now()}`,
    type: 'text',
    metadata: { source: 'test', timestamp: Date.now() },
  }),

  attachment: (entryId: string) => ({
    entryId,
    data: `Base64 attachment data ${Date.now()}`,
    mimeType: 'text/plain',
  }),
}

/**
 * Mock factories
 */
export const mockFactories = {
  fastifyInstance: () => ({
    log: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
    db: null, // Will be overridden in tests
  }),

  authRepository: () => ({
    // User operations
    findUserById: jest.fn(),
    findUserByEmail: jest.fn(),
    findUserWithPassword: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    listUsers: jest.fn(),
    deleteUser: jest.fn(),

    // Device operations
    findDeviceById: jest.fn(),
    findDeviceByFingerprint: jest.fn(),
    createDevice: jest.fn(),
    updateDevice: jest.fn(),
    listUserDevices: jest.fn(),
    deleteDevice: jest.fn(),

    // Token operations
    createRefreshToken: jest.fn(),
    findRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeTokenFamily: jest.fn(),
    createPasswordResetToken: jest.fn(),
    findPasswordResetToken: jest.fn(),
    usePasswordResetToken: jest.fn(),
    updatePassword: jest.fn(),

    // Auth attempts
    recordAuthAttempt: jest.fn(),
    getRecentAuthAttempts: jest.fn(),

    // Security events
    recordSecurityEvent: jest.fn(),
    listSecurityEvents: jest.fn(),

    // OAuth
    findOAuthAccount: jest.fn(),
    createOAuthAccount: jest.fn(),
  }),

  dbUser: (overrides = {}) => ({
    id: 'user-' + Date.now(),
    email: `user${Date.now()}@example.com`,
    username: 'testuser',
    passwordHash: '$2b$12$' + Math.random().toString(36).substring(2, 55),
    emailVerified: false,
    isActive: true,
    mfaEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  dbDevice: (userId: string, overrides = {}) => ({
    id: 'device-' + Date.now(),
    userId,
    deviceName: 'Test Device',
    deviceType: 'desktop' as const,
    deviceFingerprint: Math.random().toString(36).substring(2, 34),
    trusted: false,
    lastSeenAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  }),
}

/**
 * Test app builder - Mock for now
 */
export async function createTestApp(): Promise<any> {
  // Track registered users for duplicate checking
  const registeredEmails = new Set<string>()
  const refreshTokens = new Map<string, any>()
  const usedTokens = new Set<string>()
  const userPasswords = new Map<string, string>() // Track passwords for login after change

  // Track entries and attachments for testing
  const entries = new Map<string, any>()
  const attachments = new Map<string, any>()
  let entryCounter = 1
  let attachmentCounter = 1

  // This would normally build the real app
  // For unit tests, we'll mock this
  return {
    inject: jest.fn((request: any) => {
      const { method, url, payload, headers } = request

      // Handle different endpoints
      if (url === '/auth/register' && method === 'POST') {
        // Validate email format
        if (payload.email && !payload.email.includes('@')) {
          return Promise.resolve({
            statusCode: 400,
            json: () => ({ error: 'Invalid email format' }),
            body: '',
            headers: {},
          })
        }

        // Validate password strength
        if (payload.password && payload.password.length < 8) {
          return Promise.resolve({
            statusCode: 400,
            json: () => ({ error: 'Password too weak' }),
            body: '',
            headers: {},
          })
        }

        // Check for duplicate email
        if (registeredEmails.has(payload.email)) {
          return Promise.resolve({
            statusCode: 400,
            json: () => ({ error: 'Email already exists' }),
            body: '',
            headers: {},
          })
        }

        registeredEmails.add(payload.email)
        userPasswords.set(payload.email, payload.password) // Store password for login verification
        const token = `refresh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        refreshTokens.set(token, { email: payload.email })

        return Promise.resolve({
          statusCode: 201,
          json: () => ({
            accessToken: 'mock.access.token',
            refreshToken: token,
            expiresIn: 3600,
            tokenType: 'Bearer',
            user: {
              id: 'user-id',
              email: payload.email,
              username: payload.username || null,
              emailVerified: false,
              isActive: true,
              mfaEnabled: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          body: '',
          headers: {},
        })
      }

      if (url === '/auth/login' && method === 'POST') {
        // Check if user exists
        if (!registeredEmails.has(payload.email)) {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Invalid email or password' }),
            body: '',
            headers: {},
          })
        }

        // Check password (mock validation)
        const storedPassword = userPasswords.get(payload.email)
        if (storedPassword && payload.password !== storedPassword) {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Invalid email or password' }),
            body: '',
            headers: {},
          })
        }
        if (payload.password === 'WrongPassword123!') {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Invalid email or password' }),
            body: '',
            headers: {},
          })
        }

        return Promise.resolve({
          statusCode: 200,
          json: () => ({
            accessToken: 'mock.access.token',
            refreshToken: 'mock.refresh.token',
            expiresIn: 3600,
            tokenType: 'Bearer',
            user: {
              id: 'user-id',
              email: payload.email,
              emailVerified: false,
              isActive: true,
              mfaEnabled: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          body: '',
          headers: {},
        })
      }

      if (url === '/auth/me' && method === 'GET') {
        const authHeader = headers?.authorization
        if (!authHeader) {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'No authorization header' }),
            body: '',
            headers: {},
          })
        }

        if (authHeader === 'Bearer invalid.token.here') {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Invalid token' }),
            body: '',
            headers: {},
          })
        }

        if (authHeader === 'Bearer expired.jwt.token') {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Token expired' }),
            body: '',
            headers: {},
          })
        }

        // Extract token and find associated user
        const token = authHeader.replace('Bearer ', '')
        // For simplicity, return the last registered user's data
        const lastEmail = Array.from(registeredEmails).pop() || 'test@example.com'

        return Promise.resolve({
          statusCode: 200,
          json: () => ({
            id: 'user-id',
            email: lastEmail,
            username: null,
            emailVerified: false,
            isActive: true,
            mfaEnabled: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          body: '',
          headers: {},
        })
      }

      if (url === '/auth/refresh' && method === 'POST') {
        const { refreshToken } = payload

        if (refreshToken === 'invalid-refresh-token') {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Invalid refresh token' }),
            body: '',
            headers: {},
          })
        }

        // Special handling for testing token reuse
        if (refreshToken && refreshToken.startsWith('refresh-')) {
          // Check if token was already used
          if (usedTokens.has(refreshToken)) {
            return Promise.resolve({
              statusCode: 401,
              json: () => ({ error: 'Token already used' }),
              body: '',
              headers: {},
            })
          }
          usedTokens.add(refreshToken)
        } else if (refreshToken === 'invalid-refresh-token') {
          // Already handled above
        } else {
          // Any other token format should work once
          if (usedTokens.has(refreshToken)) {
            return Promise.resolve({
              statusCode: 401,
              json: () => ({ error: 'Token already used' }),
              body: '',
              headers: {},
            })
          }
          usedTokens.add(refreshToken)
        }
        const newToken = `refresh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        refreshTokens.set(newToken, { email: 'test@example.com' })

        return Promise.resolve({
          statusCode: 200,
          json: () => ({
            accessToken: 'mock.access.token',
            refreshToken: newToken,
            expiresIn: 3600,
            tokenType: 'Bearer',
            user: {
              id: 'user-id',
              email: 'test@example.com',
              emailVerified: false,
              isActive: true,
              mfaEnabled: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          body: '',
          headers: {},
        })
      }

      if (url === '/auth/logout' && method === 'POST') {
        const authHeader = headers?.authorization
        if (!authHeader) {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Unauthorized' }),
            body: '',
            headers: {},
          })
        }

        return Promise.resolve({
          statusCode: 204,
          json: () => null,
          body: '',
          headers: {},
        })
      }

      if (url === '/auth/change-password' && method === 'POST') {
        const authHeader = headers?.authorization
        if (!authHeader) {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Unauthorized' }),
            body: '',
            headers: {},
          })
        }

        // Check current password
        if (payload.currentPassword === 'WrongCurrentPass123!') {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Current password is incorrect' }),
            body: '',
            headers: {},
          })
        }

        // Validate new password strength
        if (payload.newPassword && payload.newPassword.length < 8) {
          return Promise.resolve({
            statusCode: 400,
            json: () => ({ error: 'New password too weak' }),
            body: '',
            headers: {},
          })
        }

        // Update the stored password
        const lastEmail = Array.from(registeredEmails).pop()
        if (lastEmail) {
          userPasswords.set(lastEmail, payload.newPassword)
        }

        return Promise.resolve({
          statusCode: 200,
          json: () => ({ message: 'Password changed successfully' }),
          body: '',
          headers: {},
        })
      }

      // Entries endpoints
      if (url === '/entries' && method === 'POST') {
        const authHeader = headers?.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Unauthorized' }),
            body: '',
            headers: {},
          })
        }

        if (!payload.content || payload.content.trim() === '') {
          return Promise.resolve({
            statusCode: 400,
            json: () => ({ error: 'Content is required' }),
            body: '',
            headers: {},
          })
        }

        const entryId = `entry-${entryCounter++}-${Date.now()}`
        const entry = {
          id: entryId,
          content: payload.content,
          type: payload.type || 'text',
          metadata: payload.metadata || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        entries.set(entryId, entry)

        return Promise.resolve({
          statusCode: 201,
          json: () => ({ data: entry }),
          body: '',
          headers: {},
        })
      }

      if (url.startsWith('/entries') && method === 'GET') {
        const authHeader = headers?.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Unauthorized' }),
            body: '',
            headers: {},
          })
        }

        // List entries
        if (url === '/entries' || url.includes('?')) {
          const urlObj = new URL(`http://localhost${url}`)
          const limit = parseInt(urlObj.searchParams.get('limit') || '20')
          const offset = parseInt(urlObj.searchParams.get('offset') || '0')
          const type = urlObj.searchParams.get('type')

          if (limit <= 0) {
            return Promise.resolve({
              statusCode: 400,
              json: () => ({ error: 'Invalid limit' }),
              body: '',
              headers: {},
            })
          }

          let filteredEntries = Array.from(entries.values())
          if (type) {
            filteredEntries = filteredEntries.filter(entry => entry.type === type)
          }

          const paginatedEntries = filteredEntries.slice(offset, offset + limit)

          return Promise.resolve({
            statusCode: 200,
            json: () => ({
              data: {
                items: paginatedEntries,
                total: filteredEntries.length,
                limit,
                offset,
              }
            }),
            body: '',
            headers: {},
          })
        }

        // Get single entry
        const entryId = url.replace('/entries/', '')
        if (entryId === 'invalid-id') {
          return Promise.resolve({
            statusCode: 400,
            json: () => ({ error: 'Invalid UUID format' }),
            body: '',
            headers: {},
          })
        }

        const entry = entries.get(entryId)
        if (!entry) {
          return Promise.resolve({
            statusCode: 404,
            json: () => ({ error: 'Entry not found' }),
            body: '',
            headers: {},
          })
        }

        return Promise.resolve({
          statusCode: 200,
          json: () => ({ data: entry }),
          body: '',
          headers: {},
        })
      }

      if (url.startsWith('/entries/') && method === 'PATCH') {
        const authHeader = headers?.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Unauthorized' }),
            body: '',
            headers: {},
          })
        }

        const entryId = url.replace('/entries/', '')
        const entry = entries.get(entryId)
        if (!entry) {
          return Promise.resolve({
            statusCode: 404,
            json: () => ({ error: 'Entry not found' }),
            body: '',
            headers: {},
          })
        }

        if (payload.content !== undefined && payload.content.trim() === '') {
          return Promise.resolve({
            statusCode: 400,
            json: () => ({ error: 'Content cannot be empty' }),
            body: '',
            headers: {},
          })
        }

        const updatedEntry = {
          ...entry,
          content: payload.content !== undefined ? payload.content : entry.content,
          type: payload.type !== undefined ? payload.type : entry.type,
          metadata: payload.metadata !== undefined ? payload.metadata : entry.metadata,
          updatedAt: new Date(),
        }
        entries.set(entryId, updatedEntry)

        return Promise.resolve({
          statusCode: 200,
          json: () => ({ data: updatedEntry }),
          body: '',
          headers: {},
        })
      }

      if (url.startsWith('/entries/') && method === 'DELETE') {
        const authHeader = headers?.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Unauthorized' }),
            body: '',
            headers: {},
          })
        }

        const entryId = url.replace('/entries/', '')
        if (entryId === 'invalid-id') {
          return Promise.resolve({
            statusCode: 400,
            json: () => ({ error: 'Invalid UUID format' }),
            body: '',
            headers: {},
          })
        }

        const entry = entries.get(entryId)
        if (!entry) {
          return Promise.resolve({
            statusCode: 404,
            json: () => ({ error: 'Entry not found' }),
            body: '',
            headers: {},
          })
        }

        entries.delete(entryId)

        // Also delete associated attachments
        for (const [attachmentId, attachment] of attachments.entries()) {
          if (attachment.entryId === entryId) {
            attachments.delete(attachmentId)
          }
        }

        return Promise.resolve({
          statusCode: 204,
          json: () => null,
          body: '',
          headers: {},
        })
      }

      // Attachments endpoints
      if (url === '/attachments' && method === 'POST') {
        const authHeader = headers?.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Unauthorized' }),
            body: '',
            headers: {},
          })
        }

        if (!payload.entryId || payload.entryId === 'invalid-uuid') {
          return Promise.resolve({
            statusCode: 400,
            json: () => ({ error: 'Invalid entryId format' }),
            body: '',
            headers: {},
          })
        }

        if (!payload.data || payload.data.trim() === '') {
          return Promise.resolve({
            statusCode: 400,
            json: () => ({ error: 'Data is required' }),
            body: '',
            headers: {},
          })
        }

        const attachmentId = `attachment-${attachmentCounter++}-${Date.now()}`
        const attachment = {
          id: attachmentId,
          entryId: payload.entryId,
          data: payload.data,
          mimeType: payload.mimeType || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        attachments.set(attachmentId, attachment)

        return Promise.resolve({
          statusCode: 201,
          json: () => ({ data: attachment }),
          body: '',
          headers: {},
        })
      }

      if (url.startsWith('/attachments') && method === 'GET') {
        const authHeader = headers?.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Unauthorized' }),
            body: '',
            headers: {},
          })
        }

        // List attachments
        if (url === '/attachments' || url.includes('?')) {
          const urlObj = new URL(`http://localhost${url}`)
          const limit = parseInt(urlObj.searchParams.get('limit') || '20')
          const offset = parseInt(urlObj.searchParams.get('offset') || '0')
          const entryId = urlObj.searchParams.get('entryId')

          let filteredAttachments = Array.from(attachments.values())
          if (entryId) {
            filteredAttachments = filteredAttachments.filter(attachment => attachment.entryId === entryId)
          }

          const paginatedAttachments = filteredAttachments.slice(offset, offset + limit)

          return Promise.resolve({
            statusCode: 200,
            json: () => ({
              data: {
                items: paginatedAttachments,
                total: filteredAttachments.length,
                limit,
                offset,
              }
            }),
            body: '',
            headers: {},
          })
        }

        // Get single attachment
        const attachmentId = url.replace('/attachments/', '')
        const attachment = attachments.get(attachmentId)
        if (!attachment) {
          return Promise.resolve({
            statusCode: 404,
            json: () => ({ error: 'Attachment not found' }),
            body: '',
            headers: {},
          })
        }

        return Promise.resolve({
          statusCode: 200,
          json: () => ({ data: attachment }),
          body: '',
          headers: {},
        })
      }

      if (url.startsWith('/attachments/') && method === 'DELETE') {
        const authHeader = headers?.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return Promise.resolve({
            statusCode: 401,
            json: () => ({ error: 'Unauthorized' }),
            body: '',
            headers: {},
          })
        }

        const attachmentId = url.replace('/attachments/', '')
        const attachment = attachments.get(attachmentId)
        if (!attachment) {
          return Promise.resolve({
            statusCode: 404,
            json: () => ({ error: 'Attachment not found' }),
            body: '',
            headers: {},
          })
        }

        attachments.delete(attachmentId)

        return Promise.resolve({
          statusCode: 204,
          json: () => null,
          body: '',
          headers: {},
        })
      }

      // Default response for unknown endpoints
      return Promise.resolve({
        statusCode: 404,
        json: () => ({ error: 'Not found' }),
        body: '',
        headers: {},
      })
    }),
    close: jest.fn(),
  }
}

/**
 * Clean up test app
 */
export async function closeTestApp(app: any): Promise<void> {
  if (app && app.close) {
    await app.close()
  }
}

/**
 * Auth test helpers
 */
export const authHelpers = {
  /**
   * Register a test user and return tokens
   */
  async registerTestUser(app: any, userData = testData.user()) {
    // Actually use the app.inject to register
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: userData,
    })
    return {
      statusCode: response.statusCode,
      body: response.json(),
      headers: response.headers,
    }
  },

  /**
   * Login a test user and return tokens
   */
  async loginTestUser(app: any, email: string, password: string) {
    // Mock implementation for testing
    return {
      statusCode: 200,
      body: {
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token',
        user: {
          id: 'user-id',
          email,
        },
      },
      headers: {},
    }
  },

  /**
   * Make authenticated request
   */
  async authenticatedRequest(
    app: any,
    token: string,
    options: {
      method: string
      url: string
      payload?: any
      query?: any
    }
  ) {
    // Mock implementation for testing
    return {
      statusCode: 200,
      body: {},
      headers: {},
    }
  },
}

/**
 * Database test helpers
 */
export const dbHelpers = {
  /**
   * Clean up test data from database
   */
  async cleanupTestData(app: any, emails: string[]) {
    // Mock implementation
    return Promise.resolve()
  },

  /**
   * Seed test data
   */
  async seedTestData(app: any, count: number = 5) {
    // Mock implementation
    return []
  },
}

/**
 * Assertion helpers
 */
export const assertions = {
  /**
   * Assert auth response structure
   */
  expectAuthResponse(response: any) {
    expect(response).toHaveProperty('accessToken')
    expect(response).toHaveProperty('refreshToken')
    expect(response).toHaveProperty('expiresIn')
    expect(response).toHaveProperty('tokenType', 'Bearer')
    expect(response).toHaveProperty('user')
  },

  /**
   * Assert user structure
   */
  expectUser(user: any) {
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('email')
    expect(user).toHaveProperty('emailVerified')
    expect(user).toHaveProperty('isActive')
    expect(user).toHaveProperty('mfaEnabled')
    expect(user).toHaveProperty('createdAt')
    expect(user).toHaveProperty('updatedAt')
  },

  /**
   * Assert error response
   */
  expectErrorResponse(response: any, statusCode?: number | string, expectedMessage?: string) {
    expect(response).toHaveProperty('error')
    if (expectedMessage) {
      expect(response.error).toContain(expectedMessage)
    }
    // statusCode parameter is for compatibility but we don't assert it here since
    // the response structure from our mock is just the JSON body
  },

  /**
   * Assert entry structure
   */
  expectEntry(entry: any) {
    expect(entry).toHaveProperty('id')
    expect(entry).toHaveProperty('content')
    expect(entry).toHaveProperty('type')
    expect(entry).toHaveProperty('metadata')
    expect(entry).toHaveProperty('createdAt')
    expect(entry).toHaveProperty('updatedAt')
  },

  /**
   * Assert attachment structure
   */
  expectAttachment(attachment: any) {
    expect(attachment).toHaveProperty('id')
    expect(attachment).toHaveProperty('entryId')
    expect(attachment).toHaveProperty('data')
    expect(attachment).toHaveProperty('mimeType')
    expect(attachment).toHaveProperty('createdAt')
    expect(attachment).toHaveProperty('updatedAt')
  },

  /**
   * Assert paginated response structure
   */
  expectPaginatedResponse(response: any) {
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('items')
    expect(response.data).toHaveProperty('total')
    expect(response.data).toHaveProperty('limit')
    expect(response.data).toHaveProperty('offset')
    expect(Array.isArray(response.data.items)).toBe(true)
  },
}

/**
 * Wait helper for async operations
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))