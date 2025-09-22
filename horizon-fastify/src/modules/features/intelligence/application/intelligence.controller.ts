import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "@modules/platform/database/schema"
import { IntelligenceService } from "../business/intelligence.service"
import { DrizzleIntelligenceRepository } from "../extensions/repository"
import { ControllerResult } from "@modules/platform/fastify"
import { ConversationService } from "@modules/platform/openai/business/conversation.service"
import {
  PersonaConfig,
  MessageRole,
  CreateResponseParams,
  ConversationItem,
  MessageType,
} from "@modules/platform/openai/domain"
import { INTELLIGENCE_CONSTANTS, IntelligenceErrors } from "../constants"

export interface CreateChatSessionRequest {
  topicId: string
  persona?: {
    name: string
    instructions?: string
    role?: "system" | "developer"
  }
  initialMessage?: string
  metadata?: Record<string, string>
}

export interface SendMessageRequest {
  topicId: string
  conversationId: string
  message: string
  temperature?: number
}

export interface ChatSessionResponse {
  topicId: string
  conversationId: string
  message?: string
}

export interface MessageResponse {
  message: string
  conversationId: string
  topicId: string
  timestamp: string
}

export class IntelligenceController {
  private intelligenceService: IntelligenceService
  private conversationService: ConversationService

  constructor(private db: NodePgDatabase<typeof schema>) {
    const repository = new DrizzleIntelligenceRepository(db)
    this.intelligenceService = new IntelligenceService(repository)
    this.conversationService = new ConversationService(db)
  }

  // Topic Management
  async createTopic(id: string): Promise<ControllerResult> {
    try {
      const topic = await this.intelligenceService.createTopic(id)
      return { statusCode: 201, data: topic }
    } catch (error) {
      if (error.message === IntelligenceErrors.TOPIC_ALREADY_EXISTS) {
        return { statusCode: 409, error: error.message }
      }
      return { statusCode: 500, error: error.message }
    }
  }

  async getTopic(id: string): Promise<ControllerResult> {
    try {
      const topic = await this.intelligenceService.getTopic(id)
      return { statusCode: 200, data: topic }
    } catch (error) {
      if (error.message === IntelligenceErrors.TOPIC_NOT_FOUND) {
        return { statusCode: 404, error: error.message }
      }
      return { statusCode: 500, error: error.message }
    }
  }

  async getAllTopics(): Promise<ControllerResult> {
    const topics = await this.intelligenceService.getAllTopics()
    return { statusCode: 200, data: topics }
  }

  async deleteTopic(id: string): Promise<ControllerResult> {
    try {
      await this.intelligenceService.deleteTopic(id)
      return { statusCode: 204, data: null }
    } catch (error) {
      if (error.message === IntelligenceErrors.TOPIC_NOT_FOUND) {
        return { statusCode: 404, error: error.message }
      }
      return { statusCode: 500, error: error.message }
    }
  }

