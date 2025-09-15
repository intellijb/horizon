import { getDatabase } from "@modules/platform/database"
import { conversationsOpenai, conversationMessagesOpenai } from "../extensions/schema"
import { OpenAIConversationService } from "../extensions/conversation.api"
import { eq } from "drizzle-orm"
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

    return this.create({ items, metadata }, userId)
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
    // Call API to create response
    const apiResponse = await this.apiService.createResponse(params)

    // Extract response data - API response structure may vary
    const responseData = apiResponse as any
    const responseId = responseData.id || `${DEFAULTS.RESPONSE_ID_PREFIX}${Date.now()}_${Math.random().toString(36).substring(DEFAULTS.ID_GENERATION.SUBSTRING_START, DEFAULTS.ID_GENERATION.SUBSTRING_END)}`

    // Store response in conversationMessagesOpenai table
    const [messageRecord] = await this.getDb()
      .insert(conversationMessagesOpenai)
      .values({
        id: responseId,
        userId: userId || '00000000-0000-0000-0000-000000000000', // Temporary default
        conversationId: params.conversation,
        status: responseData.status || MessageStatus.COMPLETED,
        model: params.model || responseData.model || DEFAULTS.MODEL,
        output: responseData.output || responseData.content || [],
        temperature: params.temperature ? Math.round(params.temperature * 100) : null,
        usage: responseData.usage || DEFAULTS.METADATA,
        metadata: DEFAULTS.METADATA,
        createdAt: new Date(),
      })
      .returning()

    return {
      apiResponse,
      dbRecord: messageRecord,
    }
  }

  async getMessages(conversationId: string) {
    return await this.getDb()
      .select()
      .from(conversationMessagesOpenai)
      .where(eq(conversationMessagesOpenai.conversationId, conversationId))
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