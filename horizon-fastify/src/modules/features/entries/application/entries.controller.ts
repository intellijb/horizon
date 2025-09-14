import { CreateEntryUseCase } from "./create-entry.usecase"
import { ListEntriesUseCase } from "./list-entries.usecase"
import { EntriesRepositoryDrizzle } from "../extensions/entries.repository.drizzle"
import { EntriesError } from "../constants/error.codes"
import {
  CreateEntryBody,
  UpdateEntryBody,
  EntryParams,
  ListEntriesQuery,
} from "./entries.types"

export class EntriesController {
  private repository: EntriesRepositoryDrizzle
  private createEntryUseCase: CreateEntryUseCase
  private listEntriesUseCase: ListEntriesUseCase

  constructor(db: any) {
    this.repository = new EntriesRepositoryDrizzle(db)
    this.createEntryUseCase = new CreateEntryUseCase(this.repository)
    this.listEntriesUseCase = new ListEntriesUseCase(this.repository)
  }

  async listEntries(query: ListEntriesQuery) {
    const result = await this.listEntriesUseCase.execute(query)

    return {
      data: {
        items: result.items.map(entry => entry.toJSON()),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
      statusCode: 200,
    }
  }

  async getEntryById(id: string) {
    const entry = await this.repository.findEntryById(id)

    if (!entry) {
      return { error: "Entry not found", statusCode: 404 }
    }

    return {
      data: entry.toJSON(),
      statusCode: 200,
    }
  }

  async createEntry(data: CreateEntryBody) {
    const entry = await this.createEntryUseCase.execute(data)

    return {
      data: entry.toJSON(),
      statusCode: 201,
    }
  }

  async updateEntry(id: string, data: UpdateEntryBody) {
    const entry = await this.repository.updateEntry(id, data)

    if (!entry) {
      return { error: "Entry not found", statusCode: 404 }
    }

    return {
      data: entry.toJSON(),
      statusCode: 200,
    }
  }

  async deleteEntry(id: string) {
    const deleted = await this.repository.deleteEntry(id)

    if (!deleted) {
      return { error: "Entry not found", statusCode: 404 }
    }

    // Also delete all attachments for this entry
    await this.repository.deleteAttachmentsByEntryId(id)

    return { statusCode: 204 }
  }
}