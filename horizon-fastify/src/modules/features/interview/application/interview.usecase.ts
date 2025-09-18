import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@modules/platform/database/schema";
import { SessionService } from "../business/session.service";
import { InterviewerService } from "../business/interviewer.service";
import { TopicService } from "../business/topic.service";
import { CategoryService } from "../business/category.service";
import { ConversationService } from "@modules/platform/openai/business/conversation.service";
import { MODEL_CONFIG } from "../constants/model";
import {
  PersonaConfig,
  MessageRole,
  CreateResponseParams,
  ConversationItem,
  MessageType,
} from "@modules/platform/openai/domain";
import { Session, Interviewer, Topic } from "../domain/types";
import {
  findBestPromptTemplate,
  getPromptTemplate,
  INTERVIEW_PROMPT_TEMPLATES,
  FORCE_KOREAN_LANGUAGE,
} from "../extensions/prompts";

export interface CreateInterviewRequest {
  userId: string;
  topicIds?: string[]; // Made optional to support custom topics from title
  title: string;
  language?: "ko" | "en" | "ja";
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

export interface CreateInterviewResponse {
  session: Session;
  interviewer: Interviewer;
  initialMessage: string;
}

export interface AnswerInterviewRequest {
  sessionId: string;
  message: string;
  temperature?: number;
}

export interface AnswerInterviewResponse {
  message: string;
  session: Session;
  emotion: string; // Single word describing interviewer's emotional state
}

export class InterviewUseCase {
  private sessionService: SessionService;
  private interviewerService: InterviewerService;
  private topicService: TopicService;
  private categoryService: CategoryService;
  private conversationService: ConversationService;

  constructor(private db: NodePgDatabase<typeof schema>) {
    this.sessionService = new SessionService(db);
    this.interviewerService = new InterviewerService(db);
    this.topicService = new TopicService(db);
    this.categoryService = new CategoryService(db);
    this.conversationService = new ConversationService(db);
  }

