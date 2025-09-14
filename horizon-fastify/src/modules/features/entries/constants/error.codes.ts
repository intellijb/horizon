export const EntriesErrorCodes = {
  // Entry errors
  ENTRY_NOT_FOUND: "ENTRY_NOT_FOUND",
  ENTRY_ALREADY_DELETED: "ENTRY_ALREADY_DELETED",
  INVALID_ENTRY_TYPE: "INVALID_ENTRY_TYPE",
  ENTRY_CONTENT_TOO_LARGE: "ENTRY_CONTENT_TOO_LARGE",

  // Attachment errors
  ATTACHMENT_NOT_FOUND: "ATTACHMENT_NOT_FOUND",
  ATTACHMENT_LIMIT_EXCEEDED: "ATTACHMENT_LIMIT_EXCEEDED",
  ATTACHMENT_SIZE_EXCEEDED: "ATTACHMENT_SIZE_EXCEEDED",
  INVALID_MIME_TYPE: "INVALID_MIME_TYPE",
  ENTRY_ATTACHMENT_MISMATCH: "ENTRY_ATTACHMENT_MISMATCH",

  // Validation errors
  INVALID_PAGINATION: "INVALID_PAGINATION",
  INVALID_METADATA: "INVALID_METADATA",
} as const

export type EntriesErrorCode = typeof EntriesErrorCodes[keyof typeof EntriesErrorCodes]

export class EntriesError extends Error {
  constructor(
    public code: EntriesErrorCode,
    message: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = "EntriesError"
  }
}