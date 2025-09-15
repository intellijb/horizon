import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "@modules/platform/database/schema"
import { InterviewUseCase } from "./interview.usecase"
import { SessionService } from "../business/session.service"
import { InterviewerService } from "../business/interviewer.service"
import { CategoryService } from "../business/category.service"
import { TopicService } from "../business/topic.service"
import { ControllerResult } from "@modules/platform/fastify"
import { TokenService } from "@modules/features/auth/business/token.service"
import {
  CreateInterviewBody,
  AnswerInterviewBody,
  CompleteInterviewBody,
  ListInterviewsQuery,
  ListCategoriesQuery,
  ListTopicsQuery,
  ListInterviewersQuery,
} from "../domain/route-types"

export class InterviewController {
  private interviewUseCase: InterviewUseCase
  private sessionService: SessionService
  private interviewerService: InterviewerService
  private categoryService: CategoryService
  private topicService: TopicService
  private tokenService: TokenService

  constructor(private db: NodePgDatabase<typeof schema>) {
    this.interviewUseCase = new InterviewUseCase(db)
    this.sessionService = new SessionService(db)
    this.interviewerService = new InterviewerService(db)
    this.categoryService = new CategoryService(db)
    this.topicService = new TopicService(db)
    this.tokenService = new TokenService()
  }

  // Interview session operations
  async createInterview(body: CreateInterviewBody, token: string): Promise<ControllerResult> {
    const payload = this.tokenService.verifyAccessToken(token)
    const data = await this.interviewUseCase.createInterview({
      userId: payload.userId,
      topicIds: body.topicIds,
      title: body.title,
      language: body.language,
      difficulty: body.difficulty,
    })
    return { statusCode: 201, data }
  }

  async answerInterview(sessionId: string, body: AnswerInterviewBody, token: string): Promise<ControllerResult> {
    // Verify user owns this session
    const payload = this.tokenService.verifyAccessToken(token)
    const session = await this.sessionService.getSession(sessionId)
    if (!session || session.userId !== payload.userId) {
      return { statusCode: 403, error: "Forbidden" }
    }
    const data = await this.interviewUseCase.answerInterview({
      sessionId,
      message: body.message,
      temperature: body.temperature,
    })
    return { statusCode: 200, data }
  }

  async completeInterview(sessionId: string, body: CompleteInterviewBody, token: string): Promise<ControllerResult> {
    // Verify user owns this session
    const payload = this.tokenService.verifyAccessToken(token)
    const existingSession = await this.sessionService.getSession(sessionId)
    if (!existingSession || existingSession.userId !== payload.userId) {
      return { statusCode: 403, error: "Forbidden" }
    }
    const session = await this.interviewUseCase.completeInterview(
      sessionId,
      body.finalScore
    )
    if (!session) {
      return { statusCode: 404, error: "Failed to complete interview" }
    }
    return { statusCode: 200, data: session }
  }

  async pauseInterview(sessionId: string, token: string): Promise<ControllerResult> {
    // Verify user owns this session
    const payload = this.tokenService.verifyAccessToken(token)
    const existingSession = await this.sessionService.getSession(sessionId)
    if (!existingSession || existingSession.userId !== payload.userId) {
      return { statusCode: 403, error: "Forbidden" }
    }
    const session = await this.interviewUseCase.pauseInterview(sessionId)
    if (!session) {
      return { statusCode: 404, error: "Failed to pause interview" }
    }
    return { statusCode: 200, data: session }
  }

  async resumeInterview(sessionId: string, token: string): Promise<ControllerResult> {
    // Verify user owns this session
    const payload = this.tokenService.verifyAccessToken(token)
    const existingSession = await this.sessionService.getSession(sessionId)
    if (!existingSession || existingSession.userId !== payload.userId) {
      return { statusCode: 403, error: "Forbidden" }
    }
    const session = await this.interviewUseCase.resumeInterview(sessionId)
    if (!session) {
      return { statusCode: 404, error: "Failed to resume interview" }
    }
    return { statusCode: 200, data: session }
  }

