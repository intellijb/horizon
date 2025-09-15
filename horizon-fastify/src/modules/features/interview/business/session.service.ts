import { Session } from '../domain/types';
import { SessionRepositoryDrizzle } from '../extensions/session.repository.drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@modules/platform/database/schema';

export class SessionService {
  private repository: SessionRepositoryDrizzle;

  constructor(db: NodePgDatabase<typeof schema>) {
    this.repository = new SessionRepositoryDrizzle(db);
  }

  async createSession(sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session> {
    return this.repository.create(sessionData);
  }

  async getSession(id: string): Promise<Session | null> {
    return this.repository.findById(id);
  }

  async updateSession(id: string, updates: Partial<Omit<Session, 'id' | 'createdAt'>>): Promise<Session | null> {
    return this.repository.update(id, updates);
  }

  async deleteSession(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  async listSessions(filters?: {
    userId?: string;
    status?: Session['status'];
    interviewerId?: string;
    language?: Session['language'];
  }): Promise<Session[]> {
    return this.repository.list(filters);
  }

  async updateProgress(id: string, progress: number, score?: number): Promise<Session | null> {
    const updates: Partial<Session> = {
      progress,
      updatedAt: new Date().toISOString(),
      lastInteractionAt: new Date().toISOString(),
    };

    if (score !== undefined) {
      updates.score = score;
    }

    return this.updateSession(id, updates);
  }

  async pauseSession(id: string): Promise<Session | null> {
    return this.updateSession(id, {
      status: 'paused',
    });
  }

  async resumeSession(id: string): Promise<Session | null> {
    return this.updateSession(id, {
      status: 'active',
    });
  }

  async completeSession(id: string, finalScore: number): Promise<Session | null> {
    return this.updateSession(id, {
      status: 'completed',
      score: finalScore,
      progress: 100,
    });
  }

  async getActiveSessionsByInterviewer(interviewerId: string): Promise<Session[]> {
    return this.repository.findActiveSessionsByInterviewer(interviewerId);
  }
}