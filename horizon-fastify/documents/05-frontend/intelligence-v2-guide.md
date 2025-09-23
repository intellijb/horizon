# Intelligence Module API Documentation

## Base URL
All intelligence endpoints are prefixed with `/api/intelligence`

## Data Models

### IntelligenceTopic
```typescript
interface IntelligenceTopic {
  id: string
  createdAt: Date
  updatedAt: Date
}
```

### IntelligenceTopicSchema
```typescript
interface IntelligenceTopicSchema {
  id: string
  topicId: string
  columnName: string
  columnType: string
  columnDescription: string | null
  createdAt: Date
  updatedAt: Date
}
```

### IntelligenceTopicInput
```typescript
interface IntelligenceTopicInput {
  id: string
  topicId: string
  status: "active" | "archived" | "deleted"
  data: Record<string, any>
  createdAt: Date
  updatedAt: Date
}
```

### IntelligenceTopicConversation
```typescript
interface IntelligenceTopicConversation {
  id: string
  topicId: string
  conversationProvider: "openai"
  conversationId: string
  createdAt: Date
  updatedAt: Date
}
```

### IntelligenceTopicNote
```typescript
interface IntelligenceTopicNote {
  id: string
  topicId: string
  note: string
  createdAt: Date
  updatedAt: Date
}
```

### TopicWithRelations
```typescript
interface TopicWithRelations extends IntelligenceTopic {
  schema?: IntelligenceTopicSchema[]
  inputs?: IntelligenceTopicInput[]
  conversations?: IntelligenceTopicConversation[]
  notes?: IntelligenceTopicNote[]
}
```

## API Endpoints

### Topics

#### Create Topic
Creates a new intelligence topic.
- **Method:** `POST`
- **Endpoint:** `/topics`
- **Request Body:**
  ```typescript
  {
    id: string  // Unique topic identifier
  }
  ```
- **Response:** `201 Created` - Returns created `IntelligenceTopic`
- **Error:** `400 Bad Request` - Invalid input

#### Get All Topics
Retrieves all intelligence topics.
- **Method:** `GET`
- **Endpoint:** `/topics`
- **Response:** `200 OK` - Returns array of `IntelligenceTopic[]`
- **Error:** `500 Internal Server Error`

#### Get Topic with Relations
Retrieves a specific topic with all its related data (schema, inputs, conversations, notes).
- **Method:** `GET`
- **Endpoint:** `/topics/:id`
- **Response:** `200 OK` - Returns `TopicWithRelations`
- **Error:** `404 Not Found` - Topic not found

#### Delete Topic
Removes a topic and all its related data.
- **Method:** `DELETE`
- **Endpoint:** `/topics/:id`
- **Response:** `204 No Content`
- **Error:** `404 Not Found` - Topic not found

### Topic Schema

#### Define Schema
Adds a schema column definition to a topic.
- **Method:** `POST`
- **Endpoint:** `/topics/:id/schema`
- **Request Body:**
  ```typescript
  {
    columnName: string         // Column name
    columnType: string         // Data type
    columnDescription?: string // Optional description
  }
  ```
- **Response:** `201 Created` - Returns created `IntelligenceTopicSchema`
- **Error:** `400 Bad Request` - Invalid schema definition

#### Get Topic Schema
Retrieves all schema definitions for a topic.
- **Method:** `GET`
- **Endpoint:** `/topics/:id/schema`
- **Response:** `200 OK` - Returns array of `IntelligenceTopicSchema[]`
- **Error:** `404 Not Found` - Topic not found

### Topic Inputs

#### Add Input
Adds a data input to a topic.
- **Method:** `POST`
- **Endpoint:** `/topics/:id/inputs`
- **Request Body:**
  ```typescript
  {
    data: Record<string, any>                           // Flexible JSON data
    status?: "active" | "archived" | "deleted"         // Optional status (defaults to "active")
  }
  ```
- **Response:** `201 Created` - Returns created `IntelligenceTopicInput`
- **Error:** `400 Bad Request` - Invalid input data

#### Get Topic Inputs
Retrieves all inputs for a topic, optionally filtered by status.
- **Method:** `GET`
- **Endpoint:** `/topics/:id/inputs`
- **Query Parameters:**
  - `status` (optional): `"active" | "archived" | "deleted"` - Filter by status
- **Response:** `200 OK` - Returns array of `IntelligenceTopicInput[]`
- **Error:** `404 Not Found` - Topic not found

