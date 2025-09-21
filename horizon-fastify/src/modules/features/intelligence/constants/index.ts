export * from "./errors"

export const INTELLIGENCE_CONSTANTS = {
  DEFAULT_STATUS: "active" as const,
  DEFAULT_PROVIDER: "openai" as const,
  VALID_STATUSES: ["active", "archived", "deleted"] as const,
  VALID_PROVIDERS: ["openai"] as const,
  COLUMN_TYPES: ["string", "number", "boolean", "date", "json", "array"] as const,
} as const