import { GraphQLScalarType, Kind } from 'graphql';

// Custom DateTime scalar
export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Date and time in ISO 8601 format',
  serialize(value) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
  parseValue(value) {
    if (typeof value === 'string') {
      return new Date(value);
    }
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// GraphQL Context type
export interface GraphQLContext {
  user?: {
    id: string;
    email: string;
    role: string;
  } | null;
  refreshToken?: string | null;
  request?: any; // Framework-specific request object
}

// Common types for resolvers
export interface User {
  id: string;
  email: string;
  username?: string;
  emailVerified: boolean;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
  devices: UserDevice[];
}

export interface UserDevice {
  id: string;
  userId: string;
  deviceId: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  lastUsedAt: Date;
  createdAt: Date;
}

export interface AuthPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface HealthStatus {
  status: string;
  timestamp: Date;
  uptime: number;
  services: {
    postgres: string;
    redis: string;
  };
}

export interface SystemInfo {
  version: string;
  environment: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    unit: string;
  };
}

// Input types
export interface RegisterInput {
  email: string;
  password: string;
  username?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceName?: string;
}

export interface UpdateProfileInput {
  username?: string;
  email?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}