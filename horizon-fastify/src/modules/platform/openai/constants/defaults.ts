/**
 * Default values for OpenAI conversations and responses
 */
export const DEFAULTS = {
  /**
   * Default model to use when none is specified
   */
  MODEL: "gpt-5-nano",

  /**
   * Default temperature for responses
   */
  TEMPERATURE: 0.7,

  /**
   * Default max output tokens
   */
  MAX_OUTPUT_TOKENS: 1000,

  /**
   * Default streaming preference
   */
  STREAM: false,

  /**
   * Default metadata object
   */
  METADATA: {},

  /**
   * Response ID prefix for generated IDs
   */
  RESPONSE_ID_PREFIX: "resp_",

  /**
   * ID generation settings
   */
  ID_GENERATION: {
    RANDOM_LENGTH: 9,
    SUBSTRING_START: 2,
    SUBSTRING_END: 11,
  },

  /**
   * Maximum number of items allowed in conversation creation
   */
  MAX_CONVERSATION_ITEMS: 20,
} as const

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  CONVERSATION_NOT_FOUND: (id: string) => `Conversation not found: ${id}`,
  DATABASE_NOT_INITIALIZED: "Database not initialized. Call initialize() first.",
  CREATE_CONVERSATION_FAILED: (error: unknown) => `Failed to create conversation: ${error}`,
  RETRIEVE_CONVERSATION_FAILED: (error: unknown) => `Failed to retrieve conversation: ${error}`,
  DELETE_CONVERSATION_FAILED: (error: unknown) => `Failed to delete conversation: ${error}`,
  CREATE_RESPONSE_FAILED: (error: unknown) => `Failed to create response: ${error}`,
} as const