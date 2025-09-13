import 'dotenv/config'

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-key'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
process.env.LOG_LEVEL = 'silent'

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Add custom matchers if needed
expect.extend({
  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
    const pass = jwtRegex.test(received)

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid JWT`
          : `expected ${received} to be a valid JWT`,
    }
  },

  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const pass = uuidRegex.test(received)

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    }
  },
})

// Add type definitions for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidJWT(): R
      toBeValidUUID(): R
    }
  }
}