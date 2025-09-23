# Intelligence API Frontend Integration Guide

## **Overview**
The Intelligence API provides AI-powered conversational capabilities, document analysis, and intelligent assistant features powered by OpenAI GPT models. It includes conversation management, message streaming, file attachments, and conversation search functionality.

## Base URL
```
http://localhost:20000
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```typescript
headers: {
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json'
}
```

## Endpoints

### 1. Create Conversation
Start a new AI conversation with optional initial message.

**Endpoint:** `POST /intelligence/conversations`

**Request:**
```typescript
interface CreateConversationRequest {
  title?: string              // Optional: Custom conversation title
  initialMessage?: {          // Optional: First message to send
    content: string
    attachments?: Array<{
      fileId: string
      fileName: string
      fileType: string
      fileSize: number
    }>
  }
  model?: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo'  // Default: 'gpt-4'
  systemPrompt?: string       // Optional: Custom system instructions
}
```

**Response:**
```typescript
interface CreateConversationResponse {
  conversation: {
    id: string
    userId: string
    title: string
    model: string
    systemPrompt?: string
    createdAt: string
    updatedAt: string
    lastMessageAt?: string
    messageCount: number
    tokenCount: number
    status: 'active' | 'archived'
  }
  message?: {
    id: string
    conversationId: string
    role: 'user' | 'assistant' | 'system'
    content: string
    attachments?: Array<Attachment>
    createdAt: string
    tokenCount: number
  }
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:20000/intelligence/conversations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Project Planning Assistant',
    initialMessage: {
      content: 'Help me create a project plan for a mobile app'
    },
    model: 'gpt-4'
  })
})
const data = await response.json()
```

### 2. Send Message (Streaming)
Send a message to an existing conversation with streaming response.

**Endpoint:** `POST /intelligence/conversations/:conversationId/messages/stream`

**Request:**
```typescript
interface SendMessageRequest {
  content: string
  attachments?: Array<{
    fileId: string
    fileName: string
    fileType: string
    fileSize: number
    content?: string     // For text files, include content
  }>
  stream?: boolean       // Default: true for streaming
  temperature?: number   // 0.0 to 2.0, default: 0.7
  maxTokens?: number     // Max response length, default: 4096
}
```

**Response:** Server-Sent Events (SSE) stream
```typescript
// Event types in SSE stream:
interface StreamEvent {
  event: 'message' | 'done' | 'error'
  data: string  // JSON stringified content
}

// Message event data:
interface MessageChunk {
  delta: string          // Incremental content
  messageId: string
  conversationId: string
}

// Done event data:
interface StreamComplete {
  message: {
    id: string
    conversationId: string
    role: 'assistant'
    content: string      // Full message content
    tokenCount: number
    createdAt: string
  }
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// Error event data:
interface StreamError {
  error: string
  message: string
}
```

**Example with EventSource:**
```javascript
const eventSource = new EventSource(
  `http://localhost:20000/intelligence/conversations/${conversationId}/messages/stream`,
  {
    headers: {
      'Authorization': 'Bearer <token>',
      'Content-Type': 'application/json'
    }
  }
)

let fullContent = ''

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data)
  fullContent += data.delta
  // Update UI with incremental content
  updateMessageUI(fullContent)
})

eventSource.addEventListener('done', (event) => {
  const data = JSON.parse(event.data)
  console.log('Complete message:', data.message)
  console.log('Token usage:', data.usage)
  eventSource.close()
})

eventSource.addEventListener('error', (event) => {
  const error = JSON.parse(event.data)
  console.error('Stream error:', error)
  eventSource.close()
})

