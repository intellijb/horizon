import { EventEmitter } from 'events';

export interface OutboxMessage {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  createdAt: Date;
  processedAt?: Date;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  error?: string;
}

export interface IOutboxRepository {
  save(message: OutboxMessage): Promise<void>;
  saveMany(messages: OutboxMessage[]): Promise<void>;
  getUnprocessed(limit: number): Promise<OutboxMessage[]>;
  markAsProcessed(id: string): Promise<void>;
  markAsFailed(id: string, error: string): Promise<void>;
  incrementRetryCount(id: string): Promise<void>;
  deleteOldProcessed(olderThan: Date): Promise<void>;
}

export class OutboxPattern extends EventEmitter {
  private processing = false;
  private pollInterval?: NodeJS.Timeout;

  constructor(
    private repository: IOutboxRepository,
    private publisher: (message: OutboxMessage) => Promise<void>,
    private options: {
      pollIntervalMs?: number;
      batchSize?: number;
      maxRetries?: number;
      processingTimeout?: number;
    } = {}
  ) {
    super();
    this.options = {
      pollIntervalMs: options.pollIntervalMs || 5000,
      batchSize: options.batchSize || 10,
      maxRetries: options.maxRetries || 3,
      processingTimeout: options.processingTimeout || 30000
    };
  }

  async start(): Promise<void> {
    if (this.pollInterval) {
      return; // Already started
    }

    this.pollInterval = setInterval(() => {
      this.processOutboxMessages().catch(error => {
        this.emit('error', error);
      });
    }, this.options.pollIntervalMs);

    this.emit('started');

    // Process immediately
    await this.processOutboxMessages();
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
    this.emit('stopped');
  }

  async addMessage(
    aggregateId: string,
    eventType: string,
    payload: any
  ): Promise<string> {
    const message: OutboxMessage = {
      id: this.generateId(),
      aggregateId,
      eventType,
      payload,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: this.options.maxRetries!,
      status: 'pending'
    };

    await this.repository.save(message);
    this.emit('message-added', message);

    return message.id;
  }

  async addMessages(messages: Array<{
    aggregateId: string;
    eventType: string;
    payload: any;
  }>): Promise<string[]> {
    const outboxMessages: OutboxMessage[] = messages.map(m => ({
      id: this.generateId(),
      aggregateId: m.aggregateId,
      eventType: m.eventType,
      payload: m.payload,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: this.options.maxRetries!,
      status: 'pending'
    }));

    await this.repository.saveMany(outboxMessages);
    this.emit('messages-added', { count: outboxMessages.length });

    return outboxMessages.map(m => m.id);
  }

  private async processOutboxMessages(): Promise<void> {
    if (this.processing) {
      return; // Already processing
    }

    this.processing = true;

    try {
      const messages = await this.repository.getUnprocessed(this.options.batchSize!);

      if (messages.length === 0) {
        return;
      }

      this.emit('processing-batch', { count: messages.length });

      const results = await Promise.allSettled(
        messages.map(message => this.processMessage(message))
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      this.emit('batch-processed', { succeeded, failed });
    } catch (error) {
      this.emit('error', error);
    } finally {
      this.processing = false;
    }
  }

  private async processMessage(message: OutboxMessage): Promise<void> {
    try {
      // Set timeout for processing
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), this.options.processingTimeout);
      });

      await Promise.race([
        this.publisher(message),
        timeoutPromise
      ]);

      await this.repository.markAsProcessed(message.id);
      this.emit('message-processed', message);
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (message.retryCount < message.maxRetries) {
        await this.repository.incrementRetryCount(message.id);
        this.emit('message-retry', { message, error: errorMessage });
      } else {
        await this.repository.markAsFailed(message.id, errorMessage);
        this.emit('message-failed', { message, error: errorMessage });
      }

      throw error;
    }
  }

  async cleanup(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    await this.repository.deleteOldProcessed(cutoffDate);
    this.emit('cleanup-completed', { cutoffDate });
  }

  private generateId(): string {
    return `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// In-memory implementation for testing
export class InMemoryOutboxRepository implements IOutboxRepository {
  private messages = new Map<string, OutboxMessage>();

  async save(message: OutboxMessage): Promise<void> {
    this.messages.set(message.id, message);
  }

  async saveMany(messages: OutboxMessage[]): Promise<void> {
    for (const message of messages) {
      this.messages.set(message.id, message);
    }
  }

  async getUnprocessed(limit: number): Promise<OutboxMessage[]> {
    const unprocessed = Array.from(this.messages.values())
      .filter(m => m.status === 'pending' ||
              (m.status === 'processing' && m.retryCount < m.maxRetries))
      .slice(0, limit);

    // Mark as processing
    for (const message of unprocessed) {
      message.status = 'processing';
    }

    return unprocessed;
  }

  async markAsProcessed(id: string): Promise<void> {
    const message = this.messages.get(id);
    if (message) {
      message.status = 'processed';
      message.processedAt = new Date();
    }
  }

  async markAsFailed(id: string, error: string): Promise<void> {
    const message = this.messages.get(id);
    if (message) {
      message.status = 'failed';
      message.error = error;
    }
  }

  async incrementRetryCount(id: string): Promise<void> {
    const message = this.messages.get(id);
    if (message) {
      message.retryCount++;
      message.status = 'pending'; // Reset to pending for retry
    }
  }

  async deleteOldProcessed(olderThan: Date): Promise<void> {
    for (const [id, message] of this.messages.entries()) {
      if (message.status === 'processed' &&
          message.processedAt &&
          message.processedAt < olderThan) {
        this.messages.delete(id);
      }
    }
  }
}