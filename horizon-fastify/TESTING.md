# Testing Guide

## Overview

This project uses Jest for testing with comprehensive mocking support, making it easy to write, modify, and maintain tests.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-reruns on file changes)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run only auth module tests
npm run test:auth

# Run auth tests in watch mode (best for development)
npm run test:auth:watch

# Debug tests
npm run test:debug
```

## Test Structure

```
tests/
├── setup.ts                 # Global test setup
└── utils/
    └── test-helpers.ts      # Shared test utilities

src/modules/auth/
├── service.test.ts          # Unit tests with mocks
└── routes.test.ts           # Integration tests
```

## Writing Tests

### 1. Unit Tests with Mocks

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { createAuthService } from './service'
import { testData, mockFactories } from '@test/utils/test-helpers'

describe('AuthService', () => {
  let service: ReturnType<typeof createAuthService>
  let mockRepository: jest.Mocked<AuthRepository>

  beforeEach(() => {
    // Create fresh mocks for each test
    mockRepository = mockFactories.authRepository()
    service = createAuthService(mockFastify)
  })

  it('should register user', async () => {
    // Arrange
    const userData = testData.user() // Generates fake data
    mockRepository.findUserByEmail.mockResolvedValue(null)
    mockRepository.createUser.mockResolvedValue(mockUser)

    // Act
    const result = await service.register(userData)

    // Assert
    expect(result.user.email).toBe(userData.email)
    expect(mockRepository.createUser).toHaveBeenCalledWith(userData)
  })
})
```

### 2. Integration Tests

```typescript
describe('Auth Routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await closeTestApp(app)
  })

  it('should register via API', async () => {
    const userData = testData.user()

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: userData,
    })

    expect(response.statusCode).toBe(201)
    assertions.expectAuthResponse(response.json())
  })
})
```

## Test Utilities

### Data Generators

```typescript
// Generate random test data
const userData = testData.user()
// { email: 'john.doe@example.com', password: 'SecurePass123!', username: 'johndoe' }

// Generate JWT tokens
const token = testData.jwt('user-id')
const expiredToken = testData.expiredJwt()

// Generate device info
const device = testData.device()
```

### Mock Factories

```typescript
// Create mock repository
const mockRepo = mockFactories.authRepository()

// Create mock database user
const dbUser = mockFactories.dbUser({ email: 'custom@example.com' })

// Create mock device
const dbDevice = mockFactories.dbDevice('user-id')
```

### Assertion Helpers

```typescript
// Check auth response structure
assertions.expectAuthResponse(response)

// Check user structure
assertions.expectUser(user)

// Check error response
assertions.expectErrorResponse(response, 'expected message')
```

### Custom Matchers

```typescript
// Check if string is valid JWT
expect(token).toBeValidJWT()

// Check if string is valid UUID
expect(id).toBeValidUUID()
```

## Test Scenarios

### Auth Module Coverage

- **Registration**
  - ✅ Successful registration
  - ✅ Duplicate email rejection
  - ✅ Password validation
  - ✅ Email format validation
  - ✅ Optional username handling

- **Login**
  - ✅ Successful login
  - ✅ Invalid credentials
  - ✅ Rate limiting
  - ✅ Inactive account
  - ✅ Device tracking

- **Token Management**
  - ✅ Access token generation
  - ✅ Refresh token rotation
  - ✅ Token expiration
  - ✅ Token reuse detection

- **Password Management**
  - ✅ Change password
  - ✅ Forgot password
  - ✅ Reset password
  - ✅ Password strength validation

- **Security**
  - ✅ Rate limiting
  - ✅ Security event logging
  - ✅ Device fingerprinting

## Mocking Strategies

### 1. Repository Mocking

```typescript
// Mock successful database operation
mockRepository.findUserByEmail.mockResolvedValue(null)
mockRepository.createUser.mockResolvedValue(userData)

// Mock database error
mockRepository.createUser.mockRejectedValue(new Error('DB Error'))

// Mock not found
mockRepository.findUserById.mockResolvedValue(null)
```

### 2. External Service Mocking

```typescript
// Mock bcrypt
jest.mock('bcrypt')
(bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword')
(bcrypt.compare as jest.Mock).mockResolvedValue(true)

// Mock JWT
jest.mock('jsonwebtoken')
(jwt.sign as jest.Mock).mockReturnValue('mock.jwt.token')
(jwt.verify as jest.Mock).mockReturnValue({ sub: 'user-id' })
```

### 3. Partial Mocking

```typescript
// Mock only specific methods
const service = createAuthService(fastify)
jest.spyOn(service, 'verifyAccessToken').mockResolvedValue({
  userId: 'user-id',
  email: 'test@example.com',
})
```

## Best Practices

### 1. Test Isolation

```typescript
beforeEach(() => {
  // Reset mocks between tests
  jest.clearAllMocks()
  mockReset(mockRepository)
})
```

### 2. Descriptive Test Names

```typescript
describe('AuthService', () => {
  describe('register', () => {
    it('should create user with hashed password', async () => {})
    it('should generate JWT tokens on success', async () => {})
    it('should record security event', async () => {})
  })
})
```

### 3. AAA Pattern

```typescript
it('should do something', async () => {
  // Arrange - Set up test data and mocks
  const userData = testData.user()
  mockRepository.createUser.mockResolvedValue(user)

  // Act - Execute the code being tested
  const result = await service.register(userData)

  // Assert - Verify the results
  expect(result).toBeDefined()
  expect(mockRepository.createUser).toHaveBeenCalledWith(userData)
})
```

### 4. Error Testing

```typescript
it('should handle errors gracefully', async () => {
  // Arrange
  mockRepository.createUser.mockRejectedValue(new Error('DB Error'))

  // Act & Assert
  await expect(service.register(userData))
    .rejects
    .toThrow('DB Error')
})
```

## Coverage Goals

- **Unit Tests**: 80%+ coverage for business logic
- **Integration Tests**: Cover all API endpoints
- **Edge Cases**: Test error conditions and boundaries

## Running Tests in CI/CD

```bash
# Run tests with coverage for CI
npm run test:coverage

# Output will be in:
# - Terminal: Summary table
# - coverage/lcov-report/index.html: HTML report
# - coverage/lcov.info: For coverage tools
```

## Debugging Tests

### VS Code Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "${relativeFile}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug Single Test

```bash
# Debug specific test file
npm run test:debug src/modules/auth/service.test.ts

# Then open Chrome DevTools at chrome://inspect
```

## Common Issues & Solutions

### Issue: Tests fail with "Cannot find module"

**Solution**: Check path aliases in `jest.config.js`:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@test/(.*)$': '<rootDir>/tests/$1',
}
```

### Issue: Mocks not working

**Solution**: Clear mock state:

```typescript
beforeEach(() => {
  jest.clearAllMocks()
})
```

### Issue: Async tests timeout

**Solution**: Increase timeout:

```typescript
jest.setTimeout(10000) // 10 seconds

// Or per test
it('slow test', async () => {
  // test code
}, 10000)
```

### Issue: Database connection errors in tests

**Solution**: Mock the database layer:

```typescript
jest.mock('./repository', () => ({
  createAuthRepository: () => mockRepository
}))
```

## Contributing Tests

1. Write tests for new features before implementing
2. Ensure all tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Update this guide with new patterns or utilities

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [Fastify Testing](https://www.fastify.io/docs/latest/Guides/Testing/)
- [Jest Mock Extended](https://github.com/marchaos/jest-mock-extended)