/**
 * Spaced Repetition Service
 *
 * Implements the SM-2 (SuperMemo 2) algorithm for spaced repetition learning.
 * This service handles all calculations related to scheduling reviews based on
 * user performance.
 *
 * SM-2 Algorithm Overview:
 * - Quality of response is assessed on a scale from 0 to 5
 * - Intervals between repetitions are calculated based on ease factor
 * - Ease factor adjusts based on response quality
 */
export class SpacedRepetitionService {
  // SM-2 Algorithm Constants
  private readonly MIN_EASE_FACTOR = 1.3
  private readonly MAX_EASE_FACTOR = 2.5
  private readonly INITIAL_EASE_FACTOR = 2.5

  /**
   * Calculate the next review schedule using the SM-2 algorithm
   *
   * @param quality - User's response quality (0-5)
   *   0: Complete blackout
   *   1: Incorrect response, but remembered on seeing answer
   *   2: Incorrect response, but seemed easy to recall
   *   3: Correct response with difficulty
   *   4: Correct response after hesitation
   *   5: Perfect response
   * @param currentEaseFactor - Current ease factor (1.3-2.5)
   * @param currentInterval - Current interval in days
   * @param currentRepetitions - Number of consecutive successful repetitions
   * @returns Updated scheduling parameters and next review date
   */
  calculateNextReview(
    quality: number,
    currentEaseFactor: number = this.INITIAL_EASE_FACTOR,
    currentInterval: number = 1,
    currentRepetitions: number = 0
  ): {
    easeFactor: number
    interval: number
    repetitions: number
    nextReviewDate: Date
  } {
    // Validate quality input
    if (quality < 0 || quality > 5) {
      throw new Error('Quality must be between 0 and 5')
    }

    // Calculate new ease factor using SM-2 formula
    let newEaseFactor = this.calculateEaseFactor(currentEaseFactor, quality)

    // Determine interval and repetitions based on quality
    let newInterval: number
    let newRepetitions: number

    if (quality < 3) {
      // Failed response - reset to beginning
      newInterval = 1
      newRepetitions = 0
    } else {
      // Successful response - increase interval
      newRepetitions = currentRepetitions + 1

      if (newRepetitions === 1) {
        newInterval = 1
      } else if (newRepetitions === 2) {
        newInterval = 6
      } else {
        newInterval = Math.round(currentInterval * newEaseFactor)
      }
    }

    // Calculate next review date
    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval)
    nextReviewDate.setHours(0, 0, 0, 0) // Reset to start of day

    return {
      easeFactor: newEaseFactor,
      interval: newInterval,
      repetitions: newRepetitions,
      nextReviewDate
    }
  }

  /**
   * Calculate the new ease factor based on response quality
   * Uses the SM-2 formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
   */
  private calculateEaseFactor(currentEaseFactor: number, quality: number): number {
    const newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    // Clamp ease factor to valid range
    return Math.max(
      this.MIN_EASE_FACTOR,
      Math.min(this.MAX_EASE_FACTOR, newEaseFactor)
    )
  }

  /**
   * Determine if a problem is due for review
   */
  isDueForReview(nextReviewDate: Date, currentDate: Date = new Date()): boolean {
    // Reset times to compare dates only
    const reviewDate = new Date(nextReviewDate)
    reviewDate.setHours(0, 0, 0, 0)

    const today = new Date(currentDate)
    today.setHours(0, 0, 0, 0)

    return reviewDate <= today
  }

  /**
   * Calculate review statistics for a user's performance
   */
  calculateStatistics(
    totalAttempts: number,
    correctAttempts: number
  ): {
    accuracy: number
    masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    streak: number
  } {
    const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0

    // Determine mastery level based on accuracy
    let masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    if (accuracy >= 90) {
      masteryLevel = 'expert'
    } else if (accuracy >= 75) {
      masteryLevel = 'advanced'
    } else if (accuracy >= 50) {
      masteryLevel = 'intermediate'
    } else {
      masteryLevel = 'beginner'
    }

    // Calculate current streak (simplified - would need more data for accurate streak)
    const streak = Math.floor(accuracy / 20) // Simple heuristic

    return {
      accuracy,
      masteryLevel,
      streak
    }
  }

  /**
   * Get recommended difficulty for next problem based on performance
   */
  getRecommendedDifficulty(
    currentDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert',
    accuracy: number
  ): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'] as const
    const currentIndex = difficulties.indexOf(currentDifficulty)

    // Progress to harder difficulty if accuracy > 80%
    if (accuracy > 80 && currentIndex < difficulties.length - 1) {
      return difficulties[currentIndex + 1]
    }

    // Move to easier difficulty if accuracy < 40%
    if (accuracy < 40 && currentIndex > 0) {
      return difficulties[currentIndex - 1]
    }

    return currentDifficulty
  }
}

// Export singleton instance
export const spacedRepetitionService = new SpacedRepetitionService()