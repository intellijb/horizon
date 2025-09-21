# Change Answer Interview for Frontend - API Specification

## Overview
This document specifies the changes made to the `answerInterview` API endpoint to include emotional state tracking of the interviewer persona during technical interview conversations.

## API Response Changes

### Previous Response Structure
```typescript
interface AnswerInterviewResponse {
  message: string;
  session: Session;
}
```

### Updated Response Structure
```typescript
interface AnswerInterviewResponse {
  message: string;      // AI response with formatting tags (cleaned)
  session: Session;     // Updated session information
  emotion: string;      // Single word emotional state
}
```

### Recent Messages Structure
The `recentMessages` array returned in session details now includes emotion for each message:
```typescript
interface RecentMessage {
  id: string;
  conversationId: string;
  status: string;
  model: string;
  input: any | null;           // User's input message
  output: any[];               // Raw AI response
  temperature: number;
  usage: object;
  metadata: object;
  emotion: string;             // Emotional state for this message
  cleanMessage: string | null; // Clean message without emotion tags
  createdAt: string;
}
```

## Emotion Field Specification

### Purpose
The `emotion` field provides real-time feedback about how the AI interviewer "feels" about the conversation progress, helping create a more engaging and realistic interview experience.

### Available Emotions
The interviewer can express the following emotional states:
- `engaged` - Actively interested in the candidate's responses
- `satisfied` - Content with the progress being made
- `concerned` - Worried about understanding or performance
- `encouraging` - Supportive and motivating
- `curious` - Interested to learn more
- `impressed` - Positively surprised by the answer
- `patient` - Calmly waiting for improvement
- `neutral` - Default state, no strong emotion
- `frustrated` - Struggling with repeated issues
- `disappointed` - Expected better performance

### Implementation Details

#### Backend Processing
1. The AI generates responses with an embedded `<emotion>` tag
2. The backend extracts the emotion value from the response
3. The emotion tag is removed from the message before sending to frontend
4. Default emotion is `"neutral"` if no tag is present

#### Example AI Response (Internal)
```
That's an excellent observation about time complexity! <emotion>impressed</emotion>
```

#### API Response to Frontend
```json
{
  "message": "That's an excellent observation about time complexity!",
  "emotion": "impressed",
  "session": {
    "id": "session-123",
    "status": "active",
    "progress": 40,
    // ... other session fields
  }
}
```

## Frontend Implementation Guidelines

### 1. Emotion Display Options

#### Visual Indicators
- **Emoji Mapping**: Display corresponding emoji for each emotion
  ```javascript
  const emotionEmojis = {
    engaged: "😊",
    satisfied: "😌",
    concerned: "😟",
    encouraging: "💪",
    curious: "🤔",
    impressed: "😮",
    patient: "🙂",
    neutral: "😐",
    frustrated: "😤",
    disappointed: "😔"
  };
  ```

- **Color Coding**: Apply subtle color hints
  ```javascript
  const emotionColors = {
    engaged: "#4CAF50",      // Green
    satisfied: "#8BC34A",    // Light Green
    concerned: "#FF9800",    // Orange
    encouraging: "#03A9F4",  // Light Blue
    curious: "#9C27B0",      // Purple
    impressed: "#FFC107",    // Amber
    patient: "#00BCD4",      // Cyan
    neutral: "#9E9E9E",      // Grey
    frustrated: "#F44336",   // Red
    disappointed: "#FF5722"  // Deep Orange
  };
  ```

#### Animation Effects
- Subtle fade-in/fade-out when emotion changes
- Optional pulsing effect for strong emotions (impressed, frustrated)

### 2. UI Components

#### Emotion Badge Component
```jsx
<EmotionBadge emotion={response.emotion}>
  <EmotionIcon /> {response.emotion}
</EmotionBadge>
```

#### Interviewer Avatar State
Update interviewer avatar expression based on emotion:
```jsx
<InterviewerAvatar emotion={response.emotion} />
```

