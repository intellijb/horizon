import { LearningRepository } from "../domain/ports"
import {
  Category,
  Problem,
  Submission,
  Evaluation,
  Schedule,
} from "../domain/entities"
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateProblemDto,
  UpdateProblemDto,
  CreateSubmissionDto,
  UpdateSubmissionDto,
  CreateEvaluationDto,
  CreateScheduleDto,
  UpdateScheduleDto,
} from "./dto"
import { spacedRepetitionService } from "../business/spaced-repetition.service"
import { evaluationService } from "../business/evaluation.service"
import { validationService } from "../business/validation.service"
import { LearningError, ErrorCode } from "../constants/error.codes"

/**
 * Use cases for the learning module
 * Orchestrates business operations using domain services
 */
export class LearningUseCases {
  constructor(private readonly repository: LearningRepository) {}

  // ========================================
  // Category Use Cases
  // ========================================

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    // Validate parent category if provided
    if (dto.parentId) {
      const parent = await this.repository.getCategoryById(dto.parentId)
      if (!parent) {
        throw new LearningError(ErrorCode.CATEGORY_NOT_FOUND, "Parent category not found")
      }

      // Validate hierarchy depth
      const validation = validationService.validateCategoryHierarchy(
        parent.path || '',
        (parent.level || 0) + 1
      )
      if (!validation.isValid) {
        throw new LearningError(ErrorCode.VALIDATION_FAILED, validation.errors.join(', '))
      }
    }

