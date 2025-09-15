import { Topic } from '../domain/types';
import { TopicRepositoryDrizzle } from '../extensions/topic.repository.drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@modules/platform/database/schema';

export class TopicService {
  private repository: TopicRepositoryDrizzle;

  constructor(db: NodePgDatabase<typeof schema>) {
    this.repository = new TopicRepositoryDrizzle(db);
  }

  async createTopic(topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<Topic> {
    return this.repository.create(topicData);
  }

  async getTopic(id: string): Promise<Topic | null> {
    return this.repository.findById(id);
  }

  async updateTopic(id: string, updates: Partial<Omit<Topic, 'id' | 'createdAt'>>): Promise<Topic | null> {
    return this.repository.update(id, updates);
  }

  async deleteTopic(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  async listTopics(filters?: {
    categoryId?: string;
    difficulty?: number;
    tags?: string[];
  }): Promise<Topic[]> {
    return this.repository.list(filters);
  }

  async getTopicsByCategory(categoryId: string): Promise<Topic[]> {
    return this.repository.findByCategory(categoryId);
  }

  async getTopicsByTags(tags: string[]): Promise<Topic[]> {
    return this.repository.findByTags(tags);
  }

  async addTagsToTopic(id: string, tags: string[]): Promise<Topic | null> {
    return this.repository.addTags(id, tags);
  }

  async removeTagsFromTopic(id: string, tags: string[]): Promise<Topic | null> {
    return this.repository.removeTags(id, tags);
  }

  async getTopicsByIds(ids: string[]): Promise<Topic[]> {
    return this.repository.findByIds(ids);
  }

  async searchTopics(searchTerm: string): Promise<Topic[]> {
    return this.repository.search(searchTerm);
  }
}