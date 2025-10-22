/**
 * Evaluation Service
 *
 * Handles the business logic for evaluating user submissions,
 * including scoring, grading, and generating feedback.
 * This service contains domain-specific evaluation rules.
 */
export class EvaluationService {
  // Grading thresholds
  private readonly PASSING_SCORE = 70
  private readonly EXCELLENCE_SCORE = 90

  /**
   * Evaluate a submission and determine if it's correct
   *
   * @param answer User's answer
   * @param solution Correct solution
   * @param options Evaluation options
   * @returns Evaluation result with score and correctness
   */
  evaluateSubmission(
    answer: string,
    solution: string,
    options?: {
      caseSensitive?: boolean
      trimWhitespace?: boolean
      partialCredit?: boolean
    }
  ): {
    isCorrect: boolean
    accuracy: number
    matchType: 'exact' | 'partial' | 'incorrect'
  } {
    const opts = {
      caseSensitive: false,
      trimWhitespace: true,
      partialCredit: true,
      ...options
    }

    // Normalize answers for comparison
    let normalizedAnswer = answer
    let normalizedSolution = solution

    if (opts.trimWhitespace) {
      normalizedAnswer = normalizedAnswer.trim()
      normalizedSolution = normalizedSolution.trim()
    }

    if (!opts.caseSensitive) {
      normalizedAnswer = normalizedAnswer.toLowerCase()
      normalizedSolution = normalizedSolution.toLowerCase()
    }

    // Check for exact match
    if (normalizedAnswer === normalizedSolution) {
      return {
        isCorrect: true,
        accuracy: 100,
        matchType: 'exact'
      }
    }

    // Check for partial credit if enabled
    if (opts.partialCredit) {
      const accuracy = this.calculateSimilarity(normalizedAnswer, normalizedSolution)
      const isCorrect = accuracy >= this.PASSING_SCORE

      return {
        isCorrect,
        accuracy,
        matchType: accuracy > 0 ? 'partial' : 'incorrect'
      }
    }

    return {
      isCorrect: false,
      accuracy: 0,
      matchType: 'incorrect'
    }
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length)
    if (maxLength === 0) return 100

    const distance = this.levenshteinDistance(str1, str2)
    const similarity = ((maxLength - distance) / maxLength) * 100

    return Math.max(0, Math.min(100, similarity))
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length
    const n = str2.length
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // deletion
            dp[i][j - 1] + 1,    // insertion
            dp[i - 1][j - 1] + 1 // substitution
          )
        }
      }
    }

    return dp[m][n]
  }

  /**
   * Generate performance feedback based on accuracy
   */
  generateFeedback(accuracy: number): {
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    message: string
    isPassing: boolean
    suggestions: string[]
  } {
    let grade: 'A' | 'B' | 'C' | 'D' | 'F'
    let message: string
    let suggestions: string[] = []

    if (accuracy >= this.EXCELLENCE_SCORE) {
      grade = 'A'
      message = 'Excellent work! You have mastered this concept.'
      suggestions = ['Try more challenging problems', 'Help others learn this concept']
    } else if (accuracy >= 80) {
      grade = 'B'
      message = 'Great job! You have a strong understanding.'
      suggestions = ['Review minor details', 'Practice edge cases']
    } else if (accuracy >= this.PASSING_SCORE) {
      grade = 'C'
      message = 'Good effort! You passed but there\'s room for improvement.'
      suggestions = ['Review the solution carefully', 'Practice similar problems']
    } else if (accuracy >= 60) {
      grade = 'D'
      message = 'Nearly there! You need more practice.'
      suggestions = ['Study the fundamentals again', 'Work through simpler examples first']
    } else {
      grade = 'F'
      message = 'Keep trying! Learning takes time and practice.'
      suggestions = [
        'Review the basic concepts',
        'Start with easier problems',
        'Seek help or additional resources'
      ]
    }

    return {
      grade,
      message,
      isPassing: accuracy >= this.PASSING_SCORE,
      suggestions
    }
  }

  /**
   * Analyze submission patterns to identify strengths and weaknesses
   */
  analyzePerformance(
    submissions: Array<{ accuracy: number; timeSpent: number; difficulty: string }>
  ): {
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
  } {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const recommendations: string[] = []

    // Calculate averages
    const avgAccuracy = submissions.reduce((sum, s) => sum + s.accuracy, 0) / submissions.length
    const avgTime = submissions.reduce((sum, s) => sum + s.timeSpent, 0) / submissions.length

    // Analyze by difficulty
    const difficultyGroups = this.groupByDifficulty(submissions)

    Object.entries(difficultyGroups).forEach(([difficulty, subs]) => {
      const avgAcc = subs.reduce((sum, s) => sum + s.accuracy, 0) / subs.length
      if (avgAcc >= 80) {
        strengths.push(`Strong performance in ${difficulty} problems`)
      } else if (avgAcc < 60) {
        weaknesses.push(`Struggles with ${difficulty} problems`)
      }
    })

    // Analyze speed
    if (avgTime < 60) {
      strengths.push('Quick problem-solving')
    } else if (avgTime > 300) {
      weaknesses.push('Takes longer than average to solve problems')
      recommendations.push('Practice time management techniques')
    }

    // Analyze consistency
    const accuracyStdDev = this.calculateStdDev(submissions.map(s => s.accuracy))
    if (accuracyStdDev < 15) {
      strengths.push('Consistent performance')
    } else {
      weaknesses.push('Inconsistent performance')
      recommendations.push('Focus on building stable understanding')
    }

    // General recommendations
    if (avgAccuracy < 70) {
      recommendations.push('Review fundamental concepts')
      recommendations.push('Start with easier problems and gradually increase difficulty')
    } else if (avgAccuracy > 85) {
      recommendations.push('Challenge yourself with harder problems')
      recommendations.push('Consider teaching others to reinforce learning')
    }

    return {
      strengths,
      weaknesses,
      recommendations
    }
  }

  /**
   * Group submissions by difficulty
   */
  private groupByDifficulty(
    submissions: Array<{ accuracy: number; timeSpent: number; difficulty: string }>
  ): Record<string, typeof submissions> {
    return submissions.reduce((groups, submission) => {
      const key = submission.difficulty
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(submission)
      return groups
    }, {} as Record<string, typeof submissions>)
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length
    return Math.sqrt(avgSquaredDiff)
  }

  /**
   * Determine if user should advance to next difficulty
   */
  shouldAdvanceDifficulty(
    recentAccuracies: number[],
    threshold: number = 80
  ): boolean {
    if (recentAccuracies.length < 5) {
      return false // Need at least 5 attempts
    }

    const recentAvg = recentAccuracies.slice(-5).reduce((sum, a) => sum + a, 0) / 5
    return recentAvg >= threshold
  }
}

// Export singleton instance
export const evaluationService = new EvaluationService()