import { MessageType, MessageRole } from './enums'

/**
 * A conversation item representing a message in the OpenAI conversation context
 */
export interface ConversationItem {
  content: string | string[] // Text, image, or audio input
  role: MessageRole // user, assistant, system, or developer
  type?: MessageType // Optional, always "message" when specified
}

/**
 * Parameters for creating a new conversation
 */
export interface CreateConversationParams {
  metadata?: Record<string, string>
  items?: ConversationItem[] | null // Optional, up to 20 items at a time
}

/**
 * Parameters for creating a response in a conversation
 */
export interface CreateResponseParams {
  conversation: string
  input?: ConversationItem[] | string
  model?: string
  max_output_tokens?: number
  temperature?: number
  stream?: boolean | null
}

/**
 * Configuration for injecting persona and instructions
 */
export interface PersonaConfig {
  role: MessageRole.SYSTEM | MessageRole.DEVELOPER
  persona: string
  instructions?: string
}

/**
 * Builder interface for creating messages with specific roles
 */
export interface MessageBuilder {
  content: string | string[]
  role: MessageRole
  type?: MessageType
}

/**
 * Validation result for message items
 */
export interface MessageValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Conversation analysis result
 */
export interface ConversationAnalysis {
  conversationId: string
  totalMessages: number
  hasPersona: boolean
  hasDeveloperInstructions: boolean
  roleDistribution: Record<MessageRole, number>
  lastActivity: Date
}

/**
 * Message history item for building context
 */
export interface MessageHistoryItem {
  content: any
  role: string
}