import type { FastifyInstance } from "fastify"
import type {
  CreateEntryBody,
  UpdateEntryBody,
  Entry,
  EntryList,
  ListEntriesQuery,
} from "./schemas"
import type { EntriesRepository } from "./repository"
import { createEntriesRepository } from "./repository"

export interface EntriesService {
  createEntry(data: CreateEntryBody): Promise<Entry>
  getEntry(id: string): Promise<Entry>
  listEntries(query: ListEntriesQuery): Promise<EntryList>
  updateEntry(id: string, data: UpdateEntryBody): Promise<Entry>
  deleteEntry(id: string): Promise<void>
}

export function createEntriesService(
  fastify: FastifyInstance,
): EntriesService {
  const repository = createEntriesRepository(fastify)

  return {
    async createEntry(data: CreateEntryBody): Promise<Entry> {
      // Business logic: validate content length, sanitize metadata, etc.
      if (data.content.length > 10000) {
        throw fastify.httpErrors.badRequest("Content too long (max 10000 characters)")
      }

      return repository.create(data)
    },

    async getEntry(id: string): Promise<Entry> {
      const entry = await repository.findById(id)
      if (!entry) {
        throw fastify.httpErrors.notFound("Entry not found")
      }
      return entry
    },

    async listEntries(query: ListEntriesQuery): Promise<EntryList> {
      const { items, total } = await repository.findAll(query)
      return {
        items,
        total,
        limit: query.limit,
        offset: query.offset,
      }
    },

    async updateEntry(id: string, data: UpdateEntryBody): Promise<Entry> {
      // Business logic: validate updates
      if (data.content && data.content.length > 10000) {
        throw fastify.httpErrors.badRequest("Content too long (max 10000 characters)")
      }

      const updated = await repository.update(id, data)
      if (!updated) {
        throw fastify.httpErrors.notFound("Entry not found")
      }
      return updated
    },

    async deleteEntry(id: string): Promise<void> {
      const deleted = await repository.softDelete(id)
      if (!deleted) {
        throw fastify.httpErrors.notFound("Entry not found")
      }
    },
  }
}