  async createInterview(
    request: CreateInterviewRequest
  ): Promise<CreateInterviewResponse> {
    // 1. Handle topics - either from topicIds or use title directly
    let topics: Topic[] = [];
    let topicNames: string[] = [];

    if (request.topicIds && request.topicIds.length > 0) {
      // Use provided topicIds
      topics = await this.topicService.getTopicsByIds(request.topicIds);
      topicNames = topics.map((t) => t.name);
    } else {
      // No topics provided - AI will use the title directly for context
      // Create minimal topic objects for compatibility with existing code
      const now = new Date().toISOString();
      topics = [{
        id: "custom-from-title",
        categoryId: "custom-category",
        name: "Custom Interview",
        description: `Interview based on: ${request.title}`,
        createdAt: now,
        updatedAt: now,
      }];
      topicNames = ["Custom Interview"];
    }

    // 2. Find or create the best interviewer persona based on topics
    const interviewer = await this.findOrCreateInterviewer(
      topics,
      request.language || "ko",
      request.difficulty || 3
    );

    // 3. Get the prompt template for this interviewer
    const promptTemplate = interviewer.promptTemplateId
      ? getPromptTemplate(parseInt(interviewer.promptTemplateId))
      : findBestPromptTemplate(topicNames);

    if (!promptTemplate) {
      throw new Error("No suitable prompt template found");
    }

    // 4. Prepare context for persona to generate questions
    const difficulty = request.difficulty || 3;

    // 5. Create persona configuration with dynamic question generation
    const positionTitle = request.title || "Software Engineer";
    const systemInstructions = `${promptTemplate.systemPrompt}

CRITICAL INSTRUCTIONS:
- DEFAULT TO SINGLE SENTENCE RESPONSES (use 2 sentences only when absolutely necessary)
- End with a concise follow-up question
- Stay strictly within the assigned topics - NEVER drift to unrelated areas

INTERVIEW CONTEXT:
- Position/Role: ${positionTitle}
${request.topicIds && request.topicIds.length > 0 ? `- Topics to assess: ${topicNames.join(", ")}` : `- Focus Area: The title "${positionTitle}" defines the entire scope of this interview. Extract ALL relevant topics, technologies, and skills from this title and use them to guide your questions.`}
- Difficulty level: ${difficulty}/5
- Interviewer style: ${interviewer.style}
- Seniority level: ${interviewer.seniority}

IMPORTANT: ${request.topicIds && request.topicIds.length > 0
  ? `Focus on the specified topics (${topicNames.join(", ")}) while considering the ${positionTitle} role.`
  : `The title "${positionTitle}" is your ONLY guide. Parse it carefully to understand:
  - The role level (junior/senior/staff/etc.)
  - Required technologies and frameworks
  - Domain expertise needed
  - Any special focus areas mentioned
  Base ALL your questions on what's implied by this title.`}

Your first question should:
1. Be directly relevant to the ${positionTitle} role${request.topicIds && request.topicIds.length > 0 ? ` AND the topics: ${topicNames.join(", ")}` : " as described in the title"}
2. Match the difficulty level (${difficulty}/5)
3. Reflect your interviewer style (${interviewer.style})
4. Consider what's most important to evaluate for a ${positionTitle} position

Generate a question that naturally combines the position requirements with the topic focus.${
      FORCE_KOREAN_LANGUAGE
        ? "\n\n중요: 모든 대답은 반드시 한국어로 작성하세요."
        : ""
    }`;

    const personaConfig: PersonaConfig = {
      persona: interviewer.displayName,
      instructions: systemInstructions,
      role: MessageRole.SYSTEM,
    };

    // 6. Let the persona generate its own initial question based on context
    const initialMessage = FORCE_KOREAN_LANGUAGE
      ? `안녕하세요! ${positionTitle} 포지션의 ${topicNames.join(", ")} 역량을 평가하는 면접을 진행하겠습니다. 시작해볼까요?`
      : `Hello! Let's begin the interview for the ${positionTitle} position, focusing on ${topicNames.join(", ")}. Shall we start?`;

    // 7. Create conversation with OpenAI using the persona and selected question
    const conversationResponse =
      await this.conversationService.createWithMessages(
        initialMessage,
        personaConfig,
        undefined,
        {
          interviewerId: interviewer.id,
          positionTitle: positionTitle,
          language: request.language || "ko",
          difficulty: String(difficulty),
          topics: topicNames.join(","),
          interviewerStyle: interviewer.style || "structured",
        },
        request.userId
      );

    // 6. Create interview session
    const session = await this.sessionService.createSession({
      userId: request.userId,
      topicIds: request.topicIds || [], // Empty array if using custom topics from title
      title: request.title,
      interviewerId: interviewer.id,
      conversationId: conversationResponse.id,
      status: "active",
      progress: 0,
      score: 0,
      targetScore: 100,
      language: request.language || "ko",
      difficulty: request.difficulty || 3,
    });

    return {
      session,
      interviewer,
      initialMessage,
    };
  }

