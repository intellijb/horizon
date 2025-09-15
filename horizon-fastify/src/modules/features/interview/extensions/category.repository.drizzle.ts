import { eq, and, desc, asc } from "drizzle-orm"
import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "@modules/platform/database/schema"
import { categories, topics } from "./schema/interview.schema"
import { Category, Topic } from "../domain/types"

type Database = NodePgDatabase<typeof schema>

export class CategoryRepositoryDrizzle {
  constructor(private db: Database) {}

  async create(categoryData: Omit<Category, "id" | "createdAt" | "updatedAt">): Promise<Category> {
    const [result] = await this.db
      .insert(categories)
      .values({
        type: categoryData.type,
        name: categoryData.name,
        description: categoryData.description || null,
      })
      .returning()

    return this.mapToCategory(result)
  }

  async findById(id: string): Promise<Category | null> {
    const results = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)

    if (results.length === 0) return null

    return this.mapToCategory(results[0])
  }

  async findByIdWithTopics(id: string): Promise<Category | null> {
    const categoryResults = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)

    if (categoryResults.length === 0) return null

    const topicResults = await this.db
      .select()
      .from(topics)
      .where(eq(topics.categoryId, id))
      .orderBy(asc(topics.name))

    const category = this.mapToCategory(categoryResults[0])
    category.topics = topicResults.map(this.mapToTopic)

    return category
  }

  async update(id: string, updates: Partial<Omit<Category, "id" | "createdAt">>): Promise<Category | null> {
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (updates.type !== undefined) updateData.type = updates.type
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description

    const [result] = await this.db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning()

    if (!result) return null

    return this.mapToCategory(result)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id })

    return result.length > 0
  }

  async list(filters?: {
    type?: Category["type"]
    limit?: number
    offset?: number
  }): Promise<Category[]> {
    let conditions: any = undefined

    if (filters?.type) {
      conditions = eq(categories.type, filters.type)
    }

    const results = await this.db
      .select()
      .from(categories)
      .where(conditions)
      .orderBy(asc(categories.name))
      .limit(filters?.limit || 100)
      .offset(filters?.offset || 0)

    return results.map(this.mapToCategory)
  }

  async listWithTopics(filters?: {
    type?: Category["type"]
  }): Promise<Category[]> {
    let conditions: any = undefined

    if (filters?.type) {
      conditions = eq(categories.type, filters.type)
    }

    const categoryResults = await this.db
      .select()
      .from(categories)
      .where(conditions)
      .orderBy(asc(categories.name))

    const categoriesWithTopics = await Promise.all(
      categoryResults.map(async (category) => {
        const topicResults = await this.db
          .select()
          .from(topics)
          .where(eq(topics.categoryId, category.id))
          .orderBy(asc(topics.name))

        const mappedCategory = this.mapToCategory(category)
        mappedCategory.topics = topicResults.map(this.mapToTopic)
        return mappedCategory
      })
    )

    return categoriesWithTopics
  }

  async addTopic(categoryId: string, topicData: Omit<Topic, "id" | "categoryId" | "createdAt" | "updatedAt">): Promise<Topic> {
    const [result] = await this.db
      .insert(topics)
      .values({
        categoryId,
        name: topicData.name,
        description: topicData.description || null,
        difficulty: topicData.difficulty || null,
        tags: topicData.tags || null,
      })
      .returning()

    return this.mapToTopic(result)
  }

  async removeTopic(categoryId: string, topicId: string): Promise<boolean> {
    const result = await this.db
      .delete(topics)
      .where(
        and(
          eq(topics.id, topicId),
          eq(topics.categoryId, categoryId)
        )
      )
      .returning({ id: topics.id })

    return result.length > 0
  }

  private mapToCategory(row: any): Category {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description || undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
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