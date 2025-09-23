---
title: {{endpoint}} API
type: api
tags: [api, {{module}}]
created: {{date}}
updated: {{date}}
version: v1
---

# {{endpoint}} API Documentation

## Endpoint
```
{{method}} /api/{{path}}
```

## Purpose
Brief description of what this endpoint does.

## Authentication
- **Required**: Yes/No
- **Type**: Bearer Token / API Key
- **Permissions**:

## Request

### Headers
```http
Content-Type: application/json
Authorization: Bearer {{token}}
```

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| {{param}} | string | Yes/No | |

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| {{param}} | string | No | | |

### Request Body
```typescript
interface {{RequestName}} {
  field: string
}
```

#### Example
```json
{
  "field": "value"
}
```

### Validation Rules
- `field`: Required, min 1, max 255

## Response

### Success Response (200/201)
```typescript
interface {{ResponseName}} {
  success: boolean
  data: {

  }
}
```

#### Example
```json
{
  "success": true,
  "data": {

  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": []
  }
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

## Rate Limiting
- **Limit**: 100 requests per minute
- **Window**: Sliding window

## Examples

### cURL
```bash
curl -X {{method}} \
  {{baseUrl}}/api/{{path}} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "field": "value"
  }'
```

### JavaScript (Fetch)
```javascript
const response = await fetch('{{baseUrl}}/api/{{path}}', {
  method: '{{method}}',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    field: 'value'
  })
})

const data = await response.json()
```

### TypeScript SDK
```typescript
import { client } from '@horizon/sdk'

const result = await client.{{module}}.{{action}}({
  field: 'value'
})
```

## Implementation Details
- **Controller**: `src/routes/{{module}}.route.ts`
- **Use Case**: `src/modules/features/{{module}}/application/{{useCase}}.ts`
- **Repository**: `src/modules/features/{{module}}/extensions/repository.ts`

## Change Log
| Version | Date | Changes |
|---------|------|---------|
| v1.0 | {{date}} | Initial version |

## Related Endpoints
- [[docs/03-api/{{related}}|Related API]]

---
*Last reviewed: {{date}}*