  async answerInterview(
    request: AnswerInterviewRequest
  ): Promise<AnswerInterviewResponse> {
    // 1. Get the session
    const session = await this.sessionService.getSession(request.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status !== "active") {
      throw new Error(
        `Session is not active. Current status: ${session.status}`
      );
    }

    if (!session.conversationId) {
      throw new Error("Session does not have an associated conversation");
    }

    // 2. Create conversation items with context-aware instructions
    const conversationItems: ConversationItem[] = [
      // System instructions for evaluating the answer
      {
        content: `ASSESSMENT INSTRUCTIONS:
- DEFAULT TO SINGLE SENTENCE RESPONSES unless absolutely necessary for clarity
- NEVER switch topic areas (e.g., from technical to leadership)
- Stay strictly within the current topic domain

FORMATTING RULES:
1. Wrap code examples with <code>{content}</code> tags
   - CRITICAL: Code MUST include proper language-specific indentation (2 or 4 spaces)
   - CRITICAL: Code MUST include proper line breaks for multiline examples
   - Use real, syntactically correct code with proper formatting
   - Example: <code>function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}</code>
2. Wrap important concepts or meaningful words with <cap>{word}</cap> tags
3. Keep sentences short for verbal conversation flow
4. If response is long, separate into multiple short sentences
5. Remember this is text for VERBAL conversation - avoid lengthy explanations
6. NEVER use backticks (\`) for code - ONLY use <code></code> tags with proper indentation

DECISION LOGIC:
1. If CORRECT: Single acknowledgment, then new question in SAME topic area.

2. If PARTIALLY CORRECT: One sentence on what's missing.

3. If INCORRECT: Single hint or simpler rephrasing.

EXAMPLES:
- "Great! Let's explore <cap>recursion</cap> next. How would you implement <code>fibonacci(n)</code>?"
- "Almost there. You need to handle the <cap>edge case</cap>. What if the array is empty?"
- "Let me rephrase. Think about <cap>time complexity</cap>. How many times does your loop execute?"

EMOTION TRACKING:
At the end of your response, add a special tag <emotion>{word}</emotion> with ONE word describing how you (the interviewer) feel about this conversation so far.
Choose from: engaged, satisfied, concerned, encouraging, curious, impressed, patient, neutral, frustrated, disappointed.
Example: "That's correct! <emotion>impressed</emotion>"

CRITICAL: Keep responses minimal, conversational, and topic-focused.`,
        role: MessageRole.SYSTEM,
        type: MessageType.MESSAGE,
      },
      // User's actual message
      {
        content: request.message,
        role: MessageRole.USER,
        type: MessageType.MESSAGE,
      },
    ];

    // 3. Create response parameters with enhanced context
    const responseParams: CreateResponseParams = {
      conversation: session.conversationId,
      input: conversationItems,
      temperature: request.temperature ?? 0.7,
      stream: false,
    };

    // 4. Get response from OpenAI
    const response = await this.conversationService.createResponse(
      responseParams,
      session.userId
    );

    // 5. Extract the assistant's message from the response
    let assistantMessage = "";

    // The actual message content is in dbRecord.output
    if (response.dbRecord && response.dbRecord.output) {
      const output = response.dbRecord.output;

      // Handle array of response items (OpenAI's structured format)
      if (Array.isArray(output)) {
        // Find the message item (type: 'message' with role: 'assistant')
        const messageItem = output.find(
          (item: any) => item.type === "message" && item.role === "assistant"
        );

        if (messageItem && messageItem.content) {
          // Extract text from the content array
          if (Array.isArray(messageItem.content)) {
            assistantMessage = messageItem.content
              .filter((item: any) => item.text)
              .map((item: any) => item.text)
              .join("\n");
          } else if (typeof messageItem.content === "string") {
            assistantMessage = messageItem.content;
          }
        }

        // Removed fallback - the message should always be in the 'message' type item
      } else if (typeof output === "string") {
        assistantMessage = output;
      } else if (output && typeof output === "object") {
        // Handle object format
        if (output.text) {
          assistantMessage = output.text;
        } else if (output.content) {
          assistantMessage = output.content;
        }
      }
    }

    // Fallback to checking apiResponse if dbRecord doesn't have the message
    if (
      !assistantMessage &&
      response.apiResponse &&
      typeof response.apiResponse === "object"
    ) {
      const apiResponse = response.apiResponse as any;
      if (apiResponse.output) {
        if (Array.isArray(apiResponse.output)) {
          // Try same extraction logic as above
          const messageItem = apiResponse.output.find(
            (item: any) => item.type === "message" && item.role === "assistant"
          );

          if (messageItem && messageItem.content) {
            if (Array.isArray(messageItem.content)) {
              assistantMessage = messageItem.content
                .filter((item: any) => item.text)
                .map((item: any) => item.text)
                .join("\n");
            } else if (typeof messageItem.content === "string") {
              assistantMessage = messageItem.content;
            }
          }
        } else if (typeof apiResponse.output === "string") {
          assistantMessage = apiResponse.output;
        }
      }
    }

    // 5. Extract emotion from the message
    let emotion = "neutral"; // Default emotion
    let cleanedMessage = assistantMessage;

    // Extract emotion tag if present
    const emotionMatch = assistantMessage.match(/<emotion>([^<]+)<\/emotion>/);
    if (emotionMatch) {
      emotion = emotionMatch[1].trim().toLowerCase();
      // Remove the emotion tag from the message
      cleanedMessage = assistantMessage.replace(/<emotion>[^<]+<\/emotion>/g, "").trim();
    }

    // 6. Store emotion in response metadata for future retrieval
    // Note: The emotion is stored in the message that was just created
    // This will be accessible when calling getRecentMessages
    if (response.dbRecord && response.dbRecord.metadata) {
      (response.dbRecord.metadata as any).emotion = emotion;
    }

    // 7. Update session progress and last interaction
    const updatedSession = await this.sessionService.updateSession(session.id, {
      lastInteractionAt: new Date().toISOString(),
      progress: Math.min(session.progress + 10, 100), // Increment progress by 10% per interaction
    });

    if (!updatedSession) {
      throw new Error("Failed to update session");
    }

    if (!assistantMessage) {
      console.error("Failed to extract message from OpenAI response:", {
        hasDbRecord: !!response.dbRecord,
        dbRecordOutput: response.dbRecord?.output,
        hasApiResponse: !!response.apiResponse,
      });
      throw new Error("Failed to get response from AI. Please try again.");
    }

    return {
      message: cleanedMessage,
      session: updatedSession,
      emotion,
    };
  }

