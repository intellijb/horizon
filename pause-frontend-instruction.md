# Frontend Implementation Instructions for Interview Pause Feature

## API Endpoint

```
POST /interviews/:sessionId/pause
```

### Request Details
- **Method**: POST
- **URL**: `/interviews/{sessionId}/pause`
- **Headers**:
  - `Authorization: Bearer {accessToken}` (required)
- **URL Parameters**:
  - `sessionId` (string, UUID) - The ID of the interview session to pause

### Response

#### Success Response (200 OK)
Returns the updated interview session object:

```typescript
{
  id: string
  topicIds: string[]
  topicLabels?: string[]
  title: string
  progress: number
  score: number
  targetScore?: number
  createdAt: string
  updatedAt: string
  lastInteractionAt?: string
  interviewerId: string
  conversationId?: string
  status: "paused"  // Will be changed from "active" to "paused"
  retryPolicy?: {
    minCooldownHours?: number
    autoSuggestIfBelow?: number
  }
  labels?: string[]
  notes?: string
  language?: "ko" | "en" | "ja"
  difficulty?: 1 | 2 | 3 | 4 | 5
  recentMessages?: Array<{
    id: string
    conversationId: string
    status: string
    model?: string
    output: any
    temperature?: number
    usage: any
    metadata: any
    createdAt: string
  }>
}
```

#### Error Responses

- **400 Bad Request**: Invalid request format
  ```json
  {
    "error": "Invalid request",
    "details": "Error message"
  }
  ```

- **401 Unauthorized**: Missing or invalid token
  ```json
  {
    "error": "Unauthorized"
  }
  ```

- **403 Forbidden**: User doesn't own this session
  ```json
  {
    "error": "Forbidden"
  }
  ```

- **404 Not Found**: Session not found or pause failed
  ```json
  {
    "error": "Failed to pause interview"
  }
  ```

## Frontend Implementation Example

### Using Fetch API

```typescript
async function pauseInterview(sessionId: string, accessToken: string) {
  try {
    const response = await fetch(`/api/interviews/${sessionId}/pause`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to pause interview');
    }

    const updatedSession = await response.json();
    return updatedSession;
  } catch (error) {
    console.error('Error pausing interview:', error);
    throw error;
  }
}
```

### Using Axios

```typescript
import axios from 'axios';

async function pauseInterview(sessionId: string, accessToken: string) {
  try {
    const response = await axios.post(
      `/api/interviews/${sessionId}/pause`,
      {}, // Empty body
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || 'Failed to pause interview');
    }
    throw error;
  }
}
```

## UI/UX Considerations

1. **Button States**
   - Show a "Pause" button only when the interview status is "active"
   - Disable the button during the API call
   - Show loading state while the request is processing

2. **Success Feedback**
   - Display a success message when the interview is paused
   - Update the UI to reflect the paused status
   - Hide or disable interview interaction elements (answer input, submit button)
   - Show a "Resume" button to allow continuing the interview later

3. **Error Handling**
   - Display specific error messages based on the response
   - Allow retry on network errors
   - Redirect to login if 401 Unauthorized

4. **State Management**
   - Update the local interview session state to reflect the "paused" status
   - Persist the paused state in your state management solution (Redux, Context, etc.)
   - Update any interview list views to show the paused status

## Related Endpoints

- **Resume Interview**: `POST /interviews/:sessionId/resume` - To resume a paused interview
- **Get Session**: `GET /interviews/:sessionId` - To check current session status
- **List Sessions**: `GET /interviews?status=paused` - To get all paused interviews

## Notes

- An interview can only be paused if its current status is "active"
- Only the user who created the interview session can pause it
- The conversation history is preserved when paused
- Users can resume the interview at any time using the resume endpoint