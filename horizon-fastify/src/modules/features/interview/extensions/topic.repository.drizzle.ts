import { eq, and, sql, desc, asc, inArray, like } from "drizzle-orm"
import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "@modules/platform/database/schema"
import { topics } from "./schema/interview.schema"
import { Topic } from "../domain/types"

type Database = NodePgDatabase<typeof schema>

export class TopicRepositoryDrizzle {
  constructor(private db: Database) {}

  async create(topicData: Omit<Topic, "id" | "createdAt" | "updatedAt">): Promise<Topic> {
    const [result] = await this.db
      .insert(topics)
      .values({
        categoryId: topicData.categoryId,
        name: topicData.name,
        description: topicData.description || null,
        difficulty: topicData.difficulty || null,
        tags: topicData.tags || null,
      })
      .returning()

    return this.mapToTopic(result)
  }

  async findById(id: string): Promise<Topic | null> {
    const results = await this.db
      .select()
      .from(topics)
      .where(eq(topics.id, id))
      .limit(1)

    if (results.length === 0) return null

    return this.mapToTopic(results[0])
  }

  async update(id: string, updates: Partial<Omit<Topic, "id" | "createdAt">>): Promise<Topic | null> {
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty
    if (updates.tags !== undefined) updateData.tags = updates.tags

    const [result] = await this.db
      .update(topics)
      .set(updateData)
      .where(eq(topics.id, id))
      .returning()

    if (!result) return null

    return this.mapToTopic(result)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(topics)
      .where(eq(topics.id, id))
      .returning({ id: topics.id })

    return result.length > 0
  }

  async list(filters?: {
    categoryId?: string
    difficulty?: number
    tags?: string[]
    limit?: number
    offset?: number
  }): Promise<Topic[]> {
    const conditions: any[] = []

    if (filters?.categoryId) {
      conditions.push(eq(topics.categoryId, filters.categoryId))
    }

    if (filters?.difficulty) {
      conditions.push(eq(topics.difficulty, filters.difficulty))
    }

    if (filters?.tags && filters.tags.length > 0) {
      conditions.push(
        sql`${topics.tags}::jsonb ?| array[${sql.join(
          filters.tags.map(tag => sql`${tag}`),
          sql`, `
        )}]`
      )
    }

    let query = this.db
      .select()
      .from(topics)
      .orderBy(asc(topics.name))

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any
    }

    const results = await query

    return results.map(this.mapToTopic)
  }

  async findByCategory(categoryId: string): Promise<Topic[]> {
    const results = await this.db
      .select()
      .from(topics)
      .where(eq(topics.categoryId, categoryId))
      .orderBy(asc(topics.name))

    return results.map(this.mapToTopic)
  }

  async findByTags(tags: string[]): Promise<Topic[]> {
    const results = await this.db
      .select()
      .from(topics)
      .where(
        sql`${topics.tags}::jsonb ?& array[${sql.join(
          tags.map(tag => sql`${tag}`),
          sql`, `
        )}]`
      )
      .orderBy(asc(topics.name))

    return results.map(this.mapToTopic)
  }

  async findByIds(ids: string[]): Promise<Topic[]> {
    if (ids.length === 0) return []

    const results = await this.db
      .select()
      .from(topics)
      .where(inArray(topics.id, ids))
      .orderBy(asc(topics.name))

    return results.map(this.mapToTopic)
  }

  async search(searchTerm: string): Promise<Topic[]> {
    const results = await this.db
      .select()
      .from(topics)
      .where(
        like(topics.name, `%${searchTerm}%`)
      )
      .orderBy(asc(topics.name))

    return results.map(this.mapToTopic)
  }

  async addTags(id: string, newTags: string[]): Promise<Topic | null> {
    const topic = await this.findById(id)
    if (!topic) return null

    const existingTags = topic.tags || []
    const updatedTags = [...new Set([...existingTags, ...newTags])]

    return this.update(id, { tags: updatedTags })
  }

  async removeTags(id: string, tagsToRemove: string[]): Promise<Topic | null> {
    const topic = await this.findById(id)
    if (!topic) return null

    const existingTags = topic.tags || []
    const updatedTags = existingTags.filter(tag => !tagsToRemove.includes(tag))

    return this.update(id, { tags: updatedTags })
  }

  private mapToTopic(row: any): Topic {
    return {
      id: row.id,
      categoryId: row.categoryId,
      name: row.name,
      description: row.description || undefined,
      difficulty: row.difficulty || undefined,
      tags: row.tags || undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }
}