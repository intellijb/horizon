import { eq, sql } from "drizzle-orm"
import { attachments, entries } from "../../db/schema"
import type { FastifyInstance } from "fastify"
import type {
  CreateAttachmentBody,
  Attachment,
  ListAttachmentsQuery,
} from "./schemas"

export interface AttachmentsRepository {
  findById(id: string): Promise<Attachment | null>
  findByEntryId(
    entryId: string,
    query: ListAttachmentsQuery,
  ): Promise<{ items: Attachment[]; total: number }>
  findAll(query: ListAttachmentsQuery): Promise<{ items: Attachment[]; total: number }>
  create(data: CreateAttachmentBody): Promise<Attachment>
  delete(id: string): Promise<boolean>
  entryExists(entryId: string): Promise<boolean>
}

export function createAttachmentsRepository(
  fastify: FastifyInstance,
): AttachmentsRepository {
  const db = fastify.db

  return {
    async findById(id: string): Promise<Attachment | null> {
      const results = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, id))
        .limit(1)

      if (results.length === 0) return null

      const attachment = results[0]
      return {
        id: attachment.id,
        entryId: attachment.entryId,
        data: attachment.data,
        mimeType: attachment.mimeType,
        size: attachment.size,
        createdAt: attachment.createdAt.toISOString(),
      }
    },

    async findByEntryId(
      entryId: string,
      query: ListAttachmentsQuery,
    ): Promise<{ items: Attachment[]; total: number }> {
      const [totalResult] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(attachments)
        .where(eq(attachments.entryId, entryId))

      const results = await db
        .select()
        .from(attachments)
        .where(eq(attachments.entryId, entryId))
        .limit(query.limit)
        .offset(query.offset)
        .orderBy(attachments.createdAt)

      const items = results.map((attachment) => ({
        id: attachment.id,
        entryId: attachment.entryId,
        data: attachment.data,
        mimeType: attachment.mimeType,
        size: attachment.size,
        createdAt: attachment.createdAt.toISOString(),
      }))

      return {
        items,
        total: totalResult.count,
      }
    },

    async findAll(
      query: ListAttachmentsQuery,
    ): Promise<{ items: Attachment[]; total: number }> {
      if (query.entryId) {
        return this.findByEntryId(query.entryId, query)
      }

      const [totalResult] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(attachments)

      const results = await db
        .select()
        .from(attachments)
        .limit(query.limit)
        .offset(query.offset)
        .orderBy(attachments.createdAt)

      const items = results.map((attachment) => ({
        id: attachment.id,
        entryId: attachment.entryId,
        data: attachment.data,
        mimeType: attachment.mimeType,
        size: attachment.size,
        createdAt: attachment.createdAt.toISOString(),
      }))

      return {
        items,
        total: totalResult.count,
      }
    },

    async create(data: CreateAttachmentBody): Promise<Attachment> {
      const id = crypto.randomUUID()
      const now = new Date()
      const size = Buffer.byteLength(data.data, "utf8")

      await db.insert(attachments).values({
        id,
        entryId: data.entryId,
        data: data.data,
        mimeType: data.mimeType || null,
        size,
        createdAt: now,
      })

      return {
        id,
        entryId: data.entryId,
        data: data.data,
        mimeType: data.mimeType || null,
        size,
        createdAt: now.toISOString(),
      }
    },

    async delete(id: string): Promise<boolean> {
      const result = await db
        .delete(attachments)
        .where(eq(attachments.id, id))

      return (result.rowCount ?? 0) > 0
    },

    async entryExists(entryId: string): Promise<boolean> {
      const results = await db
        .select({ id: entries.id })
        .from(entries)
        .where(eq(entries.id, entryId))
        .limit(1)

      return results.length > 0
    },
  }
}