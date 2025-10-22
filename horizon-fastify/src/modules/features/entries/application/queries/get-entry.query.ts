import { Query, QueryHandler } from '@modules/platform/cqrs/query-bus';

// Query definition
export class GetEntryQuery extends Query {
  constructor(
    public readonly entryId: string,
    public readonly includeAuthor: boolean = false,
    public readonly includeTags: boolean = true,
    metadata?: any
  ) {
    super(metadata);
  }
}

// Query result - Read model optimized for display
export interface EntryReadModel {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  tags: string[];
  status: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

// Query handler
export class GetEntryQueryHandler extends QueryHandler<GetEntryQuery, EntryReadModel | null> {
  constructor(
    private readRepository: any // Use actual read repository
  ) {
    super();
  }

  async execute(query: GetEntryQuery): Promise<EntryReadModel | null> {
    // Fetch from read model (optimized for queries)
    const entry = await this.readRepository.findById(query.entryId);

    if (!entry) {
      return null;
    }

    // Build read model
    const readModel: EntryReadModel = {
      id: entry.id,
      title: entry.title,
      content: entry.content,
      excerpt: this.generateExcerpt(entry.content),
      authorId: entry.authorId,
      tags: entry.tags || [],
      status: entry.status,
      viewCount: entry.viewCount || 0,
      likeCount: entry.likeCount || 0,
      commentCount: entry.commentCount || 0,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      publishedAt: entry.publishedAt
    };

    // Include author if requested
    if (query.includeAuthor) {
      readModel.author = await this.fetchAuthor(entry.authorId);
    }

    // Include tags if requested
    if (query.includeTags) {
      readModel.tags = await this.fetchTags(entry.id);
    }

    // Increment view count asynchronously (fire and forget)
    this.incrementViewCount(entry.id).catch(console.error);

    return readModel;
  }

  private generateExcerpt(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength).trim() + '...';
  }

  private async fetchAuthor(authorId: string): Promise<any> {
    // Fetch author details from cache or database
    return {
      id: authorId,
      name: 'Author Name',
      avatar: '/avatars/default.png'
    };
  }

  private async fetchTags(entryId: string): Promise<string[]> {
    // Fetch tags from read model
    return ['tag1', 'tag2'];
  }

  private async incrementViewCount(entryId: string): Promise<void> {
    // Increment view count in background
    await this.readRepository.incrementViewCount(entryId);
  }
}