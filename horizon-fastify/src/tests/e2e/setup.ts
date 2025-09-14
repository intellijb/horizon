// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'warn'
})

afterAll(async () => {
  // Cleanup any global resources
  await new Promise(resolve => setTimeout(resolve, 100))
})