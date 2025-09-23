# Intelligence Module - Update Input Endpoint

## Update Input Data

### Endpoint
`PUT /api/intelligence/inputs/:inputId`

### Purpose
Updates the data content of an existing input record. This allows modification of the actual data stored in an input without changing its status or other metadata.

### Request

#### URL Parameters
- `inputId` (string, required) - The unique identifier of the input to update

#### Request Body
```typescript
{
  data: Record<string, any>  // The new data object that will replace the existing data
}
```

### Response

#### Success (200 OK)
Returns the updated `IntelligenceTopicInput` object:

```typescript
{
  id: string,
  topicId: string,
  status: "active" | "archived" | "deleted",
  data: Record<string, any>,  // The newly updated data
  createdAt: Date,
  updatedAt: Date  // Will reflect the time of this update
}
```

#### Error Responses
- `404 Not Found` - Input with the specified ID does not exist
  ```json
  {
    "error": "Input not found"
  }
  ```

- `400 Bad Request` - Invalid request body
  ```json
  {
    "error": "Validation error message"
  }
  ```

## Usage Examples

### Basic Update
```typescript
// Update an existing input's data
const response = await fetch('/api/intelligence/inputs/inp_abc123', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: {
      rating: 4,
      comment: "Updated feedback after resolution",
      resolved: true,
      resolutionDate: "2024-01-20"
    }
  })
})

const updatedInput = await response.json()
console.log(updatedInput)
// Output:
// {
//   id: "inp_abc123",
//   topicId: "customer-feedback-2024",
//   status: "active",
//   data: {
//     rating: 4,
//     comment: "Updated feedback after resolution",
//     resolved: true,
//     resolutionDate: "2024-01-20"
//   },
//   createdAt: "2024-01-15T10:00:00Z",
//   updatedAt: "2024-01-20T15:30:00Z"
// }
```

### Complex Data Update
```typescript
// Update with nested data structure
await fetch('/api/intelligence/inputs/inp_xyz789', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: {
      customer: {
        id: "cust_123",
        name: "John Doe",
        tier: "Premium"
      },
      metrics: {
        satisfaction: 4.5,
        nps: 8,
        churnRisk: "low"
      },
      interactions: [
        {
          date: "2024-01-15",
          type: "support",
          outcome: "resolved"
        },
        {
          date: "2024-01-18",
          type: "feedback",
          outcome: "positive"
        }
      ],
      tags: ["high-value", "engaged", "satisfied"],
      notes: "Customer upgraded to premium after issue resolution"
    }
  })
})
```

### Partial Field Update Pattern
Since the endpoint replaces the entire data object, if you need to update only specific fields, you should:

1. First fetch the current data
2. Merge your updates
3. Send the complete updated object

```typescript
// Helper function for partial updates
async function updateInputFields(inputId: string, updates: Record<string, any>) {
  // Get current input
  const currentResponse = await fetch(`/api/intelligence/topics/{topicId}/inputs`)
  const inputs = await currentResponse.json()
  const currentInput = inputs.find(inp => inp.id === inputId)

  if (!currentInput) {
    throw new Error('Input not found')
  }

  // Merge updates with existing data
  const updatedData = {
    ...currentInput.data,
    ...updates
  }

  // Send updated data
  const response = await fetch(`/api/intelligence/inputs/${inputId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: updatedData
    })
  })

  return response.json()
}

// Usage
await updateInputFields('inp_abc123', {
  resolved: true,
  resolutionDate: new Date().toISOString()
})
```

## Integration with Other Endpoints

### Complete Input Management Flow

```typescript
// 1. Create an input
const createResponse = await fetch('/api/intelligence/topics/feedback-2024/inputs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      rating: 3,
      comment: "Service could be improved"
    }
  })
})
const newInput = await createResponse.json()

// 2. Update the input data after follow-up
await fetch(`/api/intelligence/inputs/${newInput.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      rating: 5,
      comment: "Service could be improved",
      followUp: "Issue resolved satisfactorily",
      updatedRating: 5
    }
  })
})

// 3. Archive the input after processing
await fetch(`/api/intelligence/inputs/${newInput.id}/status`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'archived'
  })
})
```

## Best Practices

1. **Data Validation**: Validate data structure on the client side before sending updates
2. **Optimistic Updates**: Update UI immediately while the request is in progress for better UX
3. **Error Handling**: Always handle potential 404 errors for non-existent inputs
4. **Audit Trail**: Consider storing important changes in the data itself for history tracking
5. **Schema Compliance**: Ensure updated data matches the topic's schema if one is defined

## TypeScript Interface

```typescript
interface UpdateInputRequest {
  data: Record<string, any>
}

interface UpdateInputResponse {
  id: string
  topicId: string
  status: "active" | "archived" | "deleted"
  data: Record<string, any>
  createdAt: string  // ISO 8601 date string
  updatedAt: string  // ISO 8601 date string
}

// API Client Example
class IntelligenceAPI {
  async updateInput(inputId: string, data: Record<string, any>): Promise<UpdateInputResponse> {
    const response = await fetch(`/api/intelligence/inputs/${inputId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data })
    })

    if (!response.ok) {
      throw new Error(`Failed to update input: ${response.statusText}`)
    }

    return response.json()
  }
}
```

## Related Endpoints

- `POST /api/intelligence/topics/:id/inputs` - Create new input
- `GET /api/intelligence/topics/:id/inputs` - Get all inputs for a topic
- `PATCH /api/intelligence/inputs/:inputId/status` - Update input status
- `DELETE /api/intelligence/inputs/:inputId` - Delete input (if implemented)

## Notes

- The `updatedAt` timestamp is automatically updated when the data is modified
- The entire `data` object is replaced, not merged
- The input's `status` remains unchanged when updating data
- Consider implementing validation against the topic's schema in future iterations