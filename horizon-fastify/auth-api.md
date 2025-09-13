# Auth API Documentation

## Base URL
```
http://localhost:20000/auth
```

## Authentication Flow

The API uses JWT tokens for authentication:
- **Access Token**: Short-lived token (15 minutes) for API requests
- **Refresh Token**: Long-lived token (7 days) for getting new access tokens

Include the access token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## Endpoints

### Authentication

#### Register New User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "username": "johndoe"  // optional
}

Response: 201 Created
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a3f8d9c2b1e4f6a8...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "johndoe",
    "emailVerified": false,
    "isActive": true,
    "mfaEnabled": false,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "deviceFingerprint": "unique-device-id",  // optional
  "deviceName": "Chrome on MacOS"           // optional
}

Response: 200 OK
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a3f8d9c2b1e4f6a8...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "johndoe",
    "emailVerified": true,
    "isActive": true,
    "mfaEnabled": false,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}

Error: 401 Unauthorized (invalid credentials)
Error: 429 Too Many Requests (rate limited after 5 failed attempts)
```

#### Refresh Access Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "a3f8d9c2b1e4f6a8..."
}

Response: 200 OK
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "b4g9e0d3c2f5g7b9...",  // New refresh token
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": { ... }
}

Error: 401 Unauthorized (invalid or expired token)
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <access_token>

Response: 204 No Content
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "johndoe",
  "emailVerified": true,
  "isActive": true,
  "mfaEnabled": false,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### Password Management

#### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: 200 OK
{
  "message": "If the email exists, a reset link has been sent"
}
```

#### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123!"
}

Response: 200 OK
{
  "message": "Password has been reset successfully"
}

Error: 400 Bad Request (invalid or expired token)
```

#### Change Password (Authenticated)
```http
POST /auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!"
}

Response: 200 OK
{
  "message": "Password changed successfully"
}

Error: 401 Unauthorized (wrong current password)
```

### Email Verification

#### Verify Email
```http
POST /auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}

Response: 200 OK
{
  "message": "Email verified successfully"
}

Error: 400 Bad Request (invalid token)
```

### User Management (Admin)

#### List Users
```http
GET /auth/users?page=1&limit=20&search=john&isActive=true&emailVerified=true
Authorization: Bearer <access_token>

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- search: string (searches email and username)
- isActive: boolean
- emailVerified: boolean

Response: 200 OK
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "username": "johndoe",
      "emailVerified": true,
      "isActive": true,
      "mfaEnabled": false,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### Get User by ID
```http
GET /auth/users/:id
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "johndoe",
  "emailVerified": true,
  "isActive": true,
  "mfaEnabled": false,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}

Error: 404 Not Found
```

#### Create User (Admin)
```http
POST /auth/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "username": "newuser"  // optional
}

Response: 201 Created
{
  "id": "456e7890-e89b-12d3-a456-426614174000",
  "email": "newuser@example.com",
  "username": "newuser",
  "emailVerified": false,
  "isActive": true,
  "mfaEnabled": false,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

#### Update User
```http
PATCH /auth/users/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "updated@example.com",     // optional
  "username": "updatedusername",      // optional
  "isActive": false                   // optional
}

Response: 200 OK
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "updated@example.com",
  "username": "updatedusername",
  "emailVerified": true,
  "isActive": false,
  "mfaEnabled": false,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

#### Delete User
```http
DELETE /auth/users/:id
Authorization: Bearer <access_token>

Response: 204 No Content
Error: 404 Not Found
```

### Device Management

