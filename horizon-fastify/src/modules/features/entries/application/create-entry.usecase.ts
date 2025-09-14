import { EntriesRepositoryPort } from "../domain/ports/entries-repository.port"
import { Entry } from "../domain/entities/entry.entity"
import { ValidationService } from "../business/validation.service"
import { EntriesConstants } from "../constants/entries.constants"

export interface CreateEntryRequest {
  content: string
  type?: string
  metadata?: Record<string, any>
}

export class CreateEntryUseCase {
  private validationService: ValidationService

  constructor(private repository: EntriesRepositoryPort) {
    this.validationService = new ValidationService()
  }

  async execute(request: CreateEntryRequest): Promise<Entry> {
    // Validate entry type if provided
    const entryType = request.type || EntriesConstants.DEFAULT_ENTRY_TYPE
    if (request.type) {
      this.validationService.validateEntryType(entryType)
    }

    // Sanitize metadata
    const metadata = this.validationService.sanitizeMetadata(request.metadata)

    // Create entry
    const entry = await this.repository.createEntry({
      content: request.content,
      type: entryType,
      metadata,
    })

    return entry
  }
}