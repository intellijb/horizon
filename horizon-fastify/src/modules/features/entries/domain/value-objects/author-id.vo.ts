/**
 * AuthorId Value Object
 * Ensures valid author identifiers
 */
export class AuthorId {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  static create(id: string): AuthorId {
    if (!id || id.trim().length === 0) {
      throw new Error('AuthorId cannot be empty');
    }

    if (!this.isValidFormat(id)) {
      throw new Error(`Invalid AuthorId format: ${id}`);
    }

    return new AuthorId(id);
  }

  private static isValidFormat(id: string): boolean {
    // Assuming UUID or custom format validation
    // Simple validation for now - can be enhanced
    return id.length >= 3 && id.length <= 100;
  }

  equals(other: AuthorId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}