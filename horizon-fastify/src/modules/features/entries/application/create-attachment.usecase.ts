import { EntriesRepositoryPort } from "../domain/ports/entries-repository.port"
import { Attachment } from "../domain/entities/entry.entity"
import { ValidationService } from "../business/validation.service"
import { EntriesError, EntriesErrorCodes } from "../constants/error.codes"

export interface CreateAttachmentRequest {
  entryId: string
  data: string
  mimeType?: string
}

export class CreateAttachmentUseCase {
  private validationService: ValidationService

  constructor(private repository: EntriesRepositoryPort) {
    this.validationService = new ValidationService()
  }

  async execute(request: CreateAttachmentRequest): Promise<Attachment> {
    // Check if entry exists
    const entry = await this.repository.findEntryById(request.entryId)
    if (!entry) {
      throw new EntriesError(
        EntriesErrorCodes.ENTRY_NOT_FOUND,
        `Entry with id ${request.entryId} not found`,
        404
      )
    }

    // Check if entry is deleted
    if (entry.isDeleted()) {
      throw new EntriesError(
        EntriesErrorCodes.ENTRY_ALREADY_DELETED,
        `Cannot add attachment to deleted entry`,
        400
      )
    }

    // Validate mime type if provided
    if (request.mimeType) {
      this.validationService.validateMimeType(request.mimeType)
    }

    // Calculate size (base64 string length)
    const size = Buffer.byteLength(request.data, "base64")
    this.validationService.validateAttachmentSize(size)

    // Check attachment count limit
    const currentCount = await this.repository.countAttachmentsByEntryId(request.entryId)
    this.validationService.validateAttachmentCount(currentCount)

    // Create attachment
    const attachment = await this.repository.createAttachment({
      entryId: request.entryId,
      data: request.data,
      mimeType: request.mimeType,
      size,
    })

    return attachment
  }
}