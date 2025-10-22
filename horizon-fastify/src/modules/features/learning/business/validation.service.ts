/**
 * Validation Service
 *
 * Provides domain-specific validation logic for the learning module.
 * Ensures business rules are enforced consistently across the application.
 */
export class ValidationService {
  /**
   * Validate category hierarchy rules
   */
  validateCategoryHierarchy(
    parentPath: string | null,
    currentLevel: number,
    maxDepth: number = 5
  ): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Check max depth
    if (currentLevel >= maxDepth) {
      errors.push(`Category depth cannot exceed ${maxDepth} levels`)
    }

    // Validate path format
    if (parentPath && !this.isValidPath(parentPath)) {
      errors.push('Invalid parent path format')
    }

    // Check for circular reference (simplified check)
    if (parentPath && parentPath.split('/').length !== currentLevel) {
      errors.push('Path length does not match category level')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate materialized path format
   */
  private isValidPath(path: string): boolean {
    // Path should start with / and contain only alphanumeric, hyphens, underscores
    const pathRegex = /^\/[a-zA-Z0-9-_]+(\/[a-zA-Z0-9-_]+)*$/
    return pathRegex.test(path)
  }

  /**
   * Validate problem content
   */
  validateProblemContent(
    content: string,
    solution: string,
    options?: {
      minContentLength?: number
      maxContentLength?: number
      requireExplanation?: boolean
    }
  ): {
    isValid: boolean
    errors: string[]
  } {
    const opts = {
      minContentLength: 10,
      maxContentLength: 10000,
      requireExplanation: false,
      ...options
    }

    const errors: string[] = []

    // Content validation
    if (content.length < opts.minContentLength) {
      errors.push(`Problem content must be at least ${opts.minContentLength} characters`)
    }

    if (content.length > opts.maxContentLength) {
      errors.push(`Problem content cannot exceed ${opts.maxContentLength} characters`)
    }

    // Solution validation
    if (!solution || solution.trim().length === 0) {
      errors.push('Solution is required')
    }

    // Check for potential issues
    if (this.containsSuspiciousContent(content) || this.containsSuspiciousContent(solution)) {
      errors.push('Content contains potentially harmful or inappropriate material')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check for suspicious content (basic check)
   */
  private containsSuspiciousContent(text: string): boolean {
    // Basic check for script tags or SQL injection attempts
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /INSERT\s+INTO/i
    ]

    return suspiciousPatterns.some(pattern => pattern.test(text))
  }

  /**
   * Validate submission attempt rules
   */
  validateSubmissionAttempt(
    attemptNumber: number,
    lastAttemptTime: Date | null,
    options?: {
      maxAttempts?: number
      cooldownMinutes?: number
    }
  ): {
    isValid: boolean
    errors: string[]
  } {
    const opts = {
      maxAttempts: 10,
      cooldownMinutes: 1,
      ...options
    }

    const errors: string[] = []

    // Check max attempts
    if (attemptNumber > opts.maxAttempts) {
      errors.push(`Maximum ${opts.maxAttempts} attempts allowed`)
    }

    // Check cooldown period
    if (lastAttemptTime && opts.cooldownMinutes > 0) {
      const minutesSinceLastAttempt =
        (Date.now() - lastAttemptTime.getTime()) / (1000 * 60)

      if (minutesSinceLastAttempt < opts.cooldownMinutes) {
        const remainingMinutes = Math.ceil(opts.cooldownMinutes - minutesSinceLastAttempt)
        errors.push(`Please wait ${remainingMinutes} minute(s) before next attempt`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate schedule parameters
   */
  validateScheduleParams(
    easeFactor: number,
    interval: number,
    repetitions: number
  ): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Validate ease factor (SM-2 range)
    if (easeFactor < 1.3 || easeFactor > 2.5) {
      errors.push('Ease factor must be between 1.3 and 2.5')
    }

    // Validate interval
    if (interval < 1 || interval > 365) {
      errors.push('Interval must be between 1 and 365 days')
    }

    // Validate repetitions
    if (repetitions < 0 || repetitions > 100) {
      errors.push('Repetitions must be between 0 and 100')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate tags
   */
  validateTags(
    tags: string[],
    options?: {
      maxTags?: number
      maxTagLength?: number
      allowedCharacters?: RegExp
    }
  ): {
    isValid: boolean
    errors: string[]
  } {
    const opts = {
      maxTags: 10,
      maxTagLength: 30,
      allowedCharacters: /^[a-zA-Z0-9-_]+$/,
      ...options
    }

    const errors: string[] = []

    // Check number of tags
    if (tags.length > opts.maxTags) {
      errors.push(`Maximum ${opts.maxTags} tags allowed`)
    }

    // Validate each tag
    tags.forEach((tag, index) => {
      if (tag.length > opts.maxTagLength) {
        errors.push(`Tag "${tag}" exceeds maximum length of ${opts.maxTagLength}`)
      }

      if (!opts.allowedCharacters.test(tag)) {
        errors.push(`Tag "${tag}" contains invalid characters`)
      }
    })

    // Check for duplicates
    const uniqueTags = new Set(tags)
    if (uniqueTags.size !== tags.length) {
      errors.push('Duplicate tags are not allowed')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate user eligibility for a problem
   */
  validateUserEligibility(
    userLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert',
    problemDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert',
    allowSkipping: boolean = false
  ): {
    isEligible: boolean
    reason?: string
  } {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert']
    const userLevelIndex = levels.indexOf(userLevel)
    const problemLevelIndex = levels.indexOf(problemDifficulty)

    // User can attempt problems at their level or below
    if (problemLevelIndex <= userLevelIndex) {
      return { isEligible: true }
    }

    // Check if skipping is allowed (one level up)
    if (allowSkipping && problemLevelIndex === userLevelIndex + 1) {
      return { isEligible: true }
    }

    return {
      isEligible: false,
      reason: `You need to reach ${problemDifficulty} level to attempt this problem`
    }
  }

  /**
   * Validate time spent on submission
   */
  validateTimeSpent(
    timeSpent: number,
    problemDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  ): {
    isValid: boolean
    warnings: string[]
  } {
    const warnings: string[] = []

    // Define expected time ranges by difficulty (in seconds)
    const expectedRanges = {
      beginner: { min: 30, max: 300 },     // 30s - 5min
      intermediate: { min: 60, max: 600 },  // 1min - 10min
      advanced: { min: 120, max: 1200 },    // 2min - 20min
      expert: { min: 180, max: 2400 }       // 3min - 40min
    }

    const range = expectedRanges[problemDifficulty]

    // Check for suspiciously fast completion
    if (timeSpent < range.min) {
      warnings.push('Completed unusually fast - ensure you read the problem carefully')
    }

    // Check for very long completion time
    if (timeSpent > range.max) {
      warnings.push('Took longer than expected - consider reviewing the concepts')
    }

    // Invalid time (negative or unrealistic)
    if (timeSpent < 0 || timeSpent > 86400) { // More than 24 hours
      return {
        isValid: false,
        warnings: ['Invalid time spent value']
      }
    }

    return {
      isValid: true,
      warnings
    }
  }
}

// Export singleton instance
export const validationService = new ValidationService()