// Send the message
fetch(`http://localhost:20000/intelligence/conversations/${conversationId}/messages/stream`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Explain quantum computing',
    stream: true
  })
})
```

### 3. Send Message (Non-Streaming)
Send a message and wait for complete response.

**Endpoint:** `POST /intelligence/conversations/:conversationId/messages`

**Request:** Same as streaming endpoint

**Response:**
```typescript
interface SendMessageResponse {
  message: {
    id: string
    conversationId: string
    role: 'assistant'
    content: string
    attachments?: Array<Attachment>
    createdAt: string
    tokenCount: number
  }
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}
```

**Example:**
```javascript
const response = await fetch(
  `http://localhost:20000/intelligence/conversations/${conversationId}/messages`,
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <token>',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: 'What is machine learning?',
      stream: false
    })
  }
)
const data = await response.json()
```

### 4. Get Conversations
List all conversations for the authenticated user.

**Endpoint:** `GET /intelligence/conversations`

**Query Parameters:**
```typescript
interface GetConversationsParams {
  page?: number          // Default: 1
  limit?: number         // Default: 20, max: 100
  status?: 'active' | 'archived' | 'all'  // Default: 'active'
  sortBy?: 'createdAt' | 'updatedAt' | 'lastMessageAt'  // Default: 'updatedAt'
  order?: 'asc' | 'desc' // Default: 'desc'
  search?: string        // Search in titles and messages
}
```

**Response:**
```typescript
interface GetConversationsResponse {
  conversations: Array<{
    id: string
    userId: string
    title: string
    model: string
    lastMessage?: {
      content: string    // Truncated to 100 chars
      role: 'user' | 'assistant'
      createdAt: string
    }
    messageCount: number
    tokenCount: number
    createdAt: string
    updatedAt: string
    lastMessageAt?: string
    status: 'active' | 'archived'
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
```

**Example:**
```javascript
const response = await fetch(
  'http://localhost:20000/intelligence/conversations?page=1&limit=10&status=active',
  {
    headers: {
      'Authorization': 'Bearer <token>'
    }
  }
)
const data = await response.json()
```

### 5. Get Conversation Details
Get full conversation with all messages.

**Endpoint:** `GET /intelligence/conversations/:conversationId`

**Response:**
```typescript
interface GetConversationResponse {
  conversation: {
    id: string
    userId: string
    title: string
    model: string
    systemPrompt?: string
    createdAt: string
    updatedAt: string
    lastMessageAt?: string
    messageCount: number
    tokenCount: number
    status: 'active' | 'archived'
  }
  messages: Array<{
    id: string
    conversationId: string
    role: 'user' | 'assistant' | 'system'
    content: string
    attachments?: Array<Attachment>
    createdAt: string
    tokenCount: number
  }>
}
```

**Example:**
```javascript
const response = await fetch(
  `http://localhost:20000/intelligence/conversations/${conversationId}`,
  {
    headers: {
      'Authorization': 'Bearer <token>'
    }
  }
)
const data = await response.json()
```

### 6. Update Conversation
Update conversation title or status.

**Endpoint:** `PATCH /intelligence/conversations/:conversationId`

**Request:**
```typescript
interface UpdateConversationRequest {
  title?: string
  status?: 'active' | 'archived'
}
```

**Response:**
```typescript
interface UpdateConversationResponse {
  conversation: Conversation
}
```

**Example:**
```javascript
const response = await fetch(
  `http://localhost:20000/intelligence/conversations/${conversationId}`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer <token>',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Updated Title',
      status: 'archived'
    })
  }
)
```

### 7. Delete Conversation
Permanently delete a conversation and all its messages.

**Endpoint:** `DELETE /intelligence/conversations/:conversationId`

**Response:**
```typescript
interface DeleteConversationResponse {
  success: boolean
  message: string
}
```

**Example:**
```javascript
const response = await fetch(
  `http://localhost:20000/intelligence/conversations/${conversationId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer <token>'
    }
  }
)
```

### 8. Search Messages
Search across all conversations and messages.

**Endpoint:** `POST /intelligence/search`

**Request:**
```typescript
interface SearchRequest {
  query: string
  filters?: {
    conversationIds?: string[]
    dateFrom?: string    // ISO date string
    dateTo?: string      // ISO date string
    role?: 'user' | 'assistant' | 'all'
    hasAttachments?: boolean
  }
  limit?: number         // Default: 20, max: 100
  offset?: number        // Default: 0
}
```

**Response:**
```typescript
interface SearchResponse {
  results: Array<{
    message: {
      id: string
      content: string    // With highlighted matches
      role: 'user' | 'assistant'
      createdAt: string
      attachments?: Array<Attachment>
    }
    conversation: {
      id: string
      title: string
      model: string
    }
    relevanceScore: number  // 0.0 to 1.0
    highlights: Array<{
      field: string
      snippets: string[]
    }>
  }>
  totalResults: number
  query: string
  took: number  // Search time in ms
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:20000/intelligence/search', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'machine learning algorithms',
    filters: {
      role: 'assistant',
      dateFrom: '2024-01-01'
    },
    limit: 10
  })
})
const data = await response.json()
```

### 9. Upload Attachment
Upload files to attach to messages.

**Endpoint:** `POST /intelligence/attachments/upload`

**Request:** Multipart form data
```typescript
interface UploadAttachmentRequest {
  file: File              // Max size: 10MB
  conversationId?: string // Optional: Associate with conversation
}
```

**Response:**
```typescript
interface UploadAttachmentResponse {
  attachment: {
    id: string
    fileName: string
    fileType: string
    fileSize: number
    mimeType: string
    url: string          // Temporary signed URL
    uploadedAt: string
    expiresAt: string    // URL expiration time
  }
}
```

**Example:**
```javascript
const formData = new FormData()
formData.append('file', fileInput.files[0])
formData.append('conversationId', conversationId)

const response = await fetch('http://localhost:20000/intelligence/attachments/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>'
  },
  body: formData
})
const data = await response.json()
```

### 10. Generate Summary
Generate a summary of a conversation.

**Endpoint:** `POST /intelligence/conversations/:conversationId/summary`

**Request:**
```typescript
interface GenerateSummaryRequest {
  style?: 'brief' | 'detailed' | 'bullets'  // Default: 'brief'
  maxLength?: number     // Max words in summary, default: 200
}
```

**Response:**
```typescript
interface GenerateSummaryResponse {
  summary: {
    content: string
    style: string
    wordCount: number
    keyTopics: string[]
    generatedAt: string
  }
}
```

**Example:**
```javascript
const response = await fetch(
  `http://localhost:20000/intelligence/conversations/${conversationId}/summary`,
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <token>',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      style: 'bullets',
      maxLength: 300
    })
  }
)
const data = await response.json()
```

### 11. Export Conversation
Export conversation in various formats.

**Endpoint:** `GET /intelligence/conversations/:conversationId/export`

**Query Parameters:**
```typescript
interface ExportParams {
  format: 'json' | 'markdown' | 'pdf' | 'txt'
  includeMetadata?: boolean  // Default: true
  includeAttachments?: boolean  // Default: false
}
```

**Response:** File download or JSON
```typescript
// JSON format response:
interface ExportResponse {
  conversation: Conversation
  messages: Message[]
  metadata: {
    exportedAt: string
    totalTokens: number
    messageCount: number
  }
}

