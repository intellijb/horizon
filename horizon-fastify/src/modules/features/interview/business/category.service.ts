import { Category, Topic } from '../domain/types';
import { CategoryRepositoryDrizzle } from '../extensions/category.repository.drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@modules/platform/database/schema';

export class CategoryService {
  private repository: CategoryRepositoryDrizzle;

  constructor(db: NodePgDatabase<typeof schema>) {
    this.repository = new CategoryRepositoryDrizzle(db);
  }

  async createCategory(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    return this.repository.create(categoryData);
  }

  async getCategory(id: string): Promise<Category | null> {
    return this.repository.findById(id);
  }

  async updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<Category | null> {
    return this.repository.update(id, updates);
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  async listCategories(filters?: {
    type?: Category['type'];
  }): Promise<Category[]> {
    return this.repository.list(filters);
  }

  async getCategoryWithTopics(id: string): Promise<Category | null> {
    return this.repository.findByIdWithTopics(id);
  }

  async addTopicToCategory(categoryId: string, topic: Omit<Topic, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>): Promise<Topic | null> {
    return this.repository.addTopic(categoryId, topic);
  }

  async removeTopicFromCategory(categoryId: string, topicId: string): Promise<boolean> {
    return this.repository.removeTopic(categoryId, topicId);
  }

  async listCategoriesWithTopics(filters?: {
    type?: Category['type'];
  }): Promise<Category[]> {
    return this.repository.listWithTopics(filters);
  }
}