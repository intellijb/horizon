import { IProjectionBuilder } from '@modules/platform/cqrs/core/interfaces';

// Projection for list view (optimized for queries)
export interface EntryListProjection {
  entries: EntryListItem[];
  totalCount: number;
  lastUpdated: Date;
}

export interface EntryListItem {
  id: string;
  title: string;
  excerpt: string;
  authorName: string;
  authorAvatar?: string;
  tags: string[];
  status: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt?: Date;
  featured: boolean;
  thumbnailUrl?: string;
}

// Projection builder that creates read-optimized views from events
export class EntryListProjectionBuilder implements IProjectionBuilder {
  async build(events: any[]): Promise<EntryListProjection> {
    const projection: EntryListProjection = {
      entries: [],
      totalCount: 0,
      lastUpdated: new Date()
    };

    for (const event of events) {
      await this.update(projection, event);
    }

    return projection;
  }

  async update(projection: EntryListProjection, event: any): Promise<EntryListProjection> {
    switch (event.eventType) {
      case 'EntryCreated':
        await this.handleEntryCreated(projection, event);
        break;
      case 'EntryUpdated':
        await this.handleEntryUpdated(projection, event);
        break;
      case 'EntryPublished':
        await this.handleEntryPublished(projection, event);
        break;
      case 'EntryDeleted':
        await this.handleEntryDeleted(projection, event);
        break;
      case 'EntryViewed':
        await this.handleEntryViewed(projection, event);
        break;
      case 'EntryLiked':
        await this.handleEntryLiked(projection, event);
        break;
      case 'CommentAdded':
        await this.handleCommentAdded(projection, event);
        break;
    }

    projection.lastUpdated = new Date();
    return projection;
  }

  private async handleEntryCreated(projection: EntryListProjection, event: any): Promise<void> {
    const newEntry: EntryListItem = {
      id: event.payload.id,
      title: event.payload.title,
      excerpt: this.createExcerpt(event.payload.content),
      authorName: await this.getAuthorName(event.payload.authorId),
      tags: event.payload.tags || [],
      status: 'draft',
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      featured: false
    };

    projection.entries.push(newEntry);
    projection.totalCount++;
  }

  private async handleEntryUpdated(projection: EntryListProjection, event: any): Promise<void> {
    const entry = projection.entries.find(e => e.id === event.aggregateId);
    if (entry) {
      if (event.payload.title) entry.title = event.payload.title;
      if (event.payload.content) entry.excerpt = this.createExcerpt(event.payload.content);
      if (event.payload.tags) entry.tags = event.payload.tags;
    }
  }

  private async handleEntryPublished(projection: EntryListProjection, event: any): Promise<void> {
    const entry = projection.entries.find(e => e.id === event.aggregateId);
    if (entry) {
      entry.status = 'published';
      entry.publishedAt = event.timestamp;
    }
  }

  private async handleEntryDeleted(projection: EntryListProjection, event: any): Promise<void> {
    const index = projection.entries.findIndex(e => e.id === event.aggregateId);
    if (index !== -1) {
      projection.entries.splice(index, 1);
      projection.totalCount--;
    }
  }

  private async handleEntryViewed(projection: EntryListProjection, event: any): Promise<void> {
    const entry = projection.entries.find(e => e.id === event.aggregateId);
    if (entry) {
      entry.viewCount++;
    }
  }

  private async handleEntryLiked(projection: EntryListProjection, event: any): Promise<void> {
    const entry = projection.entries.find(e => e.id === event.aggregateId);
    if (entry) {
      entry.likeCount++;
    }
  }

  private async handleCommentAdded(projection: EntryListProjection, event: any): Promise<void> {
    const entry = projection.entries.find(e => e.id === event.payload.entryId);
    if (entry) {
      entry.commentCount++;
    }
  }

  private createExcerpt(content: string, maxLength: number = 150): string {
    const plainText = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
    if (plainText.length <= maxLength) {
      return plainText;
    }
    return plainText.substring(0, maxLength).trim() + '...';
  }

  private async getAuthorName(authorId: string): Promise<string> {
    // In real implementation, fetch from cache or database
    return `Author ${authorId}`;
  }
}

// Materialized view repository for fast queries
export class EntryListProjectionRepository {
  private projections = new Map<string, EntryListProjection>();

  async save(key: string, projection: EntryListProjection): Promise<void> {
    this.projections.set(key, projection);
    // In production, save to Redis or database
  }

  async get(key: string): Promise<EntryListProjection | null> {
    return this.projections.get(key) || null;
    // In production, fetch from Redis or database
  }

  async query(filters: {
    status?: string;
    tags?: string[];
    authorId?: string;
    featured?: boolean;
  }): Promise<EntryListItem[]> {
    // In production, use optimized database queries
    const projection = this.projections.get('default');
    if (!projection) return [];

    let results = [...projection.entries];

    if (filters.status) {
      results = results.filter(e => e.status === filters.status);
    }
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(e =>
        filters.tags!.some(tag => e.tags.includes(tag))
      );
    }
    if (filters.featured !== undefined) {
      results = results.filter(e => e.featured === filters.featured);
    }

    return results;
  }
}