#### List User Devices
```http
GET /auth/users/:userId/devices?page=1&limit=20&trusted=true
Authorization: Bearer <access_token>

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- trusted: boolean

Response: 200 OK
{
  "data": [
    {
      "id": "789e0123-e89b-12d3-a456-426614174000",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "deviceName": "Chrome on MacOS",
      "deviceType": "desktop",
      "deviceFingerprint": "unique-device-id",
      "trusted": true,
      "lastSeenAt": "2024-01-15T10:00:00Z",
      "createdAt": "2024-01-15T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

#### Get Device
```http
GET /auth/devices/:id
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": "789e0123-e89b-12d3-a456-426614174000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "deviceName": "Chrome on MacOS",
  "deviceType": "desktop",
  "deviceFingerprint": "unique-device-id",
  "trusted": true,
  "lastSeenAt": "2024-01-15T10:00:00Z",
  "createdAt": "2024-01-15T09:00:00Z"
}
```

#### Update Device
```http
PATCH /auth/devices/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "deviceName": "My Work Laptop",  // optional
  "trusted": true                  // optional
}

Response: 200 OK
{
  "id": "789e0123-e89b-12d3-a456-426614174000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "deviceName": "My Work Laptop",
  "deviceType": "desktop",
  "deviceFingerprint": "unique-device-id",
  "trusted": true,
  "lastSeenAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-15T09:00:00Z"
}
```

#### Delete Device
```http
DELETE /auth/devices/:id
Authorization: Bearer <access_token>

Response: 204 No Content
Error: 401 Unauthorized (not your device)
Error: 404 Not Found
```

### Security Events

#### List Security Events
```http
GET /auth/security-events?page=1&limit=20&userId=123&eventType=login_success
Authorization: Bearer <access_token>

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- userId: UUID
- deviceId: UUID
- eventType: string (see Event Types below)
- startDate: ISO 8601 datetime
- endDate: ISO 8601 datetime

Response: 200 OK
{
  "data": [
    {
      "id": "abc123-e89b-12d3-a456-426614174000",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "deviceId": "789e0123-e89b-12d3-a456-426614174000",
      "eventType": "login_success",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "metadata": {
        "method": "password"
      },
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Data Types

### Device Types
- `mobile`
- `desktop`
- `tablet`
- `tv`
- `watch`
- `unknown`

### Security Event Types
- `login_success`
- `login_failed`
- `logout`
- `password_changed`
- `password_reset_requested`
- `password_reset_completed`
- `mfa_enabled`
- `mfa_disabled`
- `email_verified`
- `device_added`
- `device_removed`
- `suspicious_activity`

## Error Responses

All error responses follow this format:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Request succeeded with no response body
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or failed
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limited
- `500 Internal Server Error` - Server error

## Rate Limiting

- Failed login attempts: 5 attempts per 15 minutes per IP address
- After 5 failed attempts, the IP is temporarily blocked

## Security Best Practices

1. **Password Requirements**:
   - Minimum 8 characters
   - Maximum 128 characters
   - Should include uppercase, lowercase, numbers, and special characters

2. **Token Management**:
   - Store tokens securely (never in localStorage for sensitive apps)
   - Refresh tokens regularly
   - Clear tokens on logout

3. **Device Fingerprinting**:
   - Generate unique device fingerprints for better security
   - Track trusted devices to detect suspicious logins

4. **HTTPS Only**:
   - Always use HTTPS in production
   - Never send credentials over unencrypted connections

## Example Client Implementation

### JavaScript/TypeScript
```typescript
class AuthClient {
  private baseUrl = 'http://localhost:20000/auth';
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    return data;
  }

  async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      await this.refreshAccessToken();
      // Retry the request
      return fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
    }

    return response;
  }

  async refreshAccessToken() {
    const response = await fetch(`${this.baseUrl}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    return data;
  }

  async logout() {
    await fetch(`${this.baseUrl}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    this.accessToken = null;
    this.refreshToken = null;
  }
}

// Usage
const authClient = new AuthClient();
await authClient.login('user@example.com', 'password123');
const user = await authClient.makeAuthenticatedRequest('/me');
```

### cURL Examples
```bash
# Register
curl -X POST http://localhost:20000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Login
curl -X POST http://localhost:20000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Get current user
curl -X GET http://localhost:20000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Refresh token
curl -X POST http://localhost:20000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```