#### Update Input
Updates the data content of a specific input.
- **Method:** `PUT`
- **Endpoint:** `/inputs/:inputId`
- **Request Body:**
  ```typescript
  {
    data: Record<string, any>  // Updated data object
  }
  ```
- **Response:** `200 OK` - Returns updated `IntelligenceTopicInput`
- **Error:** `404 Not Found` - Input not found

#### Update Input Status
Updates the status of a specific input.
- **Method:** `PATCH`
- **Endpoint:** `/inputs/:inputId/status`
- **Request Body:**
  ```typescript
  {
    status: "active" | "archived" | "deleted"
  }
  ```
- **Response:** `200 OK` - Returns updated `IntelligenceTopicInput`
- **Error:** `404 Not Found` - Input not found

### Topic Conversations

#### Link Conversation
Links an external conversation (e.g., OpenAI chat) to a topic.
- **Method:** `POST`
- **Endpoint:** `/topics/:id/conversations`
- **Request Body:**
  ```typescript
  {
    conversationId: string      // External conversation ID
    provider?: "openai"         // Optional provider (defaults to "openai")
  }
  ```
- **Response:** `201 Created` - Returns created `IntelligenceTopicConversation`
- **Error:** `400 Bad Request` - Invalid conversation data

#### Get Topic Conversations
Retrieves all linked conversations for a topic.
- **Method:** `GET`
- **Endpoint:** `/topics/:id/conversations`
- **Response:** `200 OK` - Returns array of `IntelligenceTopicConversation[]`
- **Error:** `404 Not Found` - Topic not found

### Topic Notes

#### Add Note
Adds a text note to a topic.
- **Method:** `POST`
- **Endpoint:** `/topics/:id/notes`
- **Request Body:**
  ```typescript
  {
    note: string  // Note content
  }
  ```
- **Response:** `201 Created` - Returns created `IntelligenceTopicNote`
- **Error:** `400 Bad Request` - Invalid note

#### Get Topic Notes
Retrieves all notes for a topic.
- **Method:** `GET`
- **Endpoint:** `/topics/:id/notes`
- **Response:** `200 OK` - Returns array of `IntelligenceTopicNote[]`
- **Error:** `404 Not Found` - Topic not found

#### Update Note
Updates the content of an existing note.
- **Method:** `PUT`
- **Endpoint:** `/notes/:noteId`
- **Request Body:**
  ```typescript
  {
    note: string  // Updated note content
  }
  ```
- **Response:** `200 OK` - Returns updated `IntelligenceTopicNote`
- **Error:** `404 Not Found` - Note not found

#### Delete Note
Removes a note.
- **Method:** `DELETE`
- **Endpoint:** `/notes/:noteId`
- **Response:** `204 No Content`
- **Error:** `404 Not Found` - Note not found

## Usage Examples

### Creating a Topic with Schema and Data

```typescript
// 1. Create a topic
const topic = await fetch('/api/intelligence/topics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 'customer-feedback-2024' })
})

// 2. Define schema for the topic
await fetch('/api/intelligence/topics/customer-feedback-2024/schema', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    columnName: 'rating',
    columnType: 'number',
    columnDescription: 'Customer satisfaction rating (1-5)'
  })
})

// 3. Add input data
await fetch('/api/intelligence/topics/customer-feedback-2024/inputs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      rating: 5,
      comment: 'Excellent service!',
      date: '2024-01-15'
    }
  })
})
```

### Managing Input Data and Status

```typescript
// Get active inputs
const activeInputs = await fetch('/api/intelligence/topics/customer-feedback-2024/inputs?status=active')

// Update input data
await fetch('/api/intelligence/inputs/input-123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      rating: 4,
      comment: 'Updated: Service was good but could be better',
      date: '2024-01-15',
      edited: true
    }
  })
})

// Archive an input
await fetch('/api/intelligence/inputs/input-123/status', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'archived' })
})
```

### Linking External Resources

```typescript
// Link an OpenAI conversation
await fetch('/api/intelligence/topics/customer-feedback-2024/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: 'chat-abc123',
    provider: 'openai'
  })
})

// Add a note
await fetch('/api/intelligence/topics/customer-feedback-2024/notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    note: 'Q1 2024 feedback analysis complete. Key insights: 85% satisfaction rate.'
  })
})
```

## Error Handling

All endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  error: string  // Error message
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error