  // Chat Session Management
  async createChatSession(request: CreateChatSessionRequest): Promise<ControllerResult> {
    try {
      // Verify topic exists
      const topic = await this.intelligenceService.getTopic(request.topicId)
      if (!topic) {
        return { statusCode: 404, error: IntelligenceErrors.TOPIC_NOT_FOUND }
      }

      // Prepare persona configuration
      const personaConfig: PersonaConfig | undefined = request.persona ? {
        persona: request.persona.name,
        instructions: request.persona.instructions,
        role: request.persona.role === "developer" ? MessageRole.DEVELOPER : MessageRole.SYSTEM,
      } : undefined

      // Create conversation with initial context
      const conversationItems: ConversationItem[] = []

      // Add persona if provided
      if (personaConfig) {
        conversationItems.push({
          content: personaConfig.instructions
            ? `You are ${personaConfig.persona}. ${personaConfig.instructions}`
            : `You are ${personaConfig.persona}`,
          role: personaConfig.role,
          type: MessageType.MESSAGE,
        })
      }

      // Add initial message if provided
      if (request.initialMessage) {
        conversationItems.push({
          content: request.initialMessage,
          role: MessageRole.USER,
          type: MessageType.MESSAGE,
        })
      }

      // Create the conversation
      const conversationResponse = await this.conversationService.create(
        {
          items: conversationItems.length > 0 ? conversationItems : undefined,
          metadata: {
            topicId: request.topicId,
            ...request.metadata,
          },
        }
      )

      // Link conversation to topic
      await this.intelligenceService.linkConversation(
        request.topicId,
        conversationResponse.id,
        INTELLIGENCE_CONSTANTS.DEFAULT_PROVIDER
      )

      // Generate initial response if initial message was provided
      let initialResponse: string | undefined
      if (request.initialMessage) {
        const response = await this.conversationService.createResponse({
          conversation: conversationResponse.id,
          input: request.initialMessage,
          temperature: 0.7,
        })

        // Extract message from response
        if (response.apiResponse) {
          const apiResp = response.apiResponse as any
          initialResponse = apiResp.output?.content ||
                           apiResp.output?.[0]?.content ||
                           apiResp.content ||
                           apiResp.message ||
                           ""
        } else if (response.dbRecord) {
          const dbRec = response.dbRecord as any
          if (dbRec.output && Array.isArray(dbRec.output)) {
            const messageItem = dbRec.output.find(
              (item: any) => item.type === "message" && item.role === "assistant"
            )
            if (messageItem && messageItem.content) {
              if (Array.isArray(messageItem.content)) {
                initialResponse = messageItem.content
                  .filter((item: any) => item.text)
                  .map((item: any) => item.text)
                  .join("\n")
              } else if (typeof messageItem.content === "string") {
                initialResponse = messageItem.content
              }
            }
          }
        }
      }

      const response: ChatSessionResponse = {
        topicId: request.topicId,
        conversationId: conversationResponse.id,
        message: initialResponse,
      }

      return { statusCode: 201, data: response }
    } catch (error) {
      return { statusCode: 500, error: error.message }
    }
  }