  private async findOrCreateInterviewer(
    topics: Topic[],
    language: "ko" | "en" | "ja",
    difficulty: number
  ): Promise<Interviewer> {
    // For MVP, we'll create predefined interviewers based on topic categories
    // First, try to find an existing interviewer that matches

    const topicNames = topics.map((t) => t.name.toLowerCase());
    const topicIds = topics.map((t) => t.id);

    // Check for existing interviewers that match these topics
    const existingInterviewers =
      await this.interviewerService.getInterviewersByTopics(topicIds);

    if (existingInterviewers.length > 0) {
      // Return the first matching interviewer
      return existingInterviewers[0];
    }

    // If no existing interviewer, create one based on the topics
    // Determine the type coverage based on topics
    const typeCoverage: ("tech" | "leadership" | "behavioral")[] = [];

    // Analyze topic names to determine coverage
    const techKeywords = [
      "system",
      "design",
      "frontend",
      "backend",
      "algorithm",
      "data",
      "code",
      "api",
      "database",
      "cloud",
    ];
    const leadershipKeywords = [
      "lead",
      "manage",
      "team",
      "project",
      "strategy",
      "mentor",
      "coach",
    ];
    const behavioralKeywords = [
      "communication",
      "conflict",
      "culture",
      "collaboration",
      "feedback",
    ];

    if (
      topicNames.some((name) =>
        techKeywords.some((keyword) => name.includes(keyword))
      )
    ) {
      typeCoverage.push("tech");
    }
    if (
      topicNames.some((name) =>
        leadershipKeywords.some((keyword) => name.includes(keyword))
      )
    ) {
      typeCoverage.push("leadership");
    }
    if (
      topicNames.some((name) =>
        behavioralKeywords.some((keyword) => name.includes(keyword))
      )
    ) {
      typeCoverage.push("behavioral");
    }

    // Default to tech if no matches
    if (typeCoverage.length === 0) {
      typeCoverage.push("tech");
    }

    // Find the best prompt template
    const promptTemplate = findBestPromptTemplate(topicNames);

    // Create a new interviewer
    const newInterviewer = await this.interviewerService.createInterviewer({
      displayName: promptTemplate.name,
      company: "Tech Company",
      role: typeCoverage.includes("leadership") ? "EM" : "SWE",
      seniority:
        difficulty >= 4 ? "senior" : difficulty >= 3 ? "mid" : "junior",
      typeCoverage,
      topicIds,
      style: promptTemplate.style as any,
      difficulty: difficulty as 1 | 2 | 3 | 4 | 5,
      language,
      promptTemplateId: String(promptTemplate.id),
      knowledgeScope: {
        usesCompanyTrends: false,
        refreshPolicy: "manual",
      },
    });

    return newInterviewer;
  }

