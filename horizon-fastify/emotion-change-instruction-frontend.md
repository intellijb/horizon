# Emotion Tracking in Interview Responses - Frontend Integration Guide

## Overview
The interview API now returns the interviewer's emotional state with each response, allowing the frontend to display dynamic emotional feedback during the interview session.

## API Changes

### 1. POST `/interviews/:sessionId/answer`
**Response Schema Update:**
```typescript
{
  message: string;
  session: InterviewSession;
  emotion: string; // NEW: Single word describing interviewer's emotional state
}
```

**Emotion Values:**
- `engaged` - Interviewer is interested and actively participating
- `satisfied` - Content with the answer quality
- `concerned` - Some issues with the response
- `encouraging` - Supportive, helping the candidate
- `curious` - Wants to explore further
- `impressed` - Exceptional answer
- `patient` - Taking time to guide
- `neutral` - Default/baseline state
- `frustrated` - Multiple incorrect attempts
- `disappointed` - Below expectations

### 2. GET `/interviews/:sessionId`
**Response Schema Update - recentMessages:**
```typescript
{
  // ... other session fields
  recentMessages?: Array<{
    id: string;
    conversationId: string;
    status: string;
    model?: string;
    input?: any; // User's input message
    output: any;
    temperature?: number;
    usage: any;
    metadata: any;
    emotion?: string; // NEW: Emotion for this message
    cleanMessage?: string | null; // NEW: Message without emotion tags
    createdAt: string;
  }>
}
```

## Frontend Implementation Suggestions

### 1. Emotion Display Component
```tsx
// Example React component
const InterviewerEmotion = ({ emotion }: { emotion: string }) => {
  const emotionConfig = {
    engaged: { icon: "😊", color: "green" },
    satisfied: { icon: "😌", color: "blue" },
    concerned: { icon: "🤔", color: "orange" },
    encouraging: { icon: "💪", color: "cyan" },
    curious: { icon: "🧐", color: "purple" },
    impressed: { icon: "🤩", color: "gold" },
    patient: { icon: "🙂", color: "lightblue" },
    neutral: { icon: "😐", color: "gray" },
    frustrated: { icon: "😤", color: "red" },
    disappointed: { icon: "😕", color: "darkgray" }
  };

  const config = emotionConfig[emotion] || emotionConfig.neutral;

  return (
    <div className="interviewer-emotion">
      <span className="emotion-icon">{config.icon}</span>
      <span className="emotion-text" style={{ color: config.color }}>
        {emotion}
      </span>
    </div>
  );
};
```

### 2. Avatar Mood Integration
Update the interviewer avatar to reflect emotional state:
```tsx
// Animate avatar based on emotion
const InterviewerAvatar = ({ avatarUrl, emotion }) => {
  const getAvatarClass = (emotion: string) => {
    switch(emotion) {
      case 'impressed': return 'avatar-bounce';
      case 'concerned': return 'avatar-tilt';
      case 'frustrated': return 'avatar-shake';
      default: return '';
    }
  };

  return (
    <img
      src={avatarUrl}
      className={`interviewer-avatar ${getAvatarClass(emotion)}`}
      alt="Interviewer"
    />
  );
};
```

### 3. Conversation History with Emotions
Display emotion indicators in message history:
```tsx
const MessageHistory = ({ messages }) => {
  return (
    <div className="message-history">
      {messages.map(msg => (
        <div key={msg.id} className="message">
          {msg.cleanMessage && (
            <div className="assistant-message">
              <span>{msg.cleanMessage}</span>
              {msg.emotion && (
                <span className="emotion-badge">{msg.emotion}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

### 4. Real-time Emotion Tracking
Track emotion progression throughout the interview:
```tsx
const useEmotionTracking = () => {
  const [emotionHistory, setEmotionHistory] = useState<string[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');

  const updateEmotion = (newEmotion: string) => {
    setCurrentEmotion(newEmotion);
    setEmotionHistory(prev => [...prev, newEmotion]);
  };

  const getEmotionTrend = () => {
    // Analyze emotion history to show if interview is going well
    const positiveEmotions = ['engaged', 'satisfied', 'impressed', 'curious'];
    const positiveCount = emotionHistory.filter(e =>
      positiveEmotions.includes(e)
    ).length;

    return positiveCount / emotionHistory.length > 0.6 ? 'positive' : 'needs-improvement';
  };

  return { currentEmotion, emotionHistory, updateEmotion, getEmotionTrend };
};
```

## Usage Example

```tsx
const InterviewSession = () => {
  const [session, setSession] = useState(null);
  const { currentEmotion, updateEmotion } = useEmotionTracking();

  const handleAnswer = async (message: string) => {
    const response = await fetch(`/interviews/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ message }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    // Update UI with new emotion
    updateEmotion(data.emotion);

    // Update session and display response
    setSession(data.session);
    displayMessage(data.message);
  };

  return (
    <div className="interview-container">
      <InterviewerAvatar
        avatarUrl={session?.interviewer?.avatarUrl}
        emotion={currentEmotion}
      />
      <InterviewerEmotion emotion={currentEmotion} />
      {/* Rest of interview UI */}
    </div>
  );
};
```

## Benefits for Users

1. **Real-time Feedback**: Users can gauge how well their answers are being received
2. **Engagement Indicator**: Visual cues help maintain interview momentum
3. **Performance Insight**: Track emotional progression to understand interview performance
4. **Personalized Experience**: Makes the AI interviewer feel more human-like
5. **Coaching Opportunity**: Emotions like "concerned" or "patient" signal areas for improvement

## Notes

- The `cleanMessage` field provides the interviewer's response without any internal emotion tags
- Emotion defaults to "neutral" if not explicitly set by the AI
- Use emotion data to enhance UX but don't make it the sole focus
- Consider adding subtle animations or color changes rather than dramatic effects
- Store emotion history for post-interview analysis and feedback