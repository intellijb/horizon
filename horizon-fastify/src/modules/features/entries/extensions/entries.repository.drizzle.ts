import { eq, and, isNull, sql, or, SQL } from "drizzle-orm"
import { NodePgDatabase } from "drizzle-orm/node-postgres"
import { entries, attachments } from "@modules/platform/database/schema"
import * as schema from "@modules/platform/database/schema"
import {
  EntriesRepositoryPort,
  CreateEntryData,
  UpdateEntryData,
  CreateAttachmentData,
  ListEntriesFilter,
  ListAttachmentsFilter,
  PaginatedResult
} from "../domain/ports/entries-repository.port"
import { Entry, Attachment } from "../domain/entities/entry.entity"

type Database = NodePgDatabase<typeof schema>

export class EntriesRepositoryDrizzle implements EntriesRepositoryPort {
  constructor(private db: Database) {}

  // Entry operations
  async createEntry(data: CreateEntryData): Promise<Entry> {
    const [result] = await this.db
      .insert(entries)
      .values({
        content: data.content,
        type: data.type || "text",
        metadata: data.metadata || null,
      })
      .returning()

    return Entry.create({
      id: result.id,
      content: result.content,
      type: result.type || "text",
      metadata: result.metadata as Record<string, any> | null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      deletedAt: result.deletedAt,
    })
  }

  async findEntryById(id: string): Promise<Entry | null> {
    const results = await this.db
      .select()
      .from(entries)
      .where(eq(entries.id, id))
      .limit(1)

    if (results.length === 0) return null

    const entry = results[0]

    // Get attachments for this entry
    const attachmentResults = await this.getAttachmentsByEntryId(id)

    return Entry.create({
      id: entry.id,
      content: entry.content,
      type: entry.type || "text",
      metadata: entry.metadata as Record<string, any> | null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      deletedAt: entry.deletedAt,
      attachments: attachmentResults,
    })
  }

  async updateEntry(id: string, data: UpdateEntryData): Promise<Entry | null> {
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.content !== undefined) updateData.content = data.content
    if (data.type !== undefined) updateData.type = data.type
    if (data.metadata !== undefined) updateData.metadata = data.metadata

    const [result] = await this.db
      .update(entries)
      .set(updateData)
      .where(and(eq(entries.id, id), isNull(entries.deletedAt)))
      .returning()

    if (!result) return null

    const attachmentResults = await this.getAttachmentsByEntryId(id)

    return Entry.create({
      id: result.id,
      content: result.content,
      type: result.type || "text",
      metadata: result.metadata as Record<string, any> | null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      deletedAt: result.deletedAt,
      attachments: attachmentResults,
    })
  }

  async deleteEntry(id: string): Promise<boolean> {
    const [result] = await this.db
      .update(entries)
      .set({ deletedAt: new Date() })
      .where(and(eq(entries.id, id), isNull(entries.deletedAt)))
      .returning()

    return !!result
  }

  async listEntries(filter: ListEntriesFilter): Promise<PaginatedResult<Entry>> {
    // Build where conditions
    const conditions: SQL<unknown>[] = []

    if (!filter.includeDeleted) {
      conditions.push(isNull(entries.deletedAt))
    }

    if (filter.type) {
      conditions.push(eq(entries.type, filter.type))
    }

    const baseCondition = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const countResults = baseCondition
      ? await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(entries)
          .where(baseCondition)
      : await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(entries)

    const { count } = countResults[0]

    // Get paginated results
    const results = baseCondition
      ? await this.db
          .select()
          .from(entries)
          .where(baseCondition)
          .limit(filter.limit || 20)
          .offset(filter.offset || 0)
          .orderBy(entries.createdAt)
      : await this.db
          .select()
          .from(entries)
          .limit(filter.limit || 20)
          .offset(filter.offset || 0)
          .orderBy(entries.createdAt)

    const items = results.map(entry =>
      Entry.create({
        id: entry.id,
        content: entry.content,
        type: entry.type || "text",
        metadata: entry.metadata as Record<string, any> | null,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        deletedAt: entry.deletedAt,
      })
    )

    return {
      items,
      total: count,
      limit: filter.limit || 20,
      offset: filter.offset || 0,
    }
  }

  // Attachment operations
  async createAttachment(data: CreateAttachmentData): Promise<Attachment> {
    const [result] = await this.db
      .insert(attachments)
      .values({
        entryId: data.entryId,
        data: data.data,
        mimeType: data.mimeType || null,
        size: data.size || null,
      })
      .returning()

    return Attachment.create({
      id: result.id,
      entryId: result.entryId,
      data: result.data,
      mimeType: result.mimeType,
      size: result.size,
      createdAt: result.createdAt,
    })
  }

  async findAttachmentById(id: string): Promise<Attachment | null> {
    const [result] = await this.db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1)

    if (!result) return null

    return Attachment.create({
      id: result.id,
      entryId: result.entryId,
      data: result.data,
      mimeType: result.mimeType,
      size: result.size,
      createdAt: result.createdAt,
    })
  }

  async deleteAttachment(id: string): Promise<boolean> {
    const [result] = await this.db
      .delete(attachments)
      .where(eq(attachments.id, id))
      .returning()

    return !!result
  }

  async listAttachments(filter: ListAttachmentsFilter): Promise<PaginatedResult<Attachment>> {
    const conditions: SQL<unknown>[] = []

    if (filter.entryId) {
      const entryCondition = eq(attachments.entryId, filter.entryId)
      if (entryCondition) {
        conditions.push(entryCondition)
      }
    }

    // Get total count
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const countResults = whereClause
      ? await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(attachments)
          .where(whereClause)
      : await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(attachments)

    const { count } = countResults[0]

    // Get paginated results
    const results = whereClause
      ? await this.db
          .select()
          .from(attachments)
          .where(whereClause)
          .limit(filter.limit || 20)
          .offset(filter.offset || 0)
          .orderBy(attachments.createdAt)
      : await this.db
          .select()
          .from(attachments)
          .limit(filter.limit || 20)
          .offset(filter.offset || 0)
          .orderBy(attachments.createdAt)

    const items = results.map(attachment =>
      Attachment.create({
        id: attachment.id,
        entryId: attachment.entryId,
        data: attachment.data,
        mimeType: attachment.mimeType,
        size: attachment.size,
        createdAt: attachment.createdAt,
      })
    )

    return {
      items,
      total: count,
      limit: filter.limit || 20,
      offset: filter.offset || 0,
    }
  }

  async getAttachmentsByEntryId(entryId: string): Promise<Attachment[]> {
    const results = await this.db
      .select()
      .from(attachments)
      .where(eq(attachments.entryId, entryId))
      .orderBy(attachments.createdAt)

    return results.map(attachment =>
      Attachment.create({
        id: attachment.id,
        entryId: attachment.entryId,
        data: attachment.data,
        mimeType: attachment.mimeType,
        size: attachment.size,
        createdAt: attachment.createdAt,
      })
    )
  }

  // Bulk operations
  async deleteAttachmentsByEntryId(entryId: string): Promise<number> {
    const results = await this.db
      .delete(attachments)
      .where(eq(attachments.entryId, entryId))
      .returning()

    return results.length
  }

  async countAttachmentsByEntryId(entryId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(attachments)
      .where(eq(attachments.entryId, entryId))

    return count
  }
}