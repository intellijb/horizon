import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "@modules/platform/database/schema"
import { SessionService } from "../business/session.service"
import { InterviewerService } from "../business/interviewer.service"
import { TopicService } from "../business/topic.service"
import { CategoryService } from "../business/category.service"
import { ConversationService } from "@modules/platform/openai/business/conversation.service"
import { PersonaConfig, MessageRole, CreateResponseParams } from "@modules/platform/openai/domain"
import { Session, Interviewer, Topic } from "../domain/types"
import { findBestPromptTemplate, getPromptTemplate, INTERVIEW_PROMPT_TEMPLATES } from "../extensions/prompts"

export interface CreateInterviewRequest {
  userId: string
  topicIds: string[]
  title: string
  language?: "ko" | "en" | "ja"
  difficulty?: 1 | 2 | 3 | 4 | 5
}

export interface CreateInterviewResponse {
  session: Session
  interviewer: Interviewer
  initialMessage: string
}

export interface AnswerInterviewRequest {
  sessionId: string
  message: string
  temperature?: number
}

export interface AnswerInterviewResponse {
  message: string
  session: Session
}

export class InterviewUseCase {
  private sessionService: SessionService
  private interviewerService: InterviewerService
  private topicService: TopicService
  private categoryService: CategoryService
  private conversationService: ConversationService

  constructor(private db: NodePgDatabase<typeof schema>) {
    this.sessionService = new SessionService(db)
    this.interviewerService = new InterviewerService(db)
    this.topicService = new TopicService(db)
    this.categoryService = new CategoryService(db)
    this.conversationService = new ConversationService(db)
  }

  async createInterview(request: CreateInterviewRequest): Promise<CreateInterviewResponse> {
    // 1. Get topics to understand what the interview is about
    const topics = await this.topicService.getTopicsByIds(request.topicIds)

    // 2. Find or create the best interviewer persona based on topics
    const interviewer = await this.findOrCreateInterviewer(
      topics,
      request.language || "ko",
      request.difficulty || 3
    )

    // 3. Get the prompt template for this interviewer
    const promptTemplate = interviewer.promptTemplateId
      ? getPromptTemplate(parseInt(interviewer.promptTemplateId))
      : findBestPromptTemplate(topics.map(t => t.name))

    if (!promptTemplate) {
      throw new Error("No suitable prompt template found")
    }

    // 4. Create persona configuration for OpenAI
    const personaConfig: PersonaConfig = {
      persona: interviewer.displayName,
      instructions: promptTemplate.systemPrompt,
      role: MessageRole.SYSTEM
    }

    // 5. Create conversation with OpenAI using the persona
    const conversationResponse = await this.conversationService.createWithMessages(
      promptTemplate.initialMessage,
      personaConfig,
      undefined,
      {
        interviewerId: interviewer.id,
        language: request.language || "ko",
        difficulty: String(request.difficulty || 3),
      },
      request.userId
    )

    // 6. Create interview session
    const session = await this.sessionService.createSession({
      userId: request.userId,
      topicIds: request.topicIds,
      title: request.title,
      interviewerId: interviewer.id,
      conversationId: conversationResponse.id,
      status: "active",
      progress: 0,
      score: 0,
      targetScore: 100,
      language: request.language || "ko",
      difficulty: request.difficulty || 3,
    })

    return {
      session,
      interviewer,
      initialMessage: promptTemplate.initialMessage,
    }
  }

  async answerInterview(request: AnswerInterviewRequest): Promise<AnswerInterviewResponse> {
    // 1. Get the session
    const session = await this.sessionService.getSession(request.sessionId)
    if (!session) {
      throw new Error("Session not found")
    }

    if (session.status !== "active") {
      throw new Error(`Session is not active. Current status: ${session.status}`)
    }

    if (!session.conversationId) {
      throw new Error("Session does not have an associated conversation")
    }

    // 2. Create response parameters with user message as input
    const responseParams: CreateResponseParams = {
      conversation: session.conversationId,
      input: request.message,
      temperature: request.temperature ?? 0.7,
      stream: false,
    }

    // 3. Get response from OpenAI
    const response = await this.conversationService.createResponse(responseParams, session.userId)

    // 4. Extract the assistant's message from the response
    let assistantMessage = ""

    // The actual message content is in dbRecord.output
    if (response.dbRecord && response.dbRecord.output) {
      const output = response.dbRecord.output

      // Handle array of response items (OpenAI's structured format)
      if (Array.isArray(output)) {
        // Find the message item (type: 'message' with role: 'assistant')
        const messageItem = output.find((item: any) =>
          item.type === 'message' && item.role === 'assistant'
        )

        if (messageItem && messageItem.content) {
          // Extract text from the content array
          if (Array.isArray(messageItem.content)) {
            assistantMessage = messageItem.content
              .filter((item: any) => item.text)
              .map((item: any) => item.text)
              .join("\n")
          } else if (typeof messageItem.content === "string") {
            assistantMessage = messageItem.content
          }
        }

        // Removed fallback - the message should always be in the 'message' type item
      } else if (typeof output === "string") {
        assistantMessage = output
      } else if (output && typeof output === "object") {
        // Handle object format
        if (output.text) {
          assistantMessage = output.text
        } else if (output.content) {
          assistantMessage = output.content
        }
      }
    }

    // Fallback to checking apiResponse if dbRecord doesn't have the message
    if (!assistantMessage && response.apiResponse && typeof response.apiResponse === "object") {
      const apiResponse = response.apiResponse as any
      if (apiResponse.output) {
        if (Array.isArray(apiResponse.output)) {
          // Try same extraction logic as above
          const messageItem = apiResponse.output.find((item: any) =>
            item.type === 'message' && item.role === 'assistant'
          )

          if (messageItem && messageItem.content) {
            if (Array.isArray(messageItem.content)) {
              assistantMessage = messageItem.content
                .filter((item: any) => item.text)
                .map((item: any) => item.text)
                .join("\n")
            } else if (typeof messageItem.content === "string") {
              assistantMessage = messageItem.content
            }
          }
        } else if (typeof apiResponse.output === "string") {
          assistantMessage = apiResponse.output
        }
      }
    }

    // 5. Update session progress and last interaction
    const updatedSession = await this.sessionService.updateSession(session.id, {
      lastInteractionAt: new Date().toISOString(),
      progress: Math.min(session.progress + 10, 100), // Increment progress by 10% per interaction
    })

    if (!updatedSession) {
      throw new Error("Failed to update session")
    }

    if (!assistantMessage) {
      console.error("Failed to extract message from OpenAI response:", {
        hasDbRecord: !!response.dbRecord,
        dbRecordOutput: response.dbRecord?.output,
        hasApiResponse: !!response.apiResponse,
      })
      throw new Error("Failed to get response from AI. Please try again.")
    }

    return {
      message: assistantMessage,
      session: updatedSession,
    }
  }

