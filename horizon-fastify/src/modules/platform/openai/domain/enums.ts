/**
 * Conversation status enum
 */
export enum ConversationStatus {
  ACTIVE = "active",
  DELETED = "deleted",
  ARCHIVED = "archived",
}

/**
 * Message status enum for OpenAI responses
 */
export enum MessageStatus {
  COMPLETED = "completed",
  FAILED = "failed",
  IN_PROGRESS = "in_progress",
  CANCELLED = "cancelled",
  QUEUED = "queued",
  INCOMPLETE = "incomplete",
}

/**
 * Message types for conversation items
 */
export enum MessageType {
  MESSAGE = "message",
}

/**
 * Message roles for conversation items
 */
export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
  DEVELOPER = "developer",
}