import { LearningUseCases } from "../application/use-cases"
import { DrizzleLearningRepository } from "../extensions/learning.repository"
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
  CreateEvaluationDto,
  CreateScheduleDto,
  UpdateScheduleDto,
} from "../application/dto"

/**
 * Business service for the learning module
 * Coordinates use cases and provides a facade for route handlers
 */
export class LearningService {
  private useCases: LearningUseCases

  constructor(db: any) {
    const repository = new DrizzleLearningRepository(db)
    this.useCases = new LearningUseCases(repository)
  }

  // Category methods
  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    return this.useCases.createCategory(dto)
  }

  async getCategory(id: string): Promise<Category | null> {
    return this.useCases.getCategoryById(id)
  }

  async getAllCategories(): Promise<Category[]> {
    return this.useCases.getAllCategories()
  }

  async getCategoriesByParent(parentId: string): Promise<Category[]> {
    return this.useCases.getCategoriesByParentId(parentId)
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    return this.useCases.updateCategory(id, dto)
  }

  async deleteCategory(id: string): Promise<void> {
    return this.useCases.deleteCategory(id)
  }

  // Problem methods
  async createProblem(dto: CreateProblemDto): Promise<Problem> {
    return this.useCases.createProblem(dto)
  }

  async getProblem(id: string): Promise<Problem | null> {
    return this.useCases.getProblemById(id)
  }

  async getProblemsByCategory(categoryId: string): Promise<Problem[]> {
    return this.useCases.getProblemsByCategoryId(categoryId)
  }

  async getProblemsByDifficulty(difficulty: string): Promise<Problem[]> {
    return this.useCases.getProblemsByDifficulty(difficulty)
  }

  async getAllProblems(): Promise<Problem[]> {
    return this.useCases.getAllProblems()
  }

  async updateProblem(id: string, dto: UpdateProblemDto): Promise<Problem> {
    return this.useCases.updateProblem(id, dto)
  }

  async deleteProblem(id: string): Promise<void> {
    return this.useCases.deleteProblem(id)
  }

  // Submission methods
  async createSubmission(dto: CreateSubmissionDto): Promise<Submission> {
    return this.useCases.createSubmission(dto)
  }

  async getSubmission(id: string): Promise<Submission | null> {
    return this.useCases.getSubmissionById(id)
  }

  async getSubmissionsByUser(userId: string): Promise<Submission[]> {
    return this.useCases.getSubmissionsByUserId(userId)
  }

  async getSubmissionsByProblem(problemId: string, userId?: string): Promise<Submission[]> {
    if (userId) {
      return this.useCases.getSubmissionsByUserAndProblem(userId, problemId)
    }
    return this.useCases.getSubmissionsByProblemId(problemId)
  }

  async getUserProblemSubmissions(userId: string, problemId: string): Promise<Submission[]> {
    return this.useCases.getSubmissionsByUserAndProblem(userId, problemId)
  }

  // Evaluation methods
  async createEvaluation(dto: CreateEvaluationDto): Promise<Evaluation> {
    return this.useCases.createEvaluation(dto)
  }

  async getEvaluation(id: string): Promise<Evaluation | null> {
    return this.useCases.getEvaluationById(id)
  }

  async getEvaluationBySubmission(submissionId: string): Promise<Evaluation | null> {
    return this.useCases.getEvaluationBySubmissionId(submissionId)
  }

  // Schedule methods (Spaced Repetition)
  async createSchedule(dto: CreateScheduleDto): Promise<Schedule> {
    return this.useCases.createSchedule(dto)
  }

  async getSchedule(id: string): Promise<Schedule | null> {
    return this.useCases.getScheduleById(id)
  }

  async getUserSchedules(userId: string): Promise<Schedule[]> {
    return this.useCases.getSchedulesByUserId(userId)
  }

  // Alias for getUserSchedules to match route
  async getSchedulesByUser(userId: string): Promise<Schedule[]> {
    return this.useCases.getSchedulesByUserId(userId)
  }

  async getUserProblemSchedule(userId: string, problemId: string): Promise<Schedule | null> {
    return this.useCases.getSchedulesByUserAndProblem(userId, problemId)
  }

  // Alias for getUserProblemSchedule to match route
  async getScheduleByProblem(userId: string, problemId: string): Promise<Schedule | null> {
    return this.useCases.getSchedulesByUserAndProblem(userId, problemId)
  }

  async getDueReviews(userId: string, date?: Date): Promise<Schedule[]> {
    return this.useCases.getDueSchedules(userId, date || new Date())
  }

  // Alias for getDueReviews to match route
  async getDueSchedules(userId: string): Promise<Schedule[]> {
    return this.useCases.getDueSchedules(userId, new Date())
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto): Promise<Schedule> {
    return this.useCases.updateSchedule(id, dto)
  }

  async deleteSchedule(id: string): Promise<void> {
    return this.useCases.deleteSchedule(id)
  }

  /**
   * Calculate next review schedule using SM-2 algorithm
   * @param quality - User's response quality (0-5)
   * @param currentEaseFactor - Current ease factor
   * @param currentInterval - Current interval in days
   * @param currentRepetitions - Number of successful repetitions
   */
  calculateNextReview(
    quality: number,
    currentEaseFactor: number = 2.5,
    currentInterval: number = 1,
    currentRepetitions: number = 0
  ): { easeFactor: number; interval: number; repetitions: number } {
    // SM-2 Algorithm implementation
    let easeFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    if (easeFactor < 1.3) {
      easeFactor = 1.3
    }

    let interval: number
    let repetitions: number

    if (quality < 3) {
      // Incorrect response - reset
      repetitions = 0
      interval = 1
    } else {
      repetitions = currentRepetitions + 1

      if (repetitions === 1) {
        interval = 1
      } else if (repetitions === 2) {
        interval = 6
      } else {
        interval = Math.round(currentInterval * easeFactor)
      }
    }

    return { easeFactor, interval, repetitions }
  }
}
