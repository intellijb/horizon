/**
 * EntryId Value Object
 * Ensures valid entry identifiers with immutability
 */
export class EntryId {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  static create(id: string): EntryId {
    if (!id || id.trim().length === 0) {
      throw new Error('EntryId cannot be empty');
    }

    if (!this.isValidFormat(id)) {
      throw new Error(`Invalid EntryId format: ${id}`);
    }

    return new EntryId(id);
  }

  static generate(): EntryId {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return new EntryId(`entry_${timestamp}_${random}`);
  }

  private static isValidFormat(id: string): boolean {
    // Entry ID should match pattern: entry_timestamp_random
    return /^entry_\d+_[a-z0-9]+$/.test(id);
  }

  equals(other: EntryId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}