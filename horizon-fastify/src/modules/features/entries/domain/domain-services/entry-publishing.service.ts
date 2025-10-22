import { Entry } from '../aggregates/entry.aggregate';

/**
 * Domain Service for complex publishing logic
 * Handles business logic that doesn't naturally fit in a single aggregate
 */
export class EntryPublishingService {
  constructor(
    private readonly contentModerationService: IContentModerationService,
    private readonly seoService: ISeoService,
    private readonly notificationService: INotificationService
  ) {}

  async publishEntry(entry: Entry): Promise<PublishResult> {
    // Validate entry can be published
    if (!entry.canPublish()) {
      return {
        success: false,
        reason: 'Entry cannot be published in current state'
      };
    }

    // Check content moderation
    const moderationResult = await this.contentModerationService.checkContent(
      entry.toJSON().content
    );

    if (!moderationResult.isApproved) {
      return {
        success: false,
        reason: `Content moderation failed: ${moderationResult.reason}`,
        moderationFlags: moderationResult.flags
      };
    }

    // Generate SEO metadata
    const seoMetadata = await this.seoService.generateMetadata(entry);

    // Publish the entry
    entry.publish();

    // Send notifications asynchronously
    this.notificationService.notifyFollowers(entry.toJSON().authorId, {
      type: 'new_entry_published',
      entryId: entry.aggregateId,
      title: entry.toJSON().title
    }).catch(console.error);

    return {
      success: true,
      seoMetadata,
      publishedAt: new Date()
    };
  }

  async schedulePublication(
    entry: Entry,
    scheduledDate: Date
  ): Promise<ScheduleResult> {
    if (!entry.canPublish()) {
      return {
        success: false,
        reason: 'Entry cannot be scheduled for publication'
      };
    }

    if (scheduledDate <= new Date()) {
      return {
        success: false,
        reason: 'Scheduled date must be in the future'
      };
    }

    // In a real implementation, this would create a scheduled job
    return {
      success: true,
      scheduledDate,
      scheduleId: this.generateScheduleId()
    };
  }

  async bulkPublish(entries: Entry[]): Promise<BulkPublishResult> {
    const results: Array<{
      entryId: string;
      success: boolean;
      reason?: string;
    }> = [];

    for (const entry of entries) {
      const result = await this.publishEntry(entry);
      results.push({
        entryId: entry.aggregateId,
        success: result.success,
        reason: result.reason
      });
    }

    return {
      totalProcessed: entries.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results
    };
  }

  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Supporting interfaces

interface IContentModerationService {
  checkContent(content: string): Promise<ModerationResult>;
}

interface ModerationResult {
  isApproved: boolean;
  reason?: string;
  flags?: string[];
  confidence?: number;
}

interface ISeoService {
  generateMetadata(entry: Entry): Promise<SeoMetadata>;
}

interface SeoMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl?: string;
  ogImage?: string;
}

interface INotificationService {
  notifyFollowers(authorId: string, notification: any): Promise<void>;
}

interface PublishResult {
  success: boolean;
  reason?: string;
  seoMetadata?: SeoMetadata;
  publishedAt?: Date;
  moderationFlags?: string[];
}

interface ScheduleResult {
  success: boolean;
  reason?: string;
  scheduledDate?: Date;
  scheduleId?: string;
}

interface BulkPublishResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    entryId: string;
    success: boolean;
    reason?: string;
  }>;
}

// Mock implementations for demonstration

export class MockContentModerationService implements IContentModerationService {
  async checkContent(content: string): Promise<ModerationResult> {
    // Simulate content moderation
    const hasInappropriateContent = content.toLowerCase().includes('inappropriate');

    return {
      isApproved: !hasInappropriateContent,
      reason: hasInappropriateContent ? 'Inappropriate content detected' : undefined,
      flags: hasInappropriateContent ? ['inappropriate_content'] : [],
      confidence: 0.95
    };
  }
}

export class MockSeoService implements ISeoService {
  async generateMetadata(entry: Entry): Promise<SeoMetadata> {
    const data = entry.toJSON();
    return {
      title: data.title,
      description: data.content.substring(0, 160),
      keywords: data.tags || [],
      canonicalUrl: `/entries/${data.id}`
    };
  }
}

export class MockNotificationService implements INotificationService {
  async notifyFollowers(authorId: string, notification: any): Promise<void> {
    console.log(`Notifying followers of ${authorId}:`, notification);
  }
}