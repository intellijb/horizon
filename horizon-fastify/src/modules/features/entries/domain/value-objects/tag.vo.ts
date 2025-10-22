/**
 * Tag Value Object
 * Represents a tag with validation and normalization
 */
export class Tag {
  private static readonly MIN_LENGTH = 2;
  private static readonly MAX_LENGTH = 30;
  private static readonly VALID_PATTERN = /^[a-zA-Z0-9-]+$/;

  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  static create(tag: string): Tag {
    if (!tag || tag.trim().length === 0) {
      throw new Error('Tag cannot be empty');
    }

    const normalized = this.normalize(tag);

    if (normalized.length < this.MIN_LENGTH) {
      throw new Error(`Tag must be at least ${this.MIN_LENGTH} characters`);
    }

    if (normalized.length > this.MAX_LENGTH) {
      throw new Error(`Tag must not exceed ${this.MAX_LENGTH} characters`);
    }

    if (!this.VALID_PATTERN.test(normalized)) {
      throw new Error('Tag can only contain letters, numbers, and hyphens');
    }

    return new Tag(normalized);
  }

  private static normalize(tag: string): string {
    return tag
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '')     // Remove invalid characters
      .replace(/-+/g, '-')             // Replace multiple hyphens with single
      .replace(/^-|-$/g, '');          // Remove leading/trailing hyphens
  }

  equals(other: Tag): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toDisplayString(): string {
    // Convert to display format (capitalize first letter)
    return this.value.charAt(0).toUpperCase() + this.value.slice(1);
  }
}