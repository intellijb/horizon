import { FastifyInstance } from 'fastify'
import { buildApp } from '../../app'

/**
 * Helper function to create a test app instance
 */
export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp()
  await app.ready()
  return app
}

/**
 * Helper function to make authenticated requests
 */
export function withAuth(headers: Record<string, string>, token: string) {
  return {
    ...headers,
    authorization: `Bearer ${token}`
  }
}

/**
 * Helper function to create a test user and get auth token
 */
export async function createTestUser(app: FastifyInstance, userData: {
  email: string
  password: string
  username?: string
}) {
  // Register user
  const registerResponse = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: userData
  })

  if (registerResponse.statusCode !== 201) {
    throw new Error(`Failed to create test user: ${registerResponse.body}`)
  }

  // Login to get tokens
  const loginResponse = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: {
      email: userData.email,
      password: userData.password
    }
  })

  if (loginResponse.statusCode !== 200) {
    throw new Error(`Failed to login test user: ${loginResponse.body}`)
  }

  const authData = JSON.parse(loginResponse.body)
  return {
    user: authData.user,
    accessToken: authData.accessToken,
    refreshToken: authData.refreshToken
  }
}

/**
 * Common test data
 */
export const testUsers = {
  valid: {
    email: 'test@example.com',
    password: 'testpassword123',
    username: 'testuser'
  },
  admin: {
    email: 'admin@example.com',
    password: 'adminpassword123',
    username: 'admin'
  }
}