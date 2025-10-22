import { AggregateRoot, DomainEvent } from '@modules/platform/events/core/domain-event';
import { IEventMetadata } from '@modules/platform/events/core/types';
import { EntryId } from '../value-objects/entry-id.vo';
import { EntryTitle } from '../value-objects/entry-title.vo';
import { EntryContent } from '../value-objects/entry-content.vo';
import { EntryStatus } from '../value-objects/entry-status.vo';
import { AuthorId } from '../value-objects/author-id.vo';
import { Tag } from '../value-objects/tag.vo';

// Domain Events
export class EntryCreatedEvent extends DomainEvent {
  readonly eventType = 'EntryCreatedEvent';
  readonly version = 1;
  readonly topic = 'entries';

  constructor(
    public readonly entryId: string,
    public readonly title: string,
    public readonly authorId: string,
    metadata?: Partial<IEventMetadata>
  ) {
    super(metadata);
  }
}

export class EntryPublishedEvent extends DomainEvent {
  readonly eventType = 'EntryPublishedEvent';
  readonly version = 1;
  readonly topic = 'entries';

  constructor(
    public readonly entryId: string,
    metadata?: Partial<IEventMetadata>
  ) {
    super(metadata);
  }
}

export class EntryUpdatedEvent extends DomainEvent {
  readonly eventType = 'EntryUpdatedEvent';
  readonly version = 1;
  readonly topic = 'entries';

  constructor(
    public readonly entryId: string,
    public readonly changes: Partial<{
      title: string;
      content: string;
      tags: string[];
    }>,
    metadata?: Partial<IEventMetadata>
  ) {
    super(metadata);
  }
}

export class EntryDeletedEvent extends DomainEvent {
  readonly eventType = 'EntryDeletedEvent';
  readonly version = 1;
  readonly topic = 'entries';

  constructor(
    public readonly entryId: string,
    metadata?: Partial<IEventMetadata>
  ) {
    super(metadata);
  }
}

// Domain Errors
export class CannotPublishEntryError extends Error {
  constructor(reason: string) {
    super(`Cannot publish entry: ${reason}`);
    this.name = 'CannotPublishEntryError';
  }
}

export class InvalidEntryStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEntryStateError';
  }
}

/**
 * Entry Aggregate Root - Rich domain model with business logic
 */
export class Entry extends AggregateRoot {
  private constructor(
    private readonly id: EntryId,
    private title: EntryTitle,
    private content: EntryContent,
    private readonly authorId: AuthorId,
    private status: EntryStatus,
    private tags: Tag[],
    private readonly createdAt: Date,
    private updatedAt: Date,
    private publishedAt?: Date,
    private deletedAt?: Date
  ) {
    super();
  }

  // Factory method for creating new entries
  static create(
    authorId: string,
    title: string,
    content: string,
    tags: string[] = []
  ): Entry {
    const entry = new Entry(
      EntryId.generate(),
      EntryTitle.create(title),
      EntryContent.create(content),
      AuthorId.create(authorId),
      EntryStatus.draft(),
      tags.map(t => Tag.create(t)),
      new Date(),
      new Date()
    );

    // Add domain event
    entry.addEvent(new EntryCreatedEvent(
      entry.id.value,
      entry.title.value,
      entry.authorId.value
    ));

    return entry;
  }

  // Factory method for reconstituting from persistence
  static reconstitute(
    id: string,
    title: string,
    content: string,
    authorId: string,
    status: string,
    tags: string[],
    createdAt: Date,
    updatedAt: Date,
    publishedAt?: Date,
    deletedAt?: Date
  ): Entry {
    return new Entry(
      EntryId.create(id),
      EntryTitle.create(title),
      EntryContent.create(content),
      AuthorId.create(authorId),
      EntryStatus.fromString(status),
      tags.map(t => Tag.create(t)),
      createdAt,
      updatedAt,
      publishedAt,
      deletedAt
    );
  }

  // Business logic methods

  updateTitle(newTitle: string): void {
    this.ensureNotDeleted();
    const updatedTitle = EntryTitle.create(newTitle);

    if (!this.title.equals(updatedTitle)) {
      this.title = updatedTitle;
      this.updatedAt = new Date();

      this.addEvent(new EntryUpdatedEvent(
        this.id.value,
        { title: newTitle }
      ));
    }
  }

  updateContent(newContent: string): void {
    this.ensureNotDeleted();
    const updatedContent = EntryContent.create(newContent);

    if (!this.content.equals(updatedContent)) {
      this.content = updatedContent;
      this.updatedAt = new Date();

      // If published, might need to revert to draft
      if (this.status.isPublished() && this.content.hasSignificantChanges(updatedContent)) {
        this.status = EntryStatus.draft();
      }

      this.addEvent(new EntryUpdatedEvent(
        this.id.value,
        { content: newContent }
      ));
    }
  }

