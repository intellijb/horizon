# Recent Messages API - Frontend Integration Guide

## Overview
The GET `/interviews/:sessionId` endpoint has been updated to return recent messages for an interview session. This endpoint allows the frontend to fetch and display the conversation history for a specific interview.

## Endpoint Details

### Request
```
GET /interviews/:sessionId
Authorization: Bearer <access_token>
```

### Parameters
- `sessionId` (UUID, required): The unique identifier of the interview session

### Response Format
```typescript
{
  id: string
  title: string
  status: "draft" | "active" | "paused" | "completed" | "archived"
  progress: number
  score: number
  targetScore?: number
  createdAt: string
  updatedAt: string
  lastInteractionAt?: string
  interviewerId: string
  conversationId?: string
  topicIds: string[]
  topicLabels?: string[]
  language?: "ko" | "en" | "ja"
  difficulty?: 1 | 2 | 3 | 4 | 5
  retryPolicy?: {
    minCooldownHours?: number
    autoSuggestIfBelow?: number
  }
  labels?: string[]
  notes?: string
  recentMessages?: Array<{
    id: string
    conversationId: string
    status: string
    model?: string
    output: any // Contains the message content - see structure below
    temperature?: number
    usage?: any
    metadata?: any
    createdAt: string
  }>
}
```

## Message Structure

The `output` field in each message contains the conversation data. It typically follows this structure:

### For User Messages
```javascript
{
  type: "message",
  role: "user",
  content: "User's message text"
}
```

### For Assistant Messages
```javascript
{
  type: "message",
  role: "assistant",
  content: [
    {
      text: "Assistant's response text"
    }
  ]
}
```

## Frontend Implementation Example

### 1. Fetching Interview Session with Recent Messages

```javascript
async function getInterviewSession(sessionId) {
  const response = await fetch(`/api/interviews/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch interview session')
  }

  return response.json()
}
```

### 2. Parsing Messages for Display

```javascript
function parseMessages(recentMessages) {
  if (!recentMessages || !Array.isArray(recentMessages)) {
    return []
  }

  return recentMessages.map(message => {
    const output = message.output

    // Handle different output formats
    if (Array.isArray(output)) {
      // Find the message item
      const messageItem = output.find(item =>
        item.type === 'message' && (item.role === 'user' || item.role === 'assistant')
      )

      if (messageItem) {
        return {
          id: message.id,
          role: messageItem.role,
          content: extractContent(messageItem.content),
          timestamp: message.createdAt
        }
      }
    } else if (typeof output === 'object' && output.type === 'message') {
      return {
        id: message.id,
        role: output.role,
        content: extractContent(output.content),
        timestamp: message.createdAt
      }
    }

    // Fallback for unexpected formats
    return {
      id: message.id,
      role: 'unknown',
      content: JSON.stringify(output),
      timestamp: message.createdAt
    }
  })
}

function extractContent(content) {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .filter(item => item.text)
      .map(item => item.text)
      .join('\n')
  }

  return ''
}
```

### 3. React Component Example

```jsx
function InterviewMessages({ sessionId }) {
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSessionWithMessages()
  }, [sessionId])

  const fetchSessionWithMessages = async () => {
    try {
      setLoading(true)
      const data = await getInterviewSession(sessionId)
      setSession(data)

      if (data.recentMessages) {
        const parsedMessages = parseMessages(data.recentMessages)
        setMessages(parsedMessages)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!session) return <div>No session found</div>

  return (
    <div className="interview-container">
      <div className="session-info">
        <h2>{session.title}</h2>
        <p>Status: {session.status}</p>
        <p>Progress: {session.progress}%</p>
      </div>

      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-role">{message.role}</div>
            <div className="message-content">{message.content}</div>
            <div className="message-time">
              {new Date(message.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Error Handling

The endpoint returns standard HTTP status codes:

- **200 OK**: Successfully retrieved the session with recent messages
- **401 Unauthorized**: Invalid or missing authentication token
- **403 Forbidden**: User doesn't have access to this session
- **404 Not Found**: Session not found

Error response format:
```json
{
  "error": "Error message",
  "details": "Optional additional details"
}
```

## Performance Considerations

1. **Message Limit**: By default, the endpoint returns the 10 most recent messages. This can be adjusted based on requirements.

2. **Pagination**: For sessions with many messages, consider implementing pagination:
   - Add query parameters: `?limit=20&offset=0`
   - Return metadata about total count and pagination

3. **Caching**: Consider caching session data on the frontend for improved performance, but ensure fresh data is fetched when needed (e.g., after sending a new message).

## Security Notes

- Always include the authorization token in requests
- The endpoint automatically filters sessions to only return those belonging to the authenticated user
- Never expose sensitive session IDs in URLs or logs

## Migration from Existing Code

If you're currently using the `/interviews/:sessionId/history` endpoint separately, you can now:

1. Replace two API calls with one
2. Get both session details and recent messages in a single response
3. Reduce network overhead and improve loading times

Example migration:
```javascript
// Old approach
const session = await getSession(sessionId)
const history = await getHistory(sessionId)

// New approach
const sessionWithMessages = await getInterviewSession(sessionId)
// sessionWithMessages contains both session info and recentMessages
```