  async completeInterview(
    sessionId: string,
    finalScore?: number
  ): Promise<Session | null> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Calculate final score if not provided (simplified scoring)
    const calculatedScore = finalScore ?? Math.min(session.progress, 85);

    return this.sessionService.completeSession(sessionId, calculatedScore);
  }

  async pauseInterview(sessionId: string): Promise<Session | null> {
    return this.sessionService.pauseSession(sessionId);
  }

  async resumeInterview(sessionId: string): Promise<Session | null> {
    return this.sessionService.resumeSession(sessionId);
  }

  async getInterviewHistory(sessionId: string) {
    const session = await this.sessionService.getSession(sessionId);
    if (!session || !session.conversationId) {
      throw new Error("Session or conversation not found");
    }

    const messages = await this.conversationService.getMessages(
      session.conversationId
    );

    // Convert Date objects to ISO strings for serialization
    const formattedMessages = messages.map((msg) => ({
      ...msg,
      createdAt:
        msg.createdAt instanceof Date
          ? msg.createdAt.toISOString()
          : msg.createdAt,
    }));

    return {
      session,
      messages: formattedMessages,
    };
  }

  async getRecentMessages(conversationId: string, limit: number = 10) {
    // Get raw message records from the database
    const messages = await this.conversationService.getMessageRecords(
      conversationId,
      limit
    );

    // Map to the expected format for the response schema, including input field and emotion
    return messages.map((msg) => {
      // Extract emotion from metadata if present
      const metadata = msg.metadata || {};
      const emotion = (metadata as any).emotion || "neutral";

      // Extract clean message from output if it contains assistant response
      let cleanMessage: string | null = null;
      if (msg.output && Array.isArray(msg.output)) {
        const assistantItem = msg.output.find(
          (item: any) => item.type === "message" && item.role === "assistant"
        );
        if (assistantItem && assistantItem.content) {
          if (Array.isArray(assistantItem.content)) {
            cleanMessage = assistantItem.content
              .filter((item: any) => item.text)
              .map((item: any) => item.text)
              .join("\n");
          } else if (typeof assistantItem.content === "string") {
            cleanMessage = assistantItem.content;
          }
          // Remove emotion tags if any exist in the stored message
          if (cleanMessage) {
            cleanMessage = cleanMessage.replace(/<emotion>[^<]+<\/emotion>/g, "").trim();
          }
        }
      }

      return {
        id: msg.id,
        conversationId: msg.conversationId,
        status: msg.status || "completed",
        model: msg.model || MODEL_CONFIG.DEFAULT_MODEL,
        input: msg.input || null, // Include the user's input
        output: msg.output || [],
        temperature: msg.temperature || 0.7,
        usage: msg.usage || {},
        metadata: msg.metadata || {},
        emotion, // Include emotion for each message
        cleanMessage, // Include clean message without emotion tags
        createdAt:
          msg.createdAt instanceof Date
            ? msg.createdAt.toISOString()
            : msg.createdAt || new Date().toISOString(),
      };
    });
  }

  // Removed getPreviousQuestionIds - no longer needed with dynamic question generation
  // The persona now generates contextually appropriate questions based on topics and interviewer style

}