// Other formats: Direct file download
```

**Example:**
```javascript
// JSON export
const response = await fetch(
  `http://localhost:20000/intelligence/conversations/${conversationId}/export?format=json`,
  {
    headers: {
      'Authorization': 'Bearer <token>'
    }
  }
)
const data = await response.json()

// PDF export (triggers download)
window.location.href =
  `http://localhost:20000/intelligence/conversations/${conversationId}/export?format=pdf`
```

### 12. Get Usage Statistics
Get token usage and cost statistics.

**Endpoint:** `GET /intelligence/usage`

**Query Parameters:**
```typescript
interface UsageParams {
  period?: 'day' | 'week' | 'month' | 'year'  // Default: 'month'
  startDate?: string   // ISO date
  endDate?: string     // ISO date
}
```

**Response:**
```typescript
interface UsageResponse {
  usage: {
    totalTokens: number
    totalCost: number    // In USD
    conversationCount: number
    messageCount: number
    modelBreakdown: Array<{
      model: string
      tokens: number
      cost: number
      messageCount: number
    }>
    dailyUsage: Array<{
      date: string
      tokens: number
      cost: number
      conversations: number
      messages: number
    }>
  }
  limits: {
    dailyTokenLimit: number
    monthlyTokenLimit: number
    remainingDailyTokens: number
    remainingMonthlyTokens: number
  }
}
```

**Example:**
```javascript
const response = await fetch(
  'http://localhost:20000/intelligence/usage?period=month',
  {
    headers: {
      'Authorization': 'Bearer <token>'
    }
  }
)
const data = await response.json()
```

## Error Handling

All endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  statusCode: number
  error: string
  message: string
  details?: any
}
```

