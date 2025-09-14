import { EntriesConstants } from "../constants/entries.constants"
import { EntriesError, EntriesErrorCodes } from "../constants/error.codes"

export class ValidationService {
  validateEntryType(type: string): void {
    if (!EntriesConstants.ENTRY_TYPES.includes(type as any)) {
      throw new EntriesError(
        EntriesErrorCodes.INVALID_ENTRY_TYPE,
        `Invalid entry type: ${type}. Must be one of: ${EntriesConstants.ENTRY_TYPES.join(", ")}`
      )
    }
  }

  validateMimeType(mimeType: string): void {
    if (!EntriesConstants.ALLOWED_MIME_TYPES.includes(mimeType as any)) {
      throw new EntriesError(
        EntriesErrorCodes.INVALID_MIME_TYPE,
        `Invalid mime type: ${mimeType}. Allowed types: ${EntriesConstants.ALLOWED_MIME_TYPES.join(", ")}`
      )
    }
  }

  validateAttachmentSize(size: number): void {
    if (size > EntriesConstants.MAX_ATTACHMENT_SIZE) {
      throw new EntriesError(
        EntriesErrorCodes.ATTACHMENT_SIZE_EXCEEDED,
        `Attachment size ${size} exceeds maximum allowed size of ${EntriesConstants.MAX_ATTACHMENT_SIZE} bytes`
      )
    }
  }

  validateAttachmentCount(currentCount: number, newCount: number = 1): void {
    if (currentCount + newCount > EntriesConstants.MAX_ATTACHMENTS_PER_ENTRY) {
      throw new EntriesError(
        EntriesErrorCodes.ATTACHMENT_LIMIT_EXCEEDED,
        `Cannot add ${newCount} attachment(s). Entry already has ${currentCount} attachments. Maximum allowed: ${EntriesConstants.MAX_ATTACHMENTS_PER_ENTRY}`
      )
    }
  }

  validatePagination(limit: number, offset: number): void {
    if (limit < 1 || limit > EntriesConstants.MAX_LIMIT) {
      throw new EntriesError(
        EntriesErrorCodes.INVALID_PAGINATION,
        `Invalid limit: ${limit}. Must be between 1 and ${EntriesConstants.MAX_LIMIT}`
      )
    }

    if (offset < 0) {
      throw new EntriesError(
        EntriesErrorCodes.INVALID_PAGINATION,
        `Invalid offset: ${offset}. Must be non-negative`
      )
    }
  }

  sanitizeMetadata(metadata: any): Record<string, any> | null {
    if (!metadata || typeof metadata !== "object") {
      return null
    }

    // Remove any potentially dangerous keys
    const sanitized: Record<string, any> = {}
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof key === "string" && !key.startsWith("__")) {
        sanitized[key] = value
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null
  }
}