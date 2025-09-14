export const EntriesConstants = {
  // Pagination
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,

  // Entry types
  DEFAULT_ENTRY_TYPE: "text",
  ENTRY_TYPES: ["text", "markdown", "html", "json", "code"] as const,

  // Attachment limits
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ATTACHMENTS_PER_ENTRY: 10,

  // Mime types
  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/json",
  ] as const,
} as const

export type EntryType = typeof EntriesConstants.ENTRY_TYPES[number]
export type AllowedMimeType = typeof EntriesConstants.ALLOWED_MIME_TYPES[number]