  async getInterviewHistory(sessionId: string, token: string): Promise<ControllerResult> {
    // Verify user owns this session
    const payload = this.tokenService.verifyAccessToken(token)
    const session = await this.sessionService.getSession(sessionId)
    if (!session || session.userId !== payload.userId) {
      return { statusCode: 403, error: "Forbidden" }
    }
    const data = await this.interviewUseCase.getInterviewHistory(sessionId)
    return { statusCode: 200, data }
  }

  async getSession(sessionId: string, token: string): Promise<ControllerResult> {
    // Verify user owns this session
    const payload = this.tokenService.verifyAccessToken(token)
    const session = await this.sessionService.getSession(sessionId)
    if (!session) {
      return { statusCode: 404, error: "Session not found" }
    }
    if (session.userId !== payload.userId) {
      return { statusCode: 403, error: "Forbidden" }
    }

    // Include recent messages if conversation exists
    let sessionWithMessages = { ...session }
    if (session.conversationId) {
      try {
        const messages = await this.interviewUseCase.getRecentMessages(session.conversationId, 10)
        sessionWithMessages = { ...session, recentMessages: messages }
      } catch (error) {
        // If messages fail to load, still return the session
        console.error("Failed to load recent messages:", error)
      }
    }

    return { statusCode: 200, data: sessionWithMessages }
  }

  async listSessions(query: ListInterviewsQuery, token: string): Promise<ControllerResult> {
    // Filter sessions by current user
    const payload = this.tokenService.verifyAccessToken(token)
    const data = await this.sessionService.listSessions({
      userId: payload.userId,
      status: query.status,
      interviewerId: query.interviewerId,
      language: query.language,
    })
    return { statusCode: 200, data }
  }

  // Category operations
  async listCategories(query: ListCategoriesQuery): Promise<ControllerResult> {
    const data = await this.categoryService.listCategories({
      type: query.type,
    })
    return { statusCode: 200, data }
  }

  async listCategoriesWithTopics(query: ListCategoriesQuery): Promise<ControllerResult> {
    const data = await this.categoryService.listCategoriesWithTopics({
      type: query.type,
    })
    return { statusCode: 200, data }
  }

  async getCategory(id: string): Promise<ControllerResult> {
    const category = await this.categoryService.getCategory(id)
    if (!category) {
      return { statusCode: 404, error: "Category not found" }
    }
    return { statusCode: 200, data: category }
  }

  async getCategoryWithTopics(id: string): Promise<ControllerResult> {
    const category = await this.categoryService.getCategoryWithTopics(id)
    if (!category) {
      return { statusCode: 404, error: "Category not found" }
    }
    return { statusCode: 200, data: category }
  }

  // Topic operations
  async listTopics(query: ListTopicsQuery): Promise<ControllerResult> {
    const filters: any = {
      categoryId: query.categoryId,
      difficulty: query.difficulty,
    }

    if (query.tags) {
      filters.tags = query.tags.split(",").map(t => t.trim())
    }

    const data = await this.topicService.listTopics(filters)
    return { statusCode: 200, data }
  }

  async getTopic(id: string): Promise<ControllerResult> {
    const topic = await this.topicService.getTopic(id)
    if (!topic) {
      return { statusCode: 404, error: "Topic not found" }
    }
    return { statusCode: 200, data: topic }
  }

  async searchTopics(searchTerm: string): Promise<ControllerResult> {
    const data = await this.topicService.searchTopics(searchTerm)
    return { statusCode: 200, data }
  }

  // Interviewer operations
  async listInterviewers(query: ListInterviewersQuery): Promise<ControllerResult> {
    const data = await this.interviewerService.listInterviewers({
      company: query.company,
      role: query.role,
      seniority: query.seniority,
      difficulty: query.difficulty,
      language: query.language,
    })
    return { statusCode: 200, data }
  }

  async getInterviewer(id: string): Promise<ControllerResult> {
    const interviewer = await this.interviewerService.getInterviewer(id)
    if (!interviewer) {
      return { statusCode: 404, error: "Interviewer not found" }
    }
    return { statusCode: 200, data: interviewer }
  }

  async searchInterviewers(searchTerm: string): Promise<ControllerResult> {
    const data = await this.interviewerService.searchInterviewers(searchTerm)
    return { statusCode: 200, data }
  }
}