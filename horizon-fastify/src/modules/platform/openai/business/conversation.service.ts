import { getDatabase } from "@modules/platform/database"
import { conversationsOpenai, conversationMessagesOpenai } from "../extensions/schema"
import { OpenAIConversationService } from "../extensions/conversation.api"
import { eq, desc, ne, and } from "drizzle-orm"
import {
  ConversationStatus,
  MessageStatus,
  MessageType,
  MessageRole,
  ConversationItem,
  CreateConversationParams,
  CreateResponseParams,
  PersonaConfig,
  MessageBuilder,
  MessageValidationResult,
  ConversationAnalysis,
  MessageHistoryItem
} from "../domain"
import {
  DEFAULTS,
  ERROR_MESSAGES
} from "../constants"


export class ConversationService {
  private apiService: OpenAIConversationService
  private db: any

  constructor(db?: any) {
    this.apiService = new OpenAIConversationService()
    this.db = db
  }

  private getDb() {
    if (!this.db) {
      this.db = getDatabase()
    }
    return this.db
  }

  /**
   * Create a user message
   */
  private createUserMessage(content: string | string[]): ConversationItem {
    return {
      content,
      role: MessageRole.USER,
      type: MessageType.MESSAGE,
    }
  }

  /**
   * Create a system message with persona/instructions
   */
  private createSystemMessage(content: string, instructions?: string): ConversationItem {
    const fullContent = instructions
      ? `${content}\n\nInstructions: ${instructions}`
      : content

    return {
      content: fullContent,
      role: MessageRole.SYSTEM,
      type: MessageType.MESSAGE,
    }
  }

  /**
   * Create a developer message (highest priority)
   */
  private createDeveloperMessage(content: string): ConversationItem {
    return {
      content,
      role: MessageRole.DEVELOPER,
      type: MessageType.MESSAGE,
    }
  }

  /**
   * Create an assistant message (for context/history)
   */
  private createAssistantMessage(content: string | string[]): ConversationItem {
    return {
      content,
      role: MessageRole.ASSISTANT,
      type: MessageType.MESSAGE,
    }
  }

  /**
   * Inject persona and instructions into conversation
   */
  injectPersona(persona: string, instructions?: string, isDeveloper = false): ConversationItem {
    if (isDeveloper) {
      const developerContent = instructions
        ? `Persona: ${persona}\n\nDeveloper Instructions: ${instructions}`
        : `Persona: ${persona}`
      return this.createDeveloperMessage(developerContent)
    }

    return this.createSystemMessage(`You are ${persona}`, instructions)
  }

