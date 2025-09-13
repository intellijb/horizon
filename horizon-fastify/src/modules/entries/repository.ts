import { eq, and, isNull, sql } from "drizzle-orm"
import { entries } from "../../db/schema"
import type { FastifyInstance } from "fastify"
import type {
  CreateEntryBody,
  UpdateEntryBody,
  Entry,
  ListEntriesQuery,
} from "./schemas"

export interface EntriesRepository {
  findById(id: string): Promise<Entry | null>
  findAll(query: ListEntriesQuery): Promise<{ items: Entry[]; total: number }>
  create(data: CreateEntryBody): Promise<Entry>
  update(id: string, data: UpdateEntryBody): Promise<Entry | null>
  softDelete(id: string): Promise<boolean>
}

export function createEntriesRepository(
  fastify: FastifyInstance,
): EntriesRepository {
  const db = fastify.db

  return {
    async findById(id: string): Promise<Entry | null> {
      const results = await db
        .select()
        .from(entries)
        .where(and(eq(entries.id, id), isNull(entries.deletedAt)))
        .limit(1)

      if (results.length === 0) return null

      const entry = results[0]
      return {
        id: entry.id,
        content: entry.content,
        type: entry.type || "text",
        metadata: entry.metadata as Record<string, any> | null,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        deletedAt: entry.deletedAt?.toISOString() || null,
      }
    },

    async findAll(
      query: ListEntriesQuery,
    ): Promise<{ items: Entry[]; total: number }> {
      const conditions = [isNull(entries.deletedAt)]
      if (query.type) {
        conditions.push(eq(entries.type, query.type))
      }

      const [totalResult] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(entries)
        .where(and(...conditions))

      const results = await db
        .select()
        .from(entries)
        .where(and(...conditions))
        .limit(query.limit)
        .offset(query.offset)
        .orderBy(entries.createdAt)

      const items = results.map((entry) => ({
        id: entry.id,
        content: entry.content,
        type: entry.type || "text",
        metadata: entry.metadata as Record<string, any> | null,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        deletedAt: entry.deletedAt?.toISOString() || null,
      }))

      return {
        items,
        total: totalResult.count,
      }
    },

    async create(data: CreateEntryBody): Promise<Entry> {
      const id = crypto.randomUUID()
      const now = new Date()

      await db.insert(entries).values({
        id,
        content: data.content,
        type: data.type || "text",
        metadata: data.metadata || null,
        createdAt: now,
        updatedAt: now,
      })

      return {
        id,
        content: data.content,
        type: data.type || "text",
        metadata: data.metadata || null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        deletedAt: null,
      }
    },

    async update(id: string, data: UpdateEntryBody): Promise<Entry | null> {
      const existing = await this.findById(id)
      if (!existing) return null

      const now = new Date()
      const updateData: any = { updatedAt: now }

      if (data.content !== undefined) updateData.content = data.content
      if (data.type !== undefined) updateData.type = data.type
      if (data.metadata !== undefined) updateData.metadata = data.metadata

      await db.update(entries).set(updateData).where(eq(entries.id, id))

      return {
        ...existing,
        ...updateData,
        updatedAt: now.toISOString(),
      }
    },

    async softDelete(id: string): Promise<boolean> {
      const result = await db
        .update(entries)
        .set({ deletedAt: new Date() })
        .where(and(eq(entries.id, id), isNull(entries.deletedAt)))

      return (result.rowCount ?? 0) > 0
    },
  }
}