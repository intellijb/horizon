# Custom Topic Feature - Frontend Implementation Instructions

## Overview
The backend now supports creating interviews where the AI interviewer directly uses the interview title to understand what to assess, without needing predefined topics. When no `topicIds` are provided, the AI interviewer will parse and understand the title to conduct a relevant interview.

## API Changes

### Create Interview Endpoint
**POST** `/api/interviews`

#### Request Body Changes
- `topicIds` is now **optional** (previously required)
- If `topicIds` is not provided or is an empty array, the AI will use the `title` field to determine what to assess

#### Request Examples

**Option 1: Using existing topics (traditional way)**
```json
{
  "topicIds": ["uuid1", "uuid2"],
  "title": "Senior Frontend Engineer Interview",
  "language": "en",
  "difficulty": 4
}
```

**Option 2: Title-based interview (new feature)**
```json
{
  "title": "Senior React Developer with System Design Focus",
  "language": "en",
  "difficulty": 4
}
```

In Option 2, the AI interviewer will:
- Understand that this is for a Senior React Developer position
- Focus on React-specific questions and best practices
- Include system design questions appropriate for a senior level
- Adjust complexity based on the seniority implied in the title

## Frontend Implementation Guide

### 1. Update Interview Creation Form

#### Current Implementation (if applicable)
```typescript
interface CreateInterviewRequest {
  topicIds: string[];  // Currently required
  title: string;
  language?: "ko" | "en" | "ja";
  difficulty?: 1 | 2 | 3 | 4 | 5;
}
```

#### New Implementation
```typescript
interface CreateInterviewRequest {
  topicIds?: string[];  // Now optional
  title: string;
  language?: "ko" | "en" | "ja";
  difficulty?: 1 | 2 | 3 | 4 | 5;
}
```

### 2. UI/UX Recommendations

#### Option A: Simplified Single Input
Create a streamlined experience where users only need to enter a title:

```tsx
// Example React component
const InterviewCreator = () => {
  const [title, setTitle] = useState("");
  const [useCustomTopics, setUseCustomTopics] = useState(true);

  const handleSubmit = async () => {
    const request = {
      title,
      // Don't send topicIds if using custom topics
      ...(useCustomTopics ? {} : { topicIds: selectedTopicIds }),
      language: selectedLanguage,
      difficulty: selectedDifficulty
    };

    await createInterview(request);
  };

  return (
    <div>
      <input
        placeholder="e.g., 'Senior Full Stack Engineer with DevOps Experience'"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button onClick={() => setUseCustomTopics(!useCustomTopics)}>
        {useCustomTopics ? "Use Predefined Topics" : "Use Custom Topics"}
      </button>
    </div>
  );
};
```

#### Option B: Progressive Disclosure
Show topic selection as an optional advanced feature:

```tsx
const InterviewCreator = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div>
      <input
        placeholder="Describe the position and skills to assess"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        helperText="The AI will understand your role description and ask relevant questions"
      />

      <button onClick={() => setShowAdvanced(!showAdvanced)}>
        Advanced Options
      </button>

      {showAdvanced && (
        <TopicSelector
          optional={true}
          helperText="Leave empty to let AI determine topics from title"
        />
      )}
    </div>
  );
};
```

### 3. Title Input Guidelines

Provide helper text or examples to guide users on effective titles:

```tsx
const titleExamples = [
  "Senior Backend Engineer - Microservices and Kubernetes",
  "Full Stack Developer with React and Node.js Experience",
  "Machine Learning Engineer - Computer Vision Focus",
  "DevOps Engineer - AWS and CI/CD Pipeline Expert",
  "Frontend Developer - React, TypeScript, and Testing",
];

const TitleHelper = () => (
  <div className="helper-text">
    <p>Tips for effective titles:</p>
    <ul>
      <li>Include the role level (Junior, Senior, Staff, etc.)</li>
      <li>Mention specific technologies or frameworks</li>
      <li>Add focus areas or specializations</li>
    </ul>
    <details>
      <summary>See examples</summary>
      {titleExamples.map((example) => (
        <div key={example} className="example-title">
          "{example}"
        </div>
      ))}
    </details>
  </div>
);
```

### 4. Title Preview and Guidance

Show users how the AI will interpret their title:

```tsx
const TitleInterpretationPreview = ({ title }: { title: string }) => {
  if (!title) return null;

  return (
    <div className="title-interpretation">
      <p className="helper-text">
        The AI interviewer will conduct an interview based on:
        <strong>"{title}"</strong>
      </p>
      <p className="subtitle">
        The AI will automatically understand the role, required skills,
        and appropriate question depth from your title.
      </p>
    </div>
  );
};
```

### 5. Form Validation

Update validation logic to handle optional topicIds:

```typescript
const validateInterviewForm = (data: CreateInterviewRequest): string[] => {
  const errors: string[] = [];

  // Title is always required
  if (!data.title || data.title.trim().length === 0) {
    errors.push("Title is required");
  }

  // Title length validation
  if (data.title && data.title.length > 200) {
    errors.push("Title must be 200 characters or less");
  }

  // TopicIds validation only if provided
  if (data.topicIds && data.topicIds.length === 0) {
    errors.push("If specifying topics, at least one must be selected");
  }

  return errors;
};
```

