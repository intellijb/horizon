export const JOURNAL_CONSTANTS = {
  STATUS: {
    ACTIVE: "active",
    ARCHIVED: "archived",
    DELETED: "deleted",
  },
  DEFAULT_ORDER: 0,
  DATE_FORMAT: "YYYY-MM-DD",
} as const

export const JOURNAL_ERROR_MESSAGES = {
  CARD_NOT_FOUND: "Journal card not found",
  INPUT_NOT_FOUND: "Journal card input not found",
  INVALID_DATE_FORMAT: "Invalid date format. Expected YYYY-MM-DD",
  INVALID_STATUS: "Invalid status. Must be 'active', 'archived', or 'deleted'",
} as const