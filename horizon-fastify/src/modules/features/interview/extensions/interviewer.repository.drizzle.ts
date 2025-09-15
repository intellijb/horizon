import { eq, and, sql, desc, asc, or, like } from "drizzle-orm"
import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "@modules/platform/database/schema"
import { interviewers } from "./schema/interview.schema"
import { Interviewer } from "../domain/types"

type Database = NodePgDatabase<typeof schema>

export class InterviewerRepositoryDrizzle {
  constructor(private db: Database) {}

  async create(interviewerData: Omit<Interviewer, "id" | "createdAt" | "updatedAt">): Promise<Interviewer> {
    const [result] = await this.db
      .insert(interviewers)
      .values({
        displayName: interviewerData.displayName,
        company: interviewerData.company || null,
        role: interviewerData.role || null,
        seniority: interviewerData.seniority || null,
        typeCoverage: interviewerData.typeCoverage,
        topicIds: interviewerData.topicIds || [],
        style: interviewerData.style || null,
        difficulty: interviewerData.difficulty || null,
        knowledgeScope: interviewerData.knowledgeScope || null,
        promptTemplateId: interviewerData.promptTemplateId || null,
        language: interviewerData.language || "ko",
        timezone: interviewerData.timezone || null,
        version: interviewerData.version || "1.0.0",
      })
      .returning()

    return this.mapToInterviewer(result)
  }

  async findById(id: string): Promise<Interviewer | null> {
    const results = await this.db
      .select()
      .from(interviewers)
      .where(eq(interviewers.id, id))
      .limit(1)

    if (results.length === 0) return null

    return this.mapToInterviewer(results[0])
  }

  async update(id: string, updates: Partial<Omit<Interviewer, "id" | "createdAt">>): Promise<Interviewer | null> {
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (updates.displayName !== undefined) updateData.displayName = updates.displayName
    if (updates.company !== undefined) updateData.company = updates.company
    if (updates.role !== undefined) updateData.role = updates.role
    if (updates.seniority !== undefined) updateData.seniority = updates.seniority
    if (updates.typeCoverage !== undefined) updateData.typeCoverage = updates.typeCoverage
    if (updates.topicIds !== undefined) updateData.topicIds = updates.topicIds
    if (updates.style !== undefined) updateData.style = updates.style
    if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty
    if (updates.knowledgeScope !== undefined) updateData.knowledgeScope = updates.knowledgeScope
    if (updates.promptTemplateId !== undefined) updateData.promptTemplateId = updates.promptTemplateId
    if (updates.language !== undefined) updateData.language = updates.language
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone
    if (updates.version !== undefined) updateData.version = updates.version

    const [result] = await this.db
      .update(interviewers)
      .set(updateData)
      .where(eq(interviewers.id, id))
      .returning()

    if (!result) return null

    return this.mapToInterviewer(result)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(interviewers)
      .where(eq(interviewers.id, id))
      .returning({ id: interviewers.id })

    return result.length > 0
  }

  async list(filters?: {
    company?: string
    role?: string
    seniority?: Interviewer["seniority"]
    difficulty?: number
    language?: Interviewer["language"]
    limit?: number
    offset?: number
  }): Promise<Interviewer[]> {
    const conditions: any[] = []

    if (filters?.company) {
      conditions.push(eq(interviewers.company, filters.company))
    }

    if (filters?.role) {
      conditions.push(eq(interviewers.role, filters.role))
    }

    if (filters?.seniority) {
      conditions.push(eq(interviewers.seniority, filters.seniority))
    }

    if (filters?.difficulty) {
      conditions.push(eq(interviewers.difficulty, filters.difficulty))
    }

    if (filters?.language) {
      conditions.push(eq(interviewers.language, filters.language))
    }

    let query = this.db
      .select()
      .from(interviewers)
      .orderBy(asc(interviewers.displayName))

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

    return results.map(this.mapToInterviewer)
  }

  async findByTopics(topicIds: string[]): Promise<Interviewer[]> {
    const results = await this.db
      .select()
      .from(interviewers)
      .where(
        sql`${interviewers.topicIds}::jsonb ?| array[${sql.join(
          topicIds.map(id => sql`${id}`),
          sql`, `
        )}]`
      )
      .orderBy(asc(interviewers.displayName))

    return results.map(this.mapToInterviewer)
  }

  async findByTypeCoverage(types: ("tech" | "leadership" | "behavioral")[]): Promise<Interviewer[]> {
    const results = await this.db
      .select()
      .from(interviewers)
      .where(
        sql`${interviewers.typeCoverage}::jsonb ?| array[${sql.join(
          types.map(type => sql`${type}`),
          sql`, `
        )}]`
      )
      .orderBy(asc(interviewers.displayName))

    return results.map(this.mapToInterviewer)
  }

  async search(searchTerm: string): Promise<Interviewer[]> {
    const results = await this.db
      .select()
      .from(interviewers)
      .where(
        or(
          like(interviewers.displayName, `%${searchTerm}%`),
          like(interviewers.company, `%${searchTerm}%`),
          like(interviewers.role, `%${searchTerm}%`)
        )
      )
      .orderBy(asc(interviewers.displayName))

    return results.map(this.mapToInterviewer)
  }

  private mapToInterviewer(row: any): Interviewer {
    return {
      id: row.id,
      displayName: row.displayName,
      company: row.company || undefined,
      role: row.role || undefined,
      seniority: row.seniority || undefined,
      typeCoverage: row.typeCoverage,
      topicIds: row.topicIds || [],
      style: row.style || undefined,
      difficulty: row.difficulty || undefined,
      knowledgeScope: row.knowledgeScope || undefined,
      promptTemplateId: row.promptTemplateId || undefined,
      language: row.language || undefined,
      timezone: row.timezone || undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      version: row.version || undefined,
    }
  }
}