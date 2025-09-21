# GetSession API - Enhanced with Persona Information

## Overview
The `getSession` endpoint now returns comprehensive persona (interviewer) information with human-like characteristics including avatars, personality traits, and personalized greetings.

## Endpoint
```
GET /interview/session/:sessionId
Authorization: Bearer <token>
```

## Enhanced Response Structure

```typescript
interface GetSessionResponse {
  statusCode: 200;
  data: {
    // Existing session fields
    id: string;
    userId: string;
    topicIds: string[];
    topicLabels?: string[];
    title: string;
    progress: number;
    score: number;
    targetScore?: number;
    createdAt: string;
    lastInteractionAt?: string;
    interviewerId: string;
    conversationId?: string;
    status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
    language: 'ko' | 'en' | 'ja';
    difficulty?: 1 | 2 | 3 | 4 | 5;

    // NEW: Enhanced interviewer persona
    interviewer: {
      // Original fields
      id: string;
      displayName: string;          // e.g., "Google Senior Engineer"
      company?: string;              // e.g., "Google"
      role?: string;                 // e.g., "SWE", "EM", "TL"
      seniority?: 'junior' | 'mid' | 'senior' | 'staff' | 'principal';
      typeCoverage: ('tech' | 'leadership' | 'behavioral')[];
      topicIds: string[];
      style?: 'friendly' | 'socratic' | 'bar-raiser' | 'structured' | 'conversational';
      difficulty?: 1 | 2 | 3 | 4 | 5;

      // NEW: Human-like enhancements
      avatarUrl: string;             // Dynamic avatar URL from DiceBear
      personality: string[];         // Array of personality traits
      greeting: string;              // Personalized greeting message
    } | null;

    // Optional: Recent messages if conversation exists
    recentMessages?: Array<{
      id: string;
      conversationId: string;
      status: string;
      model: string;
      input: any;
      output: any[];
      temperature: number;
      usage: any;
      metadata: any;
      createdAt: string;
    }>;
  }
}
```

## Avatar URL Generation
Avatars are dynamically generated using DiceBear API:
- Base URL: `https://api.dicebear.com/7.x/{style}/svg`
- Style varies by interviewer personality:
  - `lorelei` style for friendly interviewers
  - `notionists` style for other styles
- Each interviewer gets a consistent avatar based on their ID
- Avatars include soft background colors for a professional look

## Personality Traits by Style

```javascript
{
  'friendly': ['encouraging', 'patient', 'supportive', 'approachable'],
  'socratic': ['analytical', 'thought-provoking', 'methodical', 'insightful'],
  'bar-raiser': ['rigorous', 'detail-oriented', 'high-standards', 'thorough'],
  'structured': ['organized', 'systematic', 'clear', 'logical'],
  'conversational': ['engaging', 'natural', 'relaxed', 'adaptive']
}
```

## Personalized Greetings by Style

```javascript
{
  'friendly': "Hi there! I'm excited to chat with you today.",
  'socratic': "Let's explore your thinking together.",
  'bar-raiser': "I look forward to diving deep into your expertise.",
  'structured': "Let's begin our structured interview session.",
  'conversational': "Great to meet you! Let's have a conversation."
}
```

## Frontend Implementation Example

### React Component Example

```tsx
interface InterviewerPersona {
  avatarUrl: string;
  displayName: string;
  company?: string;
  role?: string;
  personality: string[];
  greeting: string;
  style?: string;
}

const InterviewerCard: React.FC<{ interviewer: InterviewerPersona }> = ({ interviewer }) => {
  return (
    <div className="interviewer-card">
      <img
        src={interviewer.avatarUrl}
        alt={interviewer.displayName}
        className="avatar"
      />
      <div className="info">
        <h3>{interviewer.displayName}</h3>
        {interviewer.company && (
          <p className="company">{interviewer.role} at {interviewer.company}</p>
        )}
        <p className="greeting">{interviewer.greeting}</p>
        <div className="personality-traits">
          {interviewer.personality.map(trait => (
            <span key={trait} className="trait-badge">{trait}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Fetching Session with Persona

```typescript
async function fetchSessionWithPersona(sessionId: string, token: string) {
  const response = await fetch(`/api/interview/session/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (data.statusCode === 200 && data.data.interviewer) {
    // Display interviewer persona
    renderInterviewerCard(data.data.interviewer);

    // Show recent messages if available
    if (data.data.recentMessages) {
      renderConversation(data.data.recentMessages);
    }
  }
}
```

## UI/UX Recommendations

1. **Avatar Display**
   - Display avatar prominently at 60-80px size in the interview interface
   - Use the avatar in message bubbles for interviewer responses
   - Consider adding subtle animation when interviewer is "thinking"

2. **Personality Traits**
   - Show as badges or chips near the interviewer info
   - Use colors that match the interview style (e.g., warm colors for friendly, cool for analytical)

3. **Greeting Usage**
   - Display as the first message when entering an interview session
   - Can be shown in a special styled message bubble

4. **Responsive Design**
   - On mobile: Stack avatar above interviewer info
   - On desktop: Side-by-side layout with larger avatar

## Benefits for Frontend

1. **Humanization**: Makes the AI interviewer feel more personable and less robotic
2. **Visual Identity**: Each interviewer has a unique, consistent avatar
3. **Expectation Setting**: Personality traits and greeting help users understand the interview style
4. **Engagement**: Visual elements and personality increase user engagement
5. **Consistency**: Avatar persists across sessions with the same interviewer

## Migration Notes

- The `interviewer` field is nullable for backward compatibility
- If `interviewer` is null, display a default avatar and generic interviewer info
- The `recentMessages` field is optional and only present if conversation exists
- All avatar URLs are served over HTTPS and are CORS-enabled

## Error Handling

```typescript
// Handle missing interviewer gracefully
const displayInterviewer = data.interviewer || {
  displayName: "Interview Assistant",
  avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=default",
  personality: ["professional", "helpful"],
  greeting: "Welcome to your interview session."
};
```