## How Title-Based Interviews Work

When no `topicIds` are provided, the AI interviewer directly interprets the title to understand:

### What the AI Extracts from Titles

1. **Role Level**
   - Junior, Mid, Senior, Staff, Principal, Lead, Architect
   - Adjusts question complexity and expectations accordingly

2. **Technical Domain**
   - Frontend (React, Vue, Angular, etc.)
   - Backend (Node.js, Python, Java, etc.)
   - Full Stack, DevOps, Data, ML, etc.

3. **Specific Technologies**
   - Frameworks mentioned (React, Spring, Django)
   - Tools and platforms (AWS, Kubernetes, Docker)
   - Databases (PostgreSQL, MongoDB, Redis)

4. **Special Focus Areas**
   - System Design, Architecture, Scalability
   - Performance Optimization
   - Security, Testing, CI/CD
   - Team Leadership, Mentoring

### Examples of AI Understanding

| Title | AI Understanding |
|-------|------------------|
| "Senior React Developer" | React expertise, modern frontend practices, some system design, potential mentoring |
| "Full Stack Engineer - Node.js & AWS" | Both frontend and backend, Node.js focus, AWS cloud services, deployment |
| "Staff Software Architect - Microservices" | High-level design, microservices patterns, distributed systems, technical leadership |
| "ML Engineer - Computer Vision" | Machine learning fundamentals, computer vision specifics, Python, deep learning frameworks |

## Migration Guide

### For Existing Implementations

1. **Update TypeScript interfaces** to make `topicIds` optional
2. **Add UI toggle** to let users choose between predefined topics or title-based
3. **Update form validation** to allow empty `topicIds`
4. **Add title helper text** to guide users on effective title writing
5. **Consider adding preview** to show how AI interprets the title

### Backward Compatibility
- Existing functionality with `topicIds` continues to work exactly as before
- The API is fully backward compatible
- You can gradually roll out the new feature with feature flags

## Testing Recommendations

### Test Cases

1. **Title-based interview**
   ```javascript
   // Test: Title with multiple technologies
   await createInterview({
     title: "Senior Full Stack Engineer - React, Node.js, AWS",
     language: "en",
     difficulty: 4
   });
   // AI should ask about: React patterns, Node.js best practices,
   // AWS services, system design, and senior-level topics
   ```

2. **Traditional topic selection**
   ```javascript
   // Test: Using predefined topicIds
   await createInterview({
     topicIds: ["uuid1", "uuid2"],
     title: "Software Engineer Interview",
     language: "en",
     difficulty: 3
   });
   // Should use the provided topicIds
   ```

3. **Edge cases**
   ```javascript
   // Test: Generic title
   await createInterview({
     title: "Software Engineer",
     language: "en",
     difficulty: 3
   });
   // AI should ask general software engineering questions
   // at medium difficulty level
   ```

## Benefits for Users

1. **Faster interview creation** - No need to browse and select topics
2. **Unlimited flexibility** - Any role, technology, or skill combination can be assessed
3. **Intelligent understanding** - AI interprets context and nuance from the title
4. **Natural language** - Describe the role exactly as you would in a job posting

## Example User Flow

1. User clicks "Create Interview"
2. User types: "Senior DevOps Engineer with Kubernetes and AWS expertise"
3. System shows preview: "The AI will conduct a senior-level DevOps interview focusing on Kubernetes and AWS"
4. User adjusts difficulty and language if needed
5. User clicks "Start Interview"
6. AI interviewer begins with questions specifically about Kubernetes orchestration, AWS services, and senior DevOps practices

## Support and Troubleshooting

### Common Issues

**Q: How does the AI understand what to ask from just a title?**
A: The AI is trained to parse job titles and understand the implied skills, technologies, and seniority levels. It then generates appropriate questions based on this understanding.

**Q: Can I combine title-based and predefined topics?**
A: Currently, it's either/or. If you provide `topicIds`, those will be used. If not, the AI uses the title to guide the interview.

**Q: Will the AI ask about technologies not mentioned in my title?**
A: The AI primarily focuses on what's mentioned or implied in your title. For a comprehensive interview, be specific in your title about the areas you want to assess.

## Best Practices

1. **Be Specific**: Include technologies, frameworks, and focus areas
   - Good: "Senior React Developer with TypeScript and Redux"
   - Less effective: "Frontend Developer"

2. **Include Seniority**: Helps AI calibrate question difficulty
   - "Junior Python Developer"
   - "Staff Software Architect"

3. **Mention Specializations**: Guides the interview focus
   - "DevOps Engineer - Kubernetes and GitOps"
   - "Backend Engineer - Distributed Systems and Kafka"

4. **Use Industry Terms**: AI understands common job titles
   - "Full Stack Engineer"
   - "Site Reliability Engineer"
   - "Solutions Architect"