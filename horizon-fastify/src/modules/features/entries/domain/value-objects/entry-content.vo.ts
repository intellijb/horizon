/**
 * EntryContent Value Object
 * Manages content validation, sanitization, and analysis
 */
export class EntryContent {
  private static readonly MIN_LENGTH = 1;
  private static readonly MAX_LENGTH = 100000; // 100K characters

  private constructor(
    public readonly value: string,
    public readonly wordCount: number,
    public readonly readingTime: number // in minutes
  ) {
    Object.freeze(this);
  }

  static create(content: string): EntryContent {
    if (!content || content.trim().length === 0) {
      throw new Error('Entry content cannot be empty');
    }

    const sanitizedContent = this.sanitize(content);

    if (sanitizedContent.length < this.MIN_LENGTH) {
      throw new Error(`Entry content must be at least ${this.MIN_LENGTH} character`);
    }

    if (sanitizedContent.length > this.MAX_LENGTH) {
      throw new Error(`Entry content must not exceed ${this.MAX_LENGTH} characters`);
    }

    const wordCount = this.calculateWordCount(sanitizedContent);
    const readingTime = this.calculateReadingTime(wordCount);

    return new EntryContent(sanitizedContent, wordCount, readingTime);
  }

  private static sanitize(content: string): string {
    // Basic HTML sanitization - in production use a proper library like DOMPurify
    let sanitized = content;

    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove on* event handlers
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Trim excessive whitespace
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

    return sanitized.trim();
  }

  private static calculateWordCount(content: string): number {
    // Remove HTML tags for word count
    const plainText = content.replace(/<[^>]*>/g, '');
    const words = plainText.match(/\b\w+\b/g);
    return words ? words.length : 0;
  }

  private static calculateReadingTime(wordCount: number): number {
    const WORDS_PER_MINUTE = 200;
    return Math.ceil(wordCount / WORDS_PER_MINUTE);
  }

  isValid(): boolean {
    return this.value.length >= EntryContent.MIN_LENGTH &&
           this.value.length <= EntryContent.MAX_LENGTH;
  }

  isEmpty(): boolean {
    const plainText = this.value.replace(/<[^>]*>/g, '').trim();
    return plainText.length === 0;
  }

  equals(other: EntryContent): boolean {
    return this.value === other.value;
  }

  hasSignificantChanges(other: EntryContent): boolean {
    // Consider changes significant if more than 20% of content changed
    const similarity = this.calculateSimilarity(other);
    return similarity < 0.8;
  }

  private calculateSimilarity(other: EntryContent): number {
    // Simple similarity calculation - in production use proper algorithm
    const a = this.value;
    const b = other.value;

    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Simple character-based similarity
    let matches = 0;
    const minLength = Math.min(a.length, b.length);
    const maxLength = Math.max(a.length, b.length);

    for (let i = 0; i < minLength; i++) {
      if (a[i] === b[i]) matches++;
    }

    return matches / maxLength;
  }

  getExcerpt(maxLength: number = 200, stripHtml: boolean = true): string {
    let text = this.value;

    if (stripHtml) {
      text = text.replace(/<[^>]*>/g, '');
    }

    if (text.length <= maxLength) {
      return text;
    }

    // Try to cut at word boundary
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace).trim() + '...';
    }

    return truncated.trim() + '...';
  }

  getPlainText(): string {
    return this.value.replace(/<[^>]*>/g, '');
  }

  toString(): string {
    return this.value;
  }
}