  addTag(tag: string): void {
    this.ensureNotDeleted();
    const newTag = Tag.create(tag);

    if (!this.tags.some(t => t.equals(newTag))) {
      this.tags.push(newTag);
      this.updatedAt = new Date();

      this.addEvent(new EntryUpdatedEvent(
        this.id.value,
        { tags: this.tags.map(t => t.value) }
      ));
    }
  }

  removeTag(tag: string): void {
    this.ensureNotDeleted();
    const tagToRemove = Tag.create(tag);
    const originalLength = this.tags.length;

    this.tags = this.tags.filter(t => !t.equals(tagToRemove));

    if (this.tags.length !== originalLength) {
      this.updatedAt = new Date();

      this.addEvent(new EntryUpdatedEvent(
        this.id.value,
        { tags: this.tags.map(t => t.value) }
      ));
    }
  }

  publish(): void {
    this.ensureNotDeleted();

    if (!this.canPublish()) {
      throw new CannotPublishEntryError(this.getPublishBlockReason());
    }

    this.status = EntryStatus.published();
    this.publishedAt = new Date();
    this.updatedAt = new Date();

    this.addEvent(new EntryPublishedEvent(this.id.value));
  }

  unpublish(): void {
    this.ensureNotDeleted();

    if (!this.status.isPublished()) {
      throw new InvalidEntryStateError('Entry is not published');
    }

    this.status = EntryStatus.draft();
    this.updatedAt = new Date();
  }

  archive(): void {
    this.ensureNotDeleted();
    this.status = EntryStatus.archived();
    this.updatedAt = new Date();
  }

  delete(): void {
    if (this.isDeleted()) {
      throw new InvalidEntryStateError('Entry is already deleted');
    }

    this.deletedAt = new Date();
    this.status = EntryStatus.deleted();

    this.addEvent(new EntryDeletedEvent(this.id.value));
  }

  restore(): void {
    if (!this.isDeleted()) {
      throw new InvalidEntryStateError('Entry is not deleted');
    }

    this.deletedAt = undefined;
    this.status = EntryStatus.draft();
    this.updatedAt = new Date();
  }

  // Query methods

  canPublish(): boolean {
    return this.status.isDraft() &&
           this.content.isValid() &&
           this.title.isValid() &&
           !this.isDeleted();
  }

  private getPublishBlockReason(): string {
    if (!this.status.isDraft()) return 'Entry is not in draft status';
    if (!this.content.isValid()) return 'Content is not valid';
    if (!this.title.isValid()) return 'Title is not valid';
    if (this.isDeleted()) return 'Entry is deleted';
    return 'Unknown reason';
  }

  isDeleted(): boolean {
    return this.deletedAt !== undefined;
  }

  isPublished(): boolean {
    return this.status.isPublished();
  }

  isDraft(): boolean {
    return this.status.isDraft();
  }

  isArchived(): boolean {
    return this.status.isArchived();
  }

  isOwnedBy(authorId: string): boolean {
    return this.authorId.equals(AuthorId.create(authorId));
  }

  hasTag(tag: string): boolean {
    const searchTag = Tag.create(tag);
    return this.tags.some(t => t.equals(searchTag));
  }

  private ensureNotDeleted(): void {
    if (this.isDeleted()) {
      throw new InvalidEntryStateError('Cannot perform operation on deleted entry');
    }
  }

  // Getters for persistence
  toJSON(): any {
    return {
      id: this.id.value,
      title: this.title.value,
      content: this.content.value,
      authorId: this.authorId.value,
      status: this.status.value,
      tags: this.tags.map(t => t.value),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      publishedAt: this.publishedAt,
      deletedAt: this.deletedAt
    };
  }

  get aggregateId(): string {
    return this.id.value;
  }

  // Protected method from AggregateRoot
  protected apply(event: any): void {
    if (event instanceof EntryCreatedEvent) {
      // State already set in constructor
    } else if (event instanceof EntryPublishedEvent) {
      this.status = EntryStatus.published();
      this.publishedAt = event.timestamp;
    } else if (event instanceof EntryUpdatedEvent) {
      if (event.changes.title) {
        this.title = EntryTitle.create(event.changes.title);
      }
      if (event.changes.content) {
        this.content = EntryContent.create(event.changes.content);
      }
      if (event.changes.tags) {
        this.tags = event.changes.tags.map(t => Tag.create(t));
      }
      this.updatedAt = event.timestamp;
    } else if (event instanceof EntryDeletedEvent) {
      this.status = EntryStatus.deleted();
      this.deletedAt = event.timestamp;
    }
  }
}