  /**
   * Validate message items based on role hierarchy
   */
  private validateMessageItems(items: ConversationItem[]): MessageValidationResult {
    const errors: string[] = []

    if (items.length > DEFAULTS.MAX_CONVERSATION_ITEMS) {
      errors.push(`Maximum ${DEFAULTS.MAX_CONVERSATION_ITEMS} items allowed`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Create conversation with role-aware message building
   */
  async createWithMessages(
    userMessage: string | string[],
    persona?: PersonaConfig,
    context?: ConversationItem[],
    metadata?: Record<string, string>,
    userId?: string
  ) {
    const items: ConversationItem[] = []

    // Add persona if provided (system or developer level)
    if (persona) {
      items.push(this.injectPersona(
        persona.persona,
        persona.instructions,
        persona.role === MessageRole.DEVELOPER
      ))
    }

    // Add context messages if provided
    if (context) {
      items.push(...context)
    }

    // Add user message
    items.push(this.createUserMessage(userMessage))

    // Validate messages
    const validation = this.validateMessageItems(items)
    if (!validation.isValid) {
      throw new Error(`Message validation failed: ${validation.errors.join(', ')}`)
    }

    // Create the conversation with OpenAI
    const result = await this.create({ items, metadata }, userId)

    // Save the initial assistant message (userMessage) to the database
    // This is the persona-based initial message from the interviewer
    const initialMessageId = `msg_initial_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    await this.getDb()
      .insert(conversationMessagesOpenai)
      .values({
        id: initialMessageId,
        userId: userId || '00000000-0000-0000-0000-000000000000',
        conversationId: result.id,
        status: MessageStatus.COMPLETED,
        model: DEFAULTS.MODEL,
        input: null, // No user input for initial message
        output: [
          {
            type: MessageType.MESSAGE,
            role: MessageRole.ASSISTANT,
            content: Array.isArray(userMessage)
              ? userMessage.map(text => ({ text, type: "text" }))
              : [{ text: userMessage, type: "text" }]
          }
        ],
        temperature: 70,
        usage: DEFAULTS.METADATA,
        metadata: metadata || DEFAULTS.METADATA,
        createdAt: new Date(),
      })

    return result
  }

  async create(params: CreateConversationParams, userId?: string) {
    // Call API to create conversation
    const apiResponse = await this.apiService.create(params)

    // Store in database
    const [conversation] = await this.getDb()
      .insert(conversationsOpenai)
      .values({
        id: apiResponse.id,
        userId: userId || '00000000-0000-0000-0000-000000000000', // Temporary default
        status: ConversationStatus.ACTIVE,
        metadata: params.metadata || DEFAULTS.METADATA,
        createdAt: new Date(),
      })
      .returning()

    return {
      ...apiResponse,
      dbRecord: conversation,
    }
  }

  async retrieve(conversationId: string) {
    // Get from database instead of API (as specified)
    const conversation = await this.getDb()
      .select()
      .from(conversationsOpenai)
      .where(eq(conversationsOpenai.id, conversationId))
      .limit(1)

    if (!conversation || conversation.length === 0) {
      throw new Error(ERROR_MESSAGES.CONVERSATION_NOT_FOUND(conversationId))
    }

    // Also get associated messages
    const messages = await this.getDb()
      .select()
      .from(conversationMessagesOpenai)
      .where(eq(conversationMessagesOpenai.conversationId, conversationId))

    return {
      conversation: conversation[0],
      messages,
    }
  }

  async delete(conversationId: string) {
    // Call API to delete conversation
    const apiResponse = await this.apiService.delete(conversationId)

    // Update database status to deleted
    const [updatedConversation] = await this.getDb()
      .update(conversationsOpenai)
      .set({
        status: ConversationStatus.DELETED,
      })
      .where(eq(conversationsOpenai.id, conversationId))
      .returning()

    return {
      ...apiResponse,
      dbRecord: updatedConversation,
    }
  }

  async createResponse(params: CreateResponseParams, userId?: string) {
    // First, store the user message with in_progress status
    const userMessageId = `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Store user message input in the database
    const [userMessageRecord] = await this.getDb()
      .insert(conversationMessagesOpenai)
      .values({
        id: userMessageId,
        userId: userId || '00000000-0000-0000-0000-000000000000',
        conversationId: params.conversation,
        status: MessageStatus.IN_PROGRESS,
        model: params.model || DEFAULTS.MODEL,
        input: {
          message: params.input || "",
          temperature: params.temperature,
          timestamp: new Date().toISOString(),
        },
        output: [], // Will be updated with response
        temperature: params.temperature ? Math.round(params.temperature * 100) : 70,
        usage: null,
        metadata: DEFAULTS.METADATA,
        createdAt: new Date(),
      })
      .returning()

    try {
      // Call API to create response
      const apiResponse = await this.apiService.createResponse(params)

      // Extract response data - API response structure may vary
      const responseData = apiResponse as any

      // Update the message record with the response
      const [updatedMessageRecord] = await this.getDb()
        .update(conversationMessagesOpenai)
        .set({
          status: responseData.status || MessageStatus.COMPLETED,
          output: responseData.output || responseData.content || [],
          usage: responseData.usage || DEFAULTS.METADATA,
        })
        .where(eq(conversationMessagesOpenai.id, userMessageId))
        .returning()

      return {
        apiResponse,
        dbRecord: updatedMessageRecord,
      }
    } catch (error) {
      // Update status to failed if API call fails
      await this.getDb()
        .update(conversationMessagesOpenai)
        .set({
          status: MessageStatus.FAILED,
          output: [{ error: error.message || "Failed to get response" }],
        })
        .where(eq(conversationMessagesOpenai.id, userMessageId))

      throw error
    }
  }

  async getMessages(conversationId: string) {
    const messages = await this.getDb()
      .select()
      .from(conversationMessagesOpenai)
      .where(eq(conversationMessagesOpenai.conversationId, conversationId))
      .orderBy(conversationMessagesOpenai.createdAt)

    // Format messages to include both user input and assistant output
    const formattedMessages: any[] = []

    messages.forEach((msg: any) => {
      // Add user message if available
      if (msg.input && msg.input.message) {
        formattedMessages.push({
          id: `${msg.id}_user`,
          conversationId: msg.conversationId,
          role: 'user',
          content: msg.input.message,
          timestamp: msg.input.timestamp || msg.createdAt,
          temperature: msg.input.temperature,
        })
      }

      // Add assistant message if available
      if (msg.output) {
        let assistantContent = ""

        // Extract assistant message content from various output formats
        if (Array.isArray(msg.output)) {
          const messageItem = msg.output.find((item: any) =>
            item.type === 'message' && item.role === 'assistant'
          )

          if (messageItem && messageItem.content) {
            if (Array.isArray(messageItem.content)) {
              assistantContent = messageItem.content
                .filter((item: any) => item.text)
                .map((item: any) => item.text)
                .join("\n")
            } else if (typeof messageItem.content === "string") {
              assistantContent = messageItem.content
            }
          }
        } else if (typeof msg.output === "string") {
          assistantContent = msg.output
        } else if (msg.output && typeof msg.output === "object") {
          if (msg.output.text) {
            assistantContent = msg.output.text
          } else if (msg.output.content) {
            assistantContent = msg.output.content
          }
        }

        if (assistantContent) {
          formattedMessages.push({
            id: `${msg.id}_assistant`,
            conversationId: msg.conversationId,
            role: 'assistant',
            content: assistantContent,
            timestamp: msg.createdAt,
            model: msg.model,
            usage: msg.usage,
          })
        }
      }
    })

    return formattedMessages
  }

  async getMessageRecords(conversationId: string, limit?: number) {
    const query = this.getDb()
      .select({
        id: conversationMessagesOpenai.id,
        userId: conversationMessagesOpenai.userId,
        conversationId: conversationMessagesOpenai.conversationId,
        status: conversationMessagesOpenai.status,
        model: conversationMessagesOpenai.model,
        input: conversationMessagesOpenai.input, // Include input field
        output: conversationMessagesOpenai.output,
        temperature: conversationMessagesOpenai.temperature,
        usage: conversationMessagesOpenai.usage,
        metadata: conversationMessagesOpenai.metadata,
        createdAt: conversationMessagesOpenai.createdAt,
      })
      .from(conversationMessagesOpenai)
      .where(
        and(
          eq(conversationMessagesOpenai.conversationId, conversationId),
          ne(conversationMessagesOpenai.status, MessageStatus.FAILED)
        )
      )
      .orderBy(desc(conversationMessagesOpenai.createdAt))

    if (limit) {
      query.limit(limit)
    }

    const messages = await query

    // Return in chronological order
    return messages.reverse()
  }

  /**
   * Add a follow-up user message to existing conversation
   */
  async addUserMessage(conversationId: string, content: string | string[]) {
    const message = this.createUserMessage(content)

    return {
      conversationId,
      message,
      // You would then call createResponse with this message context
    }
  }

  /**
   * Create a response with persona-aware context
   */
  async createResponseWithPersona(
    conversationId: string,
    persona?: PersonaConfig,
    options?: Partial<CreateResponseParams>
  ) {
    // In a full implementation, you'd want to inject persona into the conversation context
    // before calling createResponse. This is a simplified version.

    const params: CreateResponseParams = {
      conversation: conversationId,
      model: options?.model || DEFAULTS.MODEL,
      temperature: options?.temperature ?? DEFAULTS.TEMPERATURE,
      max_output_tokens: options?.max_output_tokens,
      stream: options?.stream,
    }

    return this.createResponse(params)
  }

  /**
   * Get conversation analysis based on message roles
   */
  async analyzeConversation(conversationId: string) {
    const conversation = await this.retrieve(conversationId)

    const analysis = {
      conversationId,
      totalMessages: conversation.messages.length,
      hasPersona: false,
      hasDeveloperInstructions: false,
      roleDistribution: {} as Record<MessageRole, number>,
      lastActivity: conversation.conversation.createdAt,
    }

    // This would analyze stored message content if you track the original conversation items
    // For now, this is a framework for future implementation

    return analysis
  }

  /**
   * Helper method to build context from previous assistant responses
   */
  buildContextFromHistory(messages: MessageHistoryItem[]) {
    return messages
      .filter(msg => msg.role === MessageRole.ASSISTANT)
      .map(msg => this.createAssistantMessage(msg.content))
  }
}