// GraphQL type definitions using SDL (Schema Definition Language)
export const typeDefs = `
  scalar DateTime

  type User {
    id: ID!
    email: String!
    username: String
    emailVerified: Boolean!
    role: UserRole!
    createdAt: DateTime!
    updatedAt: DateTime!
    lastLoginAt: DateTime
    devices: [UserDevice!]!
  }

  type UserDevice {
    id: ID!
    userId: ID!
    deviceId: String!
    deviceName: String
    userAgent: String
    ipAddress: String
    lastUsedAt: DateTime!
    createdAt: DateTime!
  }

  enum UserRole {
    USER
    ADMIN
    MODERATOR
  }

  type AuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String!
  }

  type HealthStatus {
    status: String!
    timestamp: DateTime!
    uptime: Float!
    services: ServiceStatus!
  }

  type ServiceStatus {
    postgres: String!
    redis: String!
  }

  type Query {
    # Health endpoints
    health: HealthStatus!
    
    # User queries
    me: User
    user(id: ID!): User
    users(limit: Int = 10, offset: Int = 0): [User!]!
    
    # System info
    systemInfo: SystemInfo!
  }

  type Mutation {
    # Authentication
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!
    refreshToken: AuthPayload!
    
    # User management
    updateProfile(input: UpdateProfileInput!): User!
    changePassword(input: ChangePasswordInput!): Boolean!
    deleteAccount: Boolean!
  }

  type Subscription {
    # Real-time health status
    healthUpdates: HealthStatus!
    
    # User activity (for admin)
    userActivity: UserActivityEvent!
  }

  # Input types
  input RegisterInput {
    email: String!
    password: String!
    username: String
  }

  input LoginInput {
    email: String!
    password: String!
    deviceName: String
  }

  input UpdateProfileInput {
    username: String
    email: String
  }

  input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
  }

  # Additional types
  type SystemInfo {
    version: String!
    environment: String!
    uptime: Float!
    memory: MemoryInfo!
  }

  type MemoryInfo {
    used: Float!
    total: Float!
    unit: String!
  }

  type UserActivityEvent {
    userId: ID!
    action: String!
    timestamp: DateTime!
    metadata: String
  }
`;