  async sendMessage(request: SendMessageRequest): Promise<ControllerResult> {
    try {
      // Verify topic exists
      const topic = await this.intelligenceService.getTopic(request.topicId)
      if (!topic) {
        return { statusCode: 404, error: IntelligenceErrors.TOPIC_NOT_FOUND }
      }

      // Verify conversation is linked to topic
      const conversations = await this.intelligenceService.getTopicConversations(request.topicId)
      const conversationExists = conversations.some(c => c.conversationId === request.conversationId)
      if (!conversationExists) {
        return { statusCode: 404, error: "Conversation not found for this topic" }
      }

      // Create response parameters
      const responseParams: CreateResponseParams = {
        conversation: request.conversationId,
        input: request.message,
        temperature: request.temperature ?? 0.7,
        stream: false,
      }

      // Get response from OpenAI
      const response = await this.conversationService.createResponse(responseParams)

      // Extract assistant message
      let assistantMessage = ""
      if (response.dbRecord && response.dbRecord.output) {
        const output = response.dbRecord.output
        if (Array.isArray(output)) {
          const messageItem = output.find(
            (item: any) => item.type === "message" && item.role === "assistant"
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
        }
      }

      // Fallback to apiResponse if needed
      if (!assistantMessage && response.apiResponse) {
        const apiResp = response.apiResponse as any
        assistantMessage = apiResp.output?.content ||
                          apiResp.output?.[0]?.content ||
                          apiResp.content ||
                          apiResp.message ||
                          "Failed to get response"
      }

      const messageResponse: MessageResponse = {
        message: assistantMessage,
        conversationId: request.conversationId,
        topicId: request.topicId,
        timestamp: new Date().toISOString(),
      }

      return { statusCode: 200, data: messageResponse }
    } catch (error) {
      return { statusCode: 500, error: error.message }
    }
  }

  async getConversationHistory(topicId: string, conversationId: string): Promise<ControllerResult> {
    try {
      // Verify topic and conversation
      const topic = await this.intelligenceService.getTopic(topicId)
      if (!topic) {
        return { statusCode: 404, error: IntelligenceErrors.TOPIC_NOT_FOUND }
      }

      const conversations = await this.intelligenceService.getTopicConversations(topicId)
      const conversationExists = conversations.some(c => c.conversationId === conversationId)
      if (!conversationExists) {
        return { statusCode: 404, error: "Conversation not found for this topic" }
      }

      // Get messages from conversation
      const messages = await this.conversationService.getMessages(conversationId)

      return { statusCode: 200, data: { topicId, conversationId, messages } }
    } catch (error) {
      return { statusCode: 500, error: error.message }
    }
  }

  async getTopicConversations(topicId: string): Promise<ControllerResult> {
    try {
      const conversations = await this.intelligenceService.getTopicConversations(topicId)
      return { statusCode: 200, data: conversations }
    } catch (error) {
      if (error.message === IntelligenceErrors.TOPIC_NOT_FOUND) {
        return { statusCode: 404, error: error.message }
      }
      return { statusCode: 500, error: error.message }
    }
  }

  // Schema Management
  async defineSchema(
    topicId: string,
    columnName: string,
    columnType: string,
    columnDescription?: string
  ): Promise<ControllerResult> {
    try {
      const schema = await this.intelligenceService.defineSchema(
        topicId,
        columnName,
        columnType,
        columnDescription
      )
      return { statusCode: 201, data: schema }
    } catch (error) {
      if (error.message === IntelligenceErrors.TOPIC_NOT_FOUND) {
        return { statusCode: 404, error: error.message }
      }
      return { statusCode: 500, error: error.message }
    }
  }

  async getTopicSchema(topicId: string): Promise<ControllerResult> {
    try {
      const schema = await this.intelligenceService.getTopicSchema(topicId)
      return { statusCode: 200, data: schema }
    } catch (error) {
      if (error.message === IntelligenceErrors.TOPIC_NOT_FOUND) {
        return { statusCode: 404, error: error.message }
      }
      return { statusCode: 500, error: error.message }
    }
  }

  // Input Management
  async addInput(
    topicId: string,
    data: Record<string, any>,
    status?: "active" | "archived" | "deleted"
  ): Promise<ControllerResult> {
    try {
      const input = await this.intelligenceService.addInput(topicId, data, status)
      return { statusCode: 201, data: input }
    } catch (error) {
      if (error.message === IntelligenceErrors.TOPIC_NOT_FOUND) {
        return { statusCode: 404, error: error.message }
      }
      if (error.message.includes(IntelligenceErrors.INPUT_VALIDATION_FAILED)) {
        return { statusCode: 400, error: error.message }
      }
      return { statusCode: 500, error: error.message }
    }
  }

  async getTopicInputs(
    topicId: string,
    status?: "active" | "archived" | "deleted"
  ): Promise<ControllerResult> {
    try {
      const inputs = await this.intelligenceService.getTopicInputs(topicId, status)
      return { statusCode: 200, data: inputs }
    } catch (error) {
      if (error.message === IntelligenceErrors.TOPIC_NOT_FOUND) {
        return { statusCode: 404, error: error.message }
      }
      return { statusCode: 500, error: error.message }
    }
  }

  // Note Management
  async addNote(topicId: string, note: string): Promise<ControllerResult> {
    try {
      const noteRecord = await this.intelligenceService.addNote(topicId, note)
      return { statusCode: 201, data: noteRecord }
    } catch (error) {
      if (error.message === IntelligenceErrors.TOPIC_NOT_FOUND) {
        return { statusCode: 404, error: error.message }
      }
      return { statusCode: 500, error: error.message }
    }
  }

  async getTopicNotes(topicId: string): Promise<ControllerResult> {
    try {
      const notes = await this.intelligenceService.getTopicNotes(topicId)
      return { statusCode: 200, data: notes }
    } catch (error) {
      if (error.message === IntelligenceErrors.TOPIC_NOT_FOUND) {
        return { statusCode: 404, error: error.message }
      }
      return { statusCode: 500, error: error.message }
    }
  }
}