    return this.repository.createCategory(dto)
  }

  async getCategoryById(id: string): Promise<Category | null> {
    return this.repository.getCategoryById(id)
  }

  async getAllCategories(): Promise<Category[]> {
    return this.repository.getAllCategories()
  }

  async getCategoriesByParentId(parentId: string): Promise<Category[]> {
    return this.repository.getCategoriesByParentId(parentId)
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.repository.getCategoryById(id)
    if (!category) {
      throw new LearningError(ErrorCode.CATEGORY_NOT_FOUND, "Category not found")
    }

    // Validate new parent if changing
    if (dto.parentId && dto.parentId !== category.parentId) {
      const newParent = await this.repository.getCategoryById(dto.parentId)
      if (!newParent) {
        throw new LearningError(ErrorCode.CATEGORY_NOT_FOUND, "New parent category not found")
      }

      // Check for circular reference
      if (await this.wouldCreateCircularReference(id, dto.parentId)) {
        throw new LearningError(ErrorCode.VALIDATION_FAILED, "Cannot create circular category reference")
      }
    }

    return this.repository.updateCategory(id, dto)
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.repository.getCategoryById(id)
    if (!category) {
      throw new LearningError(ErrorCode.CATEGORY_NOT_FOUND, "Category not found")
    }

    // Check if category has problems
    const problems = await this.repository.getProblemsByCategoryId(id)
    if (problems.length > 0) {
      throw new LearningError(
        ErrorCode.VALIDATION_FAILED,
        "Cannot delete category with existing problems"
      )
    }

    return this.repository.deleteCategory(id)
  }

  private async wouldCreateCircularReference(categoryId: string, newParentId: string): Promise<boolean> {
    let currentId = newParentId
    const visited = new Set<string>()

    while (currentId) {
      if (currentId === categoryId || visited.has(currentId)) {
        return true
      }
      visited.add(currentId)

      const parent = await this.repository.getCategoryById(currentId)
      currentId = parent?.parentId || ''
    }

    return false
  }

  // ========================================
  // Problem Use Cases
  // ========================================

  async createProblem(dto: CreateProblemDto): Promise<Problem> {
    // Validate category exists
    const category = await this.repository.getCategoryById(dto.categoryId)
    if (!category) {
      throw new LearningError(ErrorCode.CATEGORY_NOT_FOUND, "Category not found")
    }

    // Validate problem content
    const validation = validationService.validateProblemContent(
      dto.content,
      dto.solution
    )
    if (!validation.isValid) {
      throw new LearningError(ErrorCode.VALIDATION_FAILED, validation.errors.join(', '))
    }

    // Validate tags if provided
    if (dto.tags && dto.tags.length > 0) {
      const tagValidation = validationService.validateTags(dto.tags)
      if (!tagValidation.isValid) {
        throw new LearningError(ErrorCode.VALIDATION_FAILED, tagValidation.errors.join(', '))
      }
    }

    return this.repository.createProblem(dto)
  }

  async getProblemById(id: string): Promise<Problem | null> {
    return this.repository.getProblemById(id)
  }

  async getProblemsByCategoryId(categoryId: string): Promise<Problem[]> {
    return this.repository.getProblemsByCategoryId(categoryId)
  }

  async getProblemsByDifficulty(difficulty: string): Promise<Problem[]> {
    return this.repository.getProblemsByDifficulty(difficulty)
  }

  async getAllProblems(): Promise<Problem[]> {
    return this.repository.getAllProblems()
  }

  async updateProblem(id: string, dto: UpdateProblemDto): Promise<Problem> {
    const problem = await this.repository.getProblemById(id)
    if (!problem) {
      throw new LearningError(ErrorCode.PROBLEM_NOT_FOUND, "Problem not found")
    }

    // Validate new category if changing
    if (dto.categoryId) {
      const category = await this.repository.getCategoryById(dto.categoryId)
      if (!category) {
        throw new LearningError(ErrorCode.CATEGORY_NOT_FOUND, "Category not found")
      }
    }

    // Validate content if updating
    if (dto.content || dto.solution) {
      const validation = validationService.validateProblemContent(
        dto.content || problem.content,
        dto.solution || problem.solution || ''
      )
      if (!validation.isValid) {
        throw new LearningError(ErrorCode.VALIDATION_FAILED, validation.errors.join(', '))
      }
    }

    return this.repository.updateProblem(id, dto)
  }

  async deleteProblem(id: string): Promise<void> {
    const problem = await this.repository.getProblemById(id)
    if (!problem) {
      throw new LearningError(ErrorCode.PROBLEM_NOT_FOUND, "Problem not found")
    }
    return this.repository.deleteProblem(id)
  }

  // ========================================
  // Submission Use Cases
  // ========================================

  async createSubmission(dto: CreateSubmissionDto): Promise<Submission> {
    // Validate problem exists
    const problem = await this.repository.getProblemById(dto.problemId)
    if (!problem) {
      throw new LearningError(ErrorCode.PROBLEM_NOT_FOUND, "Problem not found")
    }

    // Get previous submissions for attempt validation
    const existingSubmissions = await this.repository.getSubmissionsByUserAndProblem(
      dto.userId,
      dto.problemId
    )

    const lastSubmission = existingSubmissions[existingSubmissions.length - 1]
    const attemptNumber = existingSubmissions.length + 1

    // Validate submission attempt
    const validation = validationService.validateSubmissionAttempt(
      attemptNumber,
      lastSubmission?.submittedAt || null
    )
    if (!validation.isValid) {
      throw new LearningError(ErrorCode.VALIDATION_FAILED, validation.errors.join(', '))
    }

    // Validate time spent if provided
    if (dto.timeSpent !== undefined) {
      const timeValidation = validationService.validateTimeSpent(
        dto.timeSpent,
        problem.difficulty
      )
      if (!timeValidation.isValid) {
        throw new LearningError(ErrorCode.VALIDATION_FAILED, timeValidation.warnings.join(', '))
      }
    }

    // Create submission with attempt number
    const submission = await this.repository.createSubmission({
      ...dto,
      attemptNumber // This should be handled by the repository based on the schema
    } as any)

    // Auto-evaluate if solution is available
    if (problem.solution) {
      const evaluation = evaluationService.evaluateSubmission(
        dto.answer,
        problem.solution
      )

      // Create evaluation record
      await this.createEvaluation({
        submissionId: submission.id,
        accuracy: evaluation.accuracy,
        feedback: evaluationService.generateFeedback(evaluation.accuracy).message,
        suggestions: evaluationService.generateFeedback(evaluation.accuracy).suggestions,
        strengths: evaluation.accuracy >= 70 ? ['Good understanding shown'] : [],
        weaknesses: evaluation.accuracy < 70 ? ['Needs more practice'] : [],
        llmModel: 'system-auto-evaluation',
      })
    }

    return submission
  }

  async getSubmissionById(id: string): Promise<Submission | null> {
    return this.repository.getSubmissionById(id)
  }

  async getSubmissionsByUserId(userId: string): Promise<Submission[]> {
    return this.repository.getSubmissionsByUserId(userId)
  }

  async getSubmissionsByProblemId(problemId: string): Promise<Submission[]> {
    return this.repository.getSubmissionsByProblemId(problemId)
  }

  async getSubmissionsByUserAndProblem(userId: string, problemId: string): Promise<Submission[]> {
    return this.repository.getSubmissionsByUserAndProblem(userId, problemId)
  }

  async updateSubmission(id: string, dto: UpdateSubmissionDto): Promise<Submission> {
    const submission = await this.repository.getSubmissionById(id)
    if (!submission) {
      throw new LearningError(ErrorCode.SUBMISSION_NOT_FOUND, "Submission not found")
    }
    return this.repository.updateSubmission(id, dto)
  }

  // ========================================
  // Evaluation Use Cases
  // ========================================

  async createEvaluation(dto: CreateEvaluationDto): Promise<Evaluation> {
    // Validate submission exists
    const submission = await this.repository.getSubmissionById(dto.submissionId)
    if (!submission) {
      throw new LearningError(ErrorCode.SUBMISSION_NOT_FOUND, "Submission not found")
    }

    // Check if evaluation already exists
    const existingEvaluation = await this.repository.getEvaluationBySubmissionId(dto.submissionId)
    if (existingEvaluation) {
      throw new LearningError(ErrorCode.EVALUATION_EXISTS, "Evaluation already exists for this submission")
    }

    // Generate feedback based on accuracy
    const feedback = evaluationService.generateFeedback(dto.accuracy)

    // Create evaluation with enriched data
    const evaluation = await this.repository.createEvaluation({
      ...dto,
      suggestions: dto.suggestions || feedback.suggestions,
    })

    // Update submission with evaluation results
    await this.repository.updateSubmission(dto.submissionId, {
      aiEvaluationId: evaluation.id,
      isCorrect: feedback.isPassing,
    })

    // Update spaced repetition schedule if exists
    await this.updateScheduleAfterEvaluation(
      submission.userId,
      submission.problemId,
      dto.accuracy
    )

    return evaluation
  }

  async getEvaluationById(id: string): Promise<Evaluation | null> {
    return this.repository.getEvaluationById(id)
  }

  async getEvaluationBySubmissionId(submissionId: string): Promise<Evaluation | null> {
    return this.repository.getEvaluationBySubmissionId(submissionId)
  }

  private async updateScheduleAfterEvaluation(
    userId: string,
    problemId: string,
    accuracy: number
  ): Promise<void> {
    const schedule = await this.repository.getSchedulesByUserAndProblem(userId, problemId)
    if (!schedule) return

    // Convert accuracy to SM-2 quality (0-5 scale)
    const quality = Math.round((accuracy / 100) * 5)

    // Calculate next review using SM-2 algorithm
    const nextReview = spacedRepetitionService.calculateNextReview(
      quality,
      schedule.easeFactor,
      schedule.interval,
      schedule.repetitions
    )

    // Update schedule
    await this.repository.updateSchedule(schedule.id, {
      easeFactor: nextReview.easeFactor,
      interval: nextReview.interval,
      repetitions: nextReview.repetitions,
      lastReviewedAt: new Date().toISOString(),
      nextReviewAt: nextReview.nextReviewDate.toISOString(),
      totalAttempts: (schedule.totalAttempts || 0) + 1,
      correctAttempts: (schedule.correctAttempts || 0) + (accuracy >= 70 ? 1 : 0),
      averageAccuracy: ((schedule.averageAccuracy || 0) * (schedule.totalAttempts || 0) + accuracy) /
                      ((schedule.totalAttempts || 0) + 1),
    })
  }

  // ========================================
  // Schedule Use Cases (Spaced Repetition)
  // ========================================

  async createSchedule(dto: CreateScheduleDto): Promise<Schedule> {
    // Validate problem exists
    const problem = await this.repository.getProblemById(dto.problemId)
    if (!problem) {
      throw new LearningError(ErrorCode.PROBLEM_NOT_FOUND, "Problem not found")
    }

    // Check if schedule already exists
    const existing = await this.repository.getSchedulesByUserAndProblem(dto.userId, dto.problemId)
    if (existing) {
      throw new LearningError(ErrorCode.SCHEDULE_EXISTS, "Schedule already exists for this user and problem")
    }

    // Validate schedule parameters if provided
    if (dto.easeFactor || dto.interval || dto.repetitions) {
      const validation = validationService.validateScheduleParams(
        dto.easeFactor ?? 2.5,
        dto.interval ?? 1,
        dto.repetitions ?? 0
      )
      if (!validation.isValid) {
        throw new LearningError(ErrorCode.VALIDATION_FAILED, validation.errors.join(', '))
      }
    }

    // Calculate initial review date
    const initialReview = spacedRepetitionService.calculateNextReview(
      3, // Start with neutral quality
      dto.easeFactor ?? 2.5,
      dto.interval ?? 1,
      dto.repetitions ?? 0
    )

    return this.repository.createSchedule({
      ...dto,
      easeFactor: initialReview.easeFactor,
      interval: initialReview.interval,
      repetitions: initialReview.repetitions,
    })
  }

  async getScheduleById(id: string): Promise<Schedule | null> {
    return this.repository.getScheduleById(id)
  }

  async getSchedulesByUserId(userId: string): Promise<Schedule[]> {
    return this.repository.getSchedulesByUserId(userId)
  }

  async getSchedulesByUserAndProblem(userId: string, problemId: string): Promise<Schedule | null> {
    return this.repository.getSchedulesByUserAndProblem(userId, problemId)
  }

  async getDueSchedules(userId: string, date: Date = new Date()): Promise<Schedule[]> {
    const allSchedules = await this.repository.getDueSchedules(userId, date)

    // Filter schedules that are actually due using the service
    return allSchedules.filter(schedule =>
      spacedRepetitionService.isDueForReview(schedule.nextReviewDate, date)
    )
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto): Promise<Schedule> {
    const schedule = await this.repository.getScheduleById(id)
    if (!schedule) {
      throw new LearningError(ErrorCode.SCHEDULE_NOT_FOUND, "Schedule not found")
    }

    // Validate parameters if provided
    if (dto.easeFactor || dto.interval || dto.repetitions) {
      const validation = validationService.validateScheduleParams(
        dto.easeFactor ?? schedule.easeFactor,
        dto.interval ?? schedule.interval,
        dto.repetitions ?? schedule.repetitions
      )
      if (!validation.isValid) {
        throw new LearningError(ErrorCode.VALIDATION_FAILED, validation.errors.join(', '))
      }
    }

    return this.repository.updateSchedule(id, dto)
  }

  async deleteSchedule(id: string): Promise<void> {
    const schedule = await this.repository.getScheduleById(id)
    if (!schedule) {
      throw new LearningError(ErrorCode.SCHEDULE_NOT_FOUND, "Schedule not found")
    }
    return this.repository.deleteSchedule(id)
  }

  async processReview(
    userId: string,
    problemId: string,
    quality: number
  ): Promise<Schedule> {
    const schedule = await this.repository.getSchedulesByUserAndProblem(userId, problemId)
    if (!schedule) {
      throw new LearningError(ErrorCode.SCHEDULE_NOT_FOUND, "Schedule not found for this problem")
    }

    // Calculate next review using SM-2 algorithm
    const nextReview = spacedRepetitionService.calculateNextReview(
      quality,
      schedule.easeFactor,
      schedule.interval,
      schedule.repetitions
    )

    // Update schedule
    return this.repository.updateSchedule(schedule.id, {
      easeFactor: nextReview.easeFactor,
      interval: nextReview.interval,
      repetitions: nextReview.repetitions,
      lastReviewedAt: new Date().toISOString(),
      nextReviewAt: nextReview.nextReviewDate.toISOString(),
    })
  }

  // ========================================
  // Analytics Use Cases
  // ========================================

  async getUserPerformanceAnalytics(userId: string): Promise<{
    totalProblemsAttempted: number
    averageAccuracy: number
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    masteryLevel: string
  }> {
    const submissions = await this.repository.getSubmissionsByUserId(userId)

    if (submissions.length === 0) {
      return {
        totalProblemsAttempted: 0,
        averageAccuracy: 0,
        strengths: [],
        weaknesses: ['No submissions yet'],
        recommendations: ['Start with beginner problems'],
        masteryLevel: 'beginner'
      }
    }

    // Get evaluations for submissions
    const evaluations = await Promise.all(
      submissions.map(s => this.repository.getEvaluationBySubmissionId(s.id))
    )

    const validEvaluations = evaluations.filter(e => e !== null) as Evaluation[]

    // Calculate statistics
    const totalAccuracy = validEvaluations.reduce((sum, e) => sum + (e.score || 0), 0)
    const averageAccuracy = totalAccuracy / validEvaluations.length

    // Get submission data for analysis
    const submissionData = await Promise.all(
      submissions.map(async (s) => {
        const problem = await this.repository.getProblemById(s.problemId)
        const evaluation = validEvaluations.find(e => e.submissionId === s.id)
        return {
          accuracy: evaluation?.score || 0,
          timeSpent: s.timeSpent || 0,
          difficulty: problem?.difficulty || 'beginner'
        }
      })
    )

    // Analyze performance
    const analysis = evaluationService.analyzePerformance(submissionData)
    const stats = spacedRepetitionService.calculateStatistics(
      submissions.length,
      validEvaluations.filter(e => (e.score || 0) >= 70).length
    )

    return {
      totalProblemsAttempted: submissions.length,
      averageAccuracy,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations: analysis.recommendations,
      masteryLevel: stats.masteryLevel
    }
  }
}