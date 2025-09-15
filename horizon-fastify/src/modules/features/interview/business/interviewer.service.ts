import { Interviewer } from '../domain/types';
import { InterviewerRepositoryDrizzle } from '../extensions/interviewer.repository.drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@modules/platform/database/schema';

export class InterviewerService {
  private repository: InterviewerRepositoryDrizzle;

  constructor(db: NodePgDatabase<typeof schema>) {
    this.repository = new InterviewerRepositoryDrizzle(db);
  }

  async createInterviewer(interviewerData: Omit<Interviewer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Interviewer> {
    return this.repository.create(interviewerData);
  }

  async getInterviewer(id: string): Promise<Interviewer | null> {
    return this.repository.findById(id);
  }

  async updateInterviewer(id: string, updates: Partial<Omit<Interviewer, 'id' | 'createdAt'>>): Promise<Interviewer | null> {
    return this.repository.update(id, updates);
  }

  async deleteInterviewer(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  async listInterviewers(filters?: {
    company?: string;
    role?: string;
    seniority?: Interviewer['seniority'];
    typeCoverage?: Interviewer['typeCoverage'];
    difficulty?: number;
    language?: Interviewer['language'];
  }): Promise<Interviewer[]> {
    // Handle typeCoverage separately if provided
    if (filters?.typeCoverage) {
      return this.repository.findByTypeCoverage(filters.typeCoverage);
    }

    return this.repository.list(filters);
  }

  async getInterviewersByTopics(topicIds: string[]): Promise<Interviewer[]> {
    return this.repository.findByTopics(topicIds);
  }

  async updateKnowledgeScope(id: string, knowledgeScope: Interviewer['knowledgeScope']): Promise<Interviewer | null> {
    return this.updateInterviewer(id, {
      knowledgeScope,
    });
  }

  async incrementVersion(id: string): Promise<Interviewer | null> {
    const interviewer = await this.getInterviewer(id);
    if (!interviewer) return null;

    const currentVersion = interviewer.version || '1.0.0';
    const versionParts = currentVersion.split('.').map(Number);
    versionParts[2]++;

    const newVersion = versionParts.join('.');

    return this.updateInterviewer(id, {
      version: newVersion,
    });
  }

  async searchInterviewers(searchTerm: string): Promise<Interviewer[]> {
    return this.repository.search(searchTerm);
  }
}