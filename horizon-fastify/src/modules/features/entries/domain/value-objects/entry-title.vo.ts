/**
 * EntryTitle Value Object
 * Encapsulates title validation and formatting rules
 */
export class EntryTitle {
  private static readonly MIN_LENGTH = 1;
  private static readonly MAX_LENGTH = 200;

  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  static create(title: string): EntryTitle {
    if (!title || title.trim().length === 0) {
      throw new Error('Entry title cannot be empty');
    }

    const trimmedTitle = title.trim();

    if (trimmedTitle.length < this.MIN_LENGTH) {
      throw new Error(`Entry title must be at least ${this.MIN_LENGTH} character`);
    }

    if (trimmedTitle.length > this.MAX_LENGTH) {
      throw new Error(`Entry title must not exceed ${this.MAX_LENGTH} characters`);
    }

    if (this.containsProfanity(trimmedTitle)) {
      throw new Error('Entry title contains inappropriate content');
    }

    return new EntryTitle(this.sanitize(trimmedTitle));
  }

  private static sanitize(title: string): string {
    // Remove excessive whitespace
    return title.replace(/\s+/g, ' ').trim();
  }

  private static containsProfanity(text: string): boolean {
    // Simplified profanity check - in production, use a proper library
    const profanityList = ['badword1', 'badword2'];
    const lowerText = text.toLowerCase();
    return profanityList.some(word => lowerText.includes(word));
  }

  isValid(): boolean {
    return this.value.length >= EntryTitle.MIN_LENGTH &&
           this.value.length <= EntryTitle.MAX_LENGTH;
  }

  equals(other: EntryTitle): boolean {
    return this.value === other.value;
  }

  getSlug(): string {
    return this.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  getExcerpt(maxLength: number = 50): string {
    if (this.value.length <= maxLength) {
      return this.value;
    }
    return this.value.substring(0, maxLength).trim() + '...';
  }

  toString(): string {
    return this.value;
  }
}