Common error codes:
- `400`: Bad Request - Invalid input parameters
- `401`: Unauthorized - Missing or invalid authentication token
- `403`: Forbidden - Insufficient permissions or quota exceeded
- `404`: Not Found - Conversation or message not found
- `413`: Payload Too Large - File or message too large
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side error
- `503`: Service Unavailable - AI service temporarily unavailable

**Example error handling:**
```javascript
try {
  const response = await fetch(
    `http://localhost:20000/intelligence/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: 'Hello AI' })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    console.error(`Error ${error.statusCode}: ${error.message}`)

    if (error.statusCode === 429) {
      // Handle rate limiting
      const retryAfter = response.headers.get('Retry-After')
      console.log(`Rate limited. Retry after ${retryAfter} seconds`)
    }
    return
  }

  const data = await response.json()
  console.log(data)
} catch (error) {
  console.error('Network error:', error)
}
```

## Rate Limiting

- **Message sending**: 10 requests per minute per user
- **Conversation creation**: 5 conversations per hour per user
- **Search queries**: 30 requests per minute per user
- **File uploads**: 20 files per hour per user
- **Token limits**: 100,000 tokens per day per user

Rate limit headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1634567890
Retry-After: 60
```

## WebSocket Support (Alternative to SSE)

For real-time streaming with better browser compatibility:

**WebSocket URL:** `ws://localhost:20000/intelligence/ws`

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:20000/intelligence/ws')

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'Bearer <token>'
  }))
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)

  switch (data.type) {
    case 'auth_success':
      console.log('Authenticated')
      // Send a message
      ws.send(JSON.stringify({
        type: 'message',
        conversationId: conversationId,
        content: 'Hello AI'
      }))
      break

    case 'message_chunk':
      // Incremental message content
      console.log('Chunk:', data.delta)
      break

    case 'message_complete':
      // Full message received
      console.log('Complete:', data.message)
      break

    case 'error':
      console.error('Error:', data.error)
      break
  }
}

ws.onerror = (error) => {
  console.error('WebSocket error:', error)
}

ws.onclose = () => {
  console.log('Connection closed')
}
```

## TypeScript Types Package

For TypeScript projects, define these types in a shared file:

```typescript
// intelligence.types.ts
export interface Conversation {
  id: string
  userId: string
  title: string
  model: string
  systemPrompt?: string
  createdAt: string
  updatedAt: string
  lastMessageAt?: string
  messageCount: number
  tokenCount: number
  status: 'active' | 'archived'
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: Attachment[]
  createdAt: string
  tokenCount: number
}

export interface Attachment {
  fileId: string
  fileName: string
  fileType: string
  fileSize: number
  url?: string
  content?: string
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// ... (include all interface definitions from above)
```

## React Hook Examples

### useConversation Hook
```typescript
// useConversation.ts
import { useState, useCallback, useRef } from 'react'

export function useConversation(token: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    attachments?: Attachment[]
  ) => {
    setStreaming(true)
    setError(null)

    try {
      // Add user message immediately
      const userMessage: Message = {
        id: Date.now().toString(),
        conversationId,
        role: 'user',
        content,
        attachments,
        createdAt: new Date().toISOString(),
        tokenCount: 0
      }
      setMessages(prev => [...prev, userMessage])

      // Create streaming connection
      const url = `http://localhost:20000/intelligence/conversations/${conversationId}/messages/stream`
      eventSourceRef.current = new EventSource(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      let assistantMessage = ''

      eventSourceRef.current.addEventListener('message', (event) => {
        const data = JSON.parse(event.data)
        assistantMessage += data.delta

        // Update assistant message in real-time
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]

          if (lastMessage.role === 'assistant') {
            lastMessage.content = assistantMessage
          } else {
            newMessages.push({
              id: data.messageId,
              conversationId,
              role: 'assistant',
              content: assistantMessage,
              createdAt: new Date().toISOString(),
              tokenCount: 0
            })
          }

          return newMessages
        })
      })

