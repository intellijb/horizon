import { EntriesRepositoryPort, PaginatedResult } from "../domain/ports/entries-repository.port"
import { Entry } from "../domain/entities/entry.entity"
import { ValidationService } from "../business/validation.service"
import { EntriesConstants } from "../constants/entries.constants"

export interface ListEntriesRequest {
  type?: string
  limit?: number
  offset?: number
}

export class ListEntriesUseCase {
  private validationService: ValidationService

  constructor(private repository: EntriesRepositoryPort) {
    this.validationService = new ValidationService()
  }

  async execute(request: ListEntriesRequest): Promise<PaginatedResult<Entry>> {
    // Set defaults
    const limit = request.limit || EntriesConstants.DEFAULT_LIMIT
    const offset = request.offset || 0

    // Validate pagination
    this.validationService.validatePagination(limit, offset)

    // Validate type if provided
    if (request.type) {
      this.validationService.validateEntryType(request.type)
    }

    // Get entries
    const result = await this.repository.listEntries({
      type: request.type,
      limit,
      offset,
      includeDeleted: false,
    })

    return result
  }
}