import type { FastifyInstance } from "fastify"
import type {
  CreateAttachmentBody,
  Attachment,
  AttachmentList,
  ListAttachmentsQuery,
} from "./schemas"
import type { AttachmentsRepository } from "./repository"
import { createAttachmentsRepository } from "./repository"

export interface AttachmentsService {
  createAttachment(data: CreateAttachmentBody): Promise<Attachment>
  getAttachment(id: string): Promise<Attachment>
  listAttachments(query: ListAttachmentsQuery): Promise<AttachmentList>
  deleteAttachment(id: string): Promise<void>
}

export function createAttachmentsService(
  fastify: FastifyInstance,
): AttachmentsService {
  const repository = createAttachmentsRepository(fastify)

  return {
    async createAttachment(data: CreateAttachmentBody): Promise<Attachment> {
      // Business logic: validate entry exists
      const entryExists = await repository.entryExists(data.entryId)
      if (!entryExists) {
        throw fastify.httpErrors.badRequest("Entry not found")
      }

      // Validate attachment size (10MB limit)
      const sizeInBytes = Buffer.byteLength(data.data, "utf8")
      if (sizeInBytes > 10 * 1024 * 1024) {
        throw fastify.httpErrors.badRequest("Attachment too large (max 10MB)")
      }

      return repository.create(data)
    },

    async getAttachment(id: string): Promise<Attachment> {
      const attachment = await repository.findById(id)
      if (!attachment) {
        throw fastify.httpErrors.notFound("Attachment not found")
      }
      return attachment
    },

    async listAttachments(query: ListAttachmentsQuery): Promise<AttachmentList> {
      const { items, total } = await repository.findAll(query)
      return {
        items,
        total,
        limit: query.limit,
        offset: query.offset,
      }
    },

    async deleteAttachment(id: string): Promise<void> {
      const deleted = await repository.delete(id)
      if (!deleted) {
        throw fastify.httpErrors.notFound("Attachment not found")
      }
    },
  }
}