      eventSourceRef.current.addEventListener('done', (event) => {
        const data = JSON.parse(event.data)
        console.log('Stream complete:', data)
        setStreaming(false)
        eventSourceRef.current?.close()
      })

      eventSourceRef.current.addEventListener('error', (event) => {
        const error = JSON.parse(event.data)
        setError(error.message)
        setStreaming(false)
        eventSourceRef.current?.close()
      })

      // Send the actual message
      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, attachments, stream: true })
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStreaming(false)
    }
  }, [token])

  const stopStreaming = useCallback(() => {
    eventSourceRef.current?.close()
    setStreaming(false)
  }, [])

  return { messages, sendMessage, streaming, stopStreaming, error }
}
```

### useIntelligenceSearch Hook
```typescript
// useIntelligenceSearch.ts
import { useState, useCallback } from 'react'

export function useIntelligenceSearch(token: string) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (
    query: string,
    filters?: SearchFilters
  ) => {
    setSearching(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:20000/intelligence/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, filters, limit: 20 })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message)
      }

      const data = await response.json()
      setResults(data.results)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setSearching(false)
    }
  }, [token])

  return { search, results, searching, error }
}
```

## Testing with cURL

Quick test examples:

```bash
# Create conversation
curl -X POST http://localhost:20000/intelligence/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title": "Test Conversation", "model": "gpt-4"}'

# Send message (non-streaming)
curl -X POST http://localhost:20000/intelligence/conversations/CONV_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content": "Hello, AI assistant!", "stream": false}'

# Get conversations
curl -X GET "http://localhost:20000/intelligence/conversations?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search messages
curl -X POST http://localhost:20000/intelligence/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "machine learning", "limit": 10}'

# Get usage statistics
curl -X GET "http://localhost:20000/intelligence/usage?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Best Practices

1. **Streaming vs Non-Streaming**:
   - Use streaming for better UX in chat interfaces
   - Use non-streaming for batch processing or when you need the complete response

2. **Token Management**:
   - Monitor token usage to stay within limits
   - Use `maxTokens` parameter to control response length
   - Consider implementing client-side token counting for cost estimation

3. **Error Recovery**:
   - Implement exponential backoff for rate limit errors
   - Store messages locally for recovery from connection failures
   - Provide user feedback during long operations

4. **Performance Optimization**:
   - Implement message pagination for long conversations
   - Use search instead of loading all conversations
   - Cache frequently accessed conversations client-side

5. **Security**:
   - Never expose API tokens in client-side code
   - Implement proper CORS policies
   - Sanitize user input before sending to API
   - Validate file types and sizes before upload

6. **File Attachments**:
   - Compress images before upload
   - Extract text from documents client-side when possible
   - Implement progress indicators for large file uploads

## Model Specifications

### Available Models
- **gpt-4**: Most capable, best for complex reasoning
  - Context window: 8,192 tokens
  - Best for: Complex analysis, coding, creative tasks

- **gpt-4-turbo**: Faster, more cost-effective
  - Context window: 128,000 tokens
  - Best for: Long documents, extensive conversations

- **gpt-3.5-turbo**: Fastest, most economical
  - Context window: 16,385 tokens
  - Best for: Simple queries, quick responses

### Token Limits
- Maximum input tokens: Varies by model
- Maximum output tokens: 4,096 (configurable)
- Total conversation limit: 128,000 tokens

## Support

For issues or questions about the Intelligence API, contact the backend team or refer to the API documentation in the repository.