#### Progress Bar Enhancement
Color-code progress bar based on cumulative emotional state

### 3. User Experience Considerations

#### Emotion History
- Track emotion changes throughout the interview
- Display emotion timeline or trend graph
- Calculate overall interview sentiment

#### Adaptive Responses
- Adjust UI tone based on emotion
- Show encouraging messages when emotion is negative
- Celebrate when emotion is positive

#### Accessibility
- Provide text descriptions for emotion states
- Ensure color coding has sufficient contrast
- Include ARIA labels for screen readers

### 4. Example Frontend Implementation

```typescript
interface InterviewResponse {
  message: string;
  emotion: string;
  session: Session;
}

const InterviewComponent: React.FC = () => {
  const [currentEmotion, setCurrentEmotion] = useState<string>("neutral");
  const [emotionHistory, setEmotionHistory] = useState<string[]>([]);

  const handleAnswerSubmit = async (answer: string) => {
    const response: InterviewResponse = await api.answerInterview({
      sessionId: currentSession.id,
      message: answer
    });

    // Update emotion state
    setCurrentEmotion(response.emotion);
    setEmotionHistory(prev => [...prev, response.emotion]);

    // Display formatted message
    renderFormattedMessage(response.message);

    // Update session
    updateSession(response.session);

    // Show emotion indicator
    showEmotionFeedback(response.emotion);
  };

  const showEmotionFeedback = (emotion: string) => {
    // Visual feedback based on emotion
    if (["impressed", "satisfied", "engaged"].includes(emotion)) {
      showPositiveFeedback();
    } else if (["concerned", "frustrated", "disappointed"].includes(emotion)) {
      showConstructiveFeedback();
    }
  };

  return (
    <div className="interview-container">
      <InterviewerSection>
        <InterviewerAvatar emotion={currentEmotion} />
        <EmotionIndicator emotion={currentEmotion} />
        <MessageBubble content={formattedMessage} />
      </InterviewerSection>

      <EmotionTimeline history={emotionHistory} />

      <CandidateInput onSubmit={handleAnswerSubmit} />
    </div>
  );
};
```

## Testing Scenarios

### Emotion Triggers
Test that appropriate emotions are returned for:
1. **Correct Answers** → `impressed`, `satisfied`, `engaged`
2. **Partial Answers** → `encouraging`, `patient`, `curious`
3. **Incorrect Answers** → `concerned`, `patient`
4. **Repeated Mistakes** → `frustrated`, `disappointed`
5. **Great Insights** → `impressed`, `engaged`
6. **Off-topic Responses** → `concerned`, `neutral`

### Edge Cases
- Missing emotion field → Default to `"neutral"`
- Invalid emotion value → Default to `"neutral"`
- Network errors → Maintain previous emotion state

## Migration Notes

### Backward Compatibility
- Frontend should handle responses without `emotion` field
- Use default value `"neutral"` for missing emotions
- Existing session functionality remains unchanged

### Rollout Strategy
1. Deploy backend changes first
2. Frontend gracefully handles both old and new response formats
3. Once stable, frontend can fully utilize emotion features

## Performance Considerations

- Emotion extraction is done server-side (minimal overhead)
- No additional API calls required
- Emotion state is lightweight (single string)
- Consider caching emotion assets (emojis, icons) on frontend

## Security Considerations

- Emotion values are sanitized server-side
- Limited to predefined emotion set
- No user input can directly affect emotion value
- Emotion history should be session-scoped

## Metrics and Analytics

Track the following for improving interview experience:
- Distribution of emotions per interview
- Correlation between emotions and interview outcomes
- User engagement based on emotion feedback
- Session completion rates by emotion patterns

## Future Enhancements

1. **Multi-emotion Support**: Express complex emotional states
2. **Emotion Intensity**: Add intensity levels (slightly, very, extremely)
3. **Cultural Adaptation**: Adjust emotions based on user preferences
4. **Voice Synthesis**: Map emotions to voice tone for audio interviews
5. **Personalization**: Learn optimal emotional responses per user