  private async findOrCreateInterviewer(
    topics: Topic[],
    language: "ko" | "en" | "ja",
    difficulty: number
  ): Promise<Interviewer> {
    // For MVP, we'll create predefined interviewers based on topic categories
    // First, try to find an existing interviewer that matches

    const topicNames = topics.map(t => t.name.toLowerCase())
    const topicIds = topics.map(t => t.id)

    // Check for existing interviewers that match these topics
    const existingInterviewers = await this.interviewerService.getInterviewersByTopics(topicIds)

    if (existingInterviewers.length > 0) {
      // Return the first matching interviewer
      return existingInterviewers[0]
    }

    // If no existing interviewer, create one based on the topics
    // Determine the type coverage based on topics
    const typeCoverage: ("tech" | "leadership" | "behavioral")[] = []

    // Analyze topic names to determine coverage
    const techKeywords = ["system", "design", "frontend", "backend", "algorithm", "data", "code", "api", "database", "cloud"]
    const leadershipKeywords = ["lead", "manage", "team", "project", "strategy", "mentor", "coach"]
    const behavioralKeywords = ["communication", "conflict", "culture", "collaboration", "feedback"]

    if (topicNames.some(name => techKeywords.some(keyword => name.includes(keyword)))) {
      typeCoverage.push("tech")
    }
    if (topicNames.some(name => leadershipKeywords.some(keyword => name.includes(keyword)))) {
      typeCoverage.push("leadership")
    }
    if (topicNames.some(name => behavioralKeywords.some(keyword => name.includes(keyword)))) {
      typeCoverage.push("behavioral")
    }

    // Default to tech if no matches
    if (typeCoverage.length === 0) {
      typeCoverage.push("tech")
    }

    // Find the best prompt template
    const promptTemplate = findBestPromptTemplate(topicNames)

    // Create a new interviewer
    const newInterviewer = await this.interviewerService.createInterviewer({
      displayName: promptTemplate.name,
      company: "Tech Company",
      role: typeCoverage.includes("leadership") ? "EM" : "SWE",
      seniority: difficulty >= 4 ? "senior" : difficulty >= 3 ? "mid" : "junior",
      typeCoverage,
      topicIds,
      style: promptTemplate.style as any,
      difficulty: difficulty as (1 | 2 | 3 | 4 | 5),
      language,
      promptTemplateId: String(promptTemplate.id),
      knowledgeScope: {
        usesCompanyTrends: false,
        refreshPolicy: "manual",
      },
    })

    return newInterviewer
  }

  async completeInterview(sessionId: string, finalScore?: number): Promise<Session | null> {
    const session = await this.sessionService.getSession(sessionId)
    if (!session) {
      throw new Error("Session not found")
    }

    // Calculate final score if not provided (simplified scoring)
    const calculatedScore = finalScore ?? Math.min(session.progress, 85)

    return this.sessionService.completeSession(sessionId, calculatedScore)
  }

  async pauseInterview(sessionId: string): Promise<Session | null> {
    return this.sessionService.pauseSession(sessionId)
  }

  async resumeInterview(sessionId: string): Promise<Session | null> {
    return this.sessionService.resumeSession(sessionId)
  }

  async getInterviewHistory(sessionId: string) {
    const session = await this.sessionService.getSession(sessionId)
    if (!session || !session.conversationId) {
      throw new Error("Session or conversation not found")
    }

    const messages = await this.conversationService.getMessages(session.conversationId)

    return {
      session,
      messages,
    }
  }
}