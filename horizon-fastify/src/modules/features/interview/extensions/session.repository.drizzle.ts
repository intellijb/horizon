import { eq, and, sql, desc, asc, inArray } from "drizzle-orm"
import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "@modules/platform/database/schema"
import { sessions, interviewers } from "./schema/interview.schema"
import { Session } from "../domain/types"

type Database = NodePgDatabase<typeof schema>

export class SessionRepositoryDrizzle {
  constructor(private db: Database) {}

  async create(sessionData: Omit<Session, "id" | "createdAt" | "updatedAt">): Promise<Session> {
    const [result] = await this.db
      .insert(sessions)
      .values({
        userId: sessionData.userId,
        topicIds: sessionData.topicIds || [],
        title: sessionData.title,
        progress: sessionData.progress || 0,
        score: sessionData.score || 0,
        targetScore: sessionData.targetScore || 100,
        interviewerId: sessionData.interviewerId,
        conversationId: sessionData.conversationId || null,
        status: sessionData.status || "draft",
        retryPolicy: sessionData.retryPolicy || null,
        labels: sessionData.labels || null,
        notes: sessionData.notes || null,
        language: sessionData.language || "ko",
        difficulty: sessionData.difficulty || null,
        lastInteractionAt: sessionData.lastInteractionAt ? new Date(sessionData.lastInteractionAt) : null,
      })
      .returning()

    return this.mapToSession(result)
  }

  async findById(id: string): Promise<Session | null> {
    const results = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)

    if (results.length === 0) return null

    return this.mapToSession(results[0])
  }

  async update(id: string, updates: Partial<Omit<Session, "id" | "createdAt">>): Promise<Session | null> {
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (updates.topicIds !== undefined) updateData.topicIds = updates.topicIds
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.progress !== undefined) updateData.progress = updates.progress
    if (updates.score !== undefined) updateData.score = updates.score
    if (updates.targetScore !== undefined) updateData.targetScore = updates.targetScore
    if (updates.interviewerId !== undefined) updateData.interviewerId = updates.interviewerId
    if (updates.conversationId !== undefined) updateData.conversationId = updates.conversationId
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.retryPolicy !== undefined) updateData.retryPolicy = updates.retryPolicy
    if (updates.labels !== undefined) updateData.labels = updates.labels
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.language !== undefined) updateData.language = updates.language
    if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty
    if (updates.lastInteractionAt !== undefined) {
      updateData.lastInteractionAt = updates.lastInteractionAt ? new Date(updates.lastInteractionAt) : null
    }

    const [result] = await this.db
      .update(sessions)
      .set(updateData)
      .where(eq(sessions.id, id))
      .returning()

    if (!result) return null

    return this.mapToSession(result)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(sessions)
      .where(eq(sessions.id, id))
      .returning({ id: sessions.id })

    return result.length > 0
  }

  async list(filters?: {
    userId?: string
    status?: Session["status"]
    interviewerId?: string
    language?: Session["language"]
    limit?: number
    offset?: number
  }): Promise<Session[]> {
    const conditions: any[] = []

    if (filters?.userId) {
      conditions.push(eq(sessions.userId, filters.userId))
    }

    if (filters?.status) {
      conditions.push(eq(sessions.status, filters.status))
    }

    if (filters?.interviewerId) {
      conditions.push(eq(sessions.interviewerId, filters.interviewerId))
    }

    if (filters?.language) {
      conditions.push(eq(sessions.language, filters.language))
    }

    let query = this.db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))

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

    return results.map(this.mapToSession)
  }

  async findByInterviewerId(interviewerId: string): Promise<Session[]> {
    const results = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.interviewerId, interviewerId))
      .orderBy(desc(sessions.createdAt))

    return results.map(this.mapToSession)
  }

  async findActiveSessionsByInterviewer(interviewerId: string): Promise<Session[]> {
    const results = await this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.interviewerId, interviewerId),
          inArray(sessions.status, ["active", "paused"])
        )
      )
      .orderBy(desc(sessions.updatedAt))

    return results.map(this.mapToSession)
  }

  private mapToSession(row: any): Session {
    return {
      id: row.id,
      userId: row.userId,
      topicIds: row.topicIds || [],
      title: row.title,
      progress: row.progress,
      score: row.score,
      targetScore: row.targetScore,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      lastInteractionAt: row.lastInteractionAt?.toISOString() || undefined,
      interviewerId: row.interviewerId,
      conversationId: row.conversationId || undefined,
      status: row.status,
      retryPolicy: row.retryPolicy || undefined,
      labels: row.labels || undefined,
      notes: row.notes || undefined,
      language: row.language || undefined,
      difficulty: row.difficulty || undefined,
    }
  }
}