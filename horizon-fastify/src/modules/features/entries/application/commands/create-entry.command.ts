import { Command, CommandHandler } from '@modules/platform/cqrs/command-bus';
import { IEventBus } from '@modules/platform/events';

// Command definition
export class CreateEntryCommand extends Command {
  constructor(
    public readonly title: string,
    public readonly content: string,
    public readonly authorId: string,
    public readonly tags?: string[],
    metadata?: any
  ) {
    super(metadata);
  }
}

// Command result
export interface CreateEntryResult {
  id: string;
  title: string;
  createdAt: Date;
}

// Command handler
export class CreateEntryCommandHandler extends CommandHandler<CreateEntryCommand, CreateEntryResult> {
  constructor(
    private repository: any, // Use actual repository interface
    eventBus?: IEventBus
  ) {
    super(eventBus);
  }

  async execute(command: CreateEntryCommand): Promise<CreateEntryResult> {
    // Validate command
    this.validateCommand(command);

    // Create entry entity
    const entry = {
      id: this.generateId(),
      title: command.title,
      content: command.content,
      authorId: command.authorId,
      tags: command.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft'
    };

    // Save to write model
    await this.repository.save(entry);

    // Publish domain event
    await this.publishEvent({
      eventType: 'EntryCreated',
      aggregateId: entry.id,
      payload: entry,
      userId: command.authorId,
      correlationId: command.correlationId
    });

    return {
      id: entry.id,
      title: entry.title,
      createdAt: entry.createdAt
    };
  }

  private validateCommand(command: CreateEntryCommand): void {
    if (!command.title || command.title.trim().length === 0) {
      throw new Error('Entry title is required');
    }
    if (!command.content || command.content.trim().length === 0) {
      throw new Error('Entry content is required');
    }
    if (!command.authorId) {
      throw new Error('Author ID is required');
    }
    if (command.title.length > 200) {
      throw new Error('Entry title must be less than 200 characters');
    }
  }

  private generateId(): string {
    return `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}