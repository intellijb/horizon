const VALID_STATUSES = [
  'draft',
  'published',
  'archived',
  'deleted'
] as const;

type Status = typeof VALID_STATUSES[number];

/**
 * EntryStatus Value Object
 * Represents the lifecycle status of an entry
 */
export class EntryStatus {
  private static readonly VALID_STATUSES = VALID_STATUSES;

  private constructor(public readonly value: Status) {
    Object.freeze(this);
  }

  static draft(): EntryStatus {
    return new EntryStatus('draft');
  }

  static published(): EntryStatus {
    return new EntryStatus('published');
  }

  static archived(): EntryStatus {
    return new EntryStatus('archived');
  }

  static deleted(): EntryStatus {
    return new EntryStatus('deleted');
  }

  static fromString(status: string): EntryStatus {
    if (!this.isValidStatus(status)) {
      throw new Error(`Invalid entry status: ${status}`);
    }
    return new EntryStatus(status as Status);
  }

  private static isValidStatus(status: string): boolean {
    return this.VALID_STATUSES.includes(status as any);
  }

  isDraft(): boolean {
    return this.value === 'draft';
  }

  isPublished(): boolean {
    return this.value === 'published';
  }

  isArchived(): boolean {
    return this.value === 'archived';
  }

  isDeleted(): boolean {
    return this.value === 'deleted';
  }

  canTransitionTo(newStatus: EntryStatus): boolean {
    // Define valid state transitions
    const transitions: Record<Status, Status[]> = {
      draft: ['published', 'archived', 'deleted'],
      published: ['draft', 'archived', 'deleted'],
      archived: ['draft', 'deleted'],
      deleted: [] // Cannot transition from deleted
    };

    return transitions[this.value].includes(newStatus.value);
  }

  equals(other: EntryStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}