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

/**
 * Use cases for the learning module
 * Contains business logic and orchestration
 */
export class LearningUseCases {
  constructor(private readonly repository: LearningRepository) {}

  // Category use cases
  async createCategory(dto: CreateCategoryDto): Promise<Category> {
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
      throw new Error("Category not found")
    }
    return this.repository.updateCategory(id, dto)
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.repository.getCategoryById(id)
    if (!category) {
      throw new Error("Category not found")
    }
    return this.repository.deleteCategory(id)
  }

  // Problem use cases
  async createProblem(dto: CreateProblemDto): Promise<Problem> {
    // Validate that category exists
    const category = await this.repository.getCategoryById(dto.categoryId)
    if (!category) {
      throw new Error("Category not found")
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
      throw new Error("Problem not found")
    }

    // Validate category if it's being updated
    if (dto.categoryId) {
      const category = await this.repository.getCategoryById(dto.categoryId)
      if (!category) {
        throw new Error("Category not found")
      }
    }

    return this.repository.updateProblem(id, dto)
  }

  async deleteProblem(id: string): Promise<void> {
    const problem = await this.repository.getProblemById(id)
    if (!problem) {
      throw new Error("Problem not found")
    }
    return this.repository.deleteProblem(id)
  }

  // Submission use cases
  async createSubmission(dto: CreateSubmissionDto): Promise<Submission> {
    // Validate that problem exists
    const problem = await this.repository.getProblemById(dto.problemId)
    if (!problem) {
      throw new Error("Problem not found")
    }

    // Get attempt number for this user and problem
    const existingSubmissions = await this.repository.getSubmissionsByUserAndProblem(
      dto.userId,
      dto.problemId
    )

    const submission = await this.repository.createSubmission({
      ...dto,
    })

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
      throw new Error("Submission not found")
    }
    return this.repository.updateSubmission(id, dto)
  }

  // Evaluation use cases
  async createEvaluation(dto: CreateEvaluationDto): Promise<Evaluation> {
    // Validate that submission exists
    const submission = await this.repository.getSubmissionById(dto.submissionId)
    if (!submission) {
      throw new Error("Submission not found")
    }

    const evaluation = await this.repository.createEvaluation(dto)

    // Update submission with evaluation ID
    await this.repository.updateSubmission(dto.submissionId, {
      aiEvaluationId: evaluation.id,
      isCorrect: dto.accuracy >= 70, // Consider 70% as passing
    })

    return evaluation
  }

  async getEvaluationById(id: string): Promise<Evaluation | null> {
    return this.repository.getEvaluationById(id)
  }

  async getEvaluationBySubmissionId(submissionId: string): Promise<Evaluation | null> {
    return this.repository.getEvaluationBySubmissionId(submissionId)
  }

  // Schedule use cases (Spaced Repetition)
  async createSchedule(dto: CreateScheduleDto): Promise<Schedule> {
    // Validate that problem exists
    const problem = await this.repository.getProblemById(dto.problemId)
    if (!problem) {
      throw new Error("Problem not found")
    }

    // Check if schedule already exists for this user and problem
    const existing = await this.repository.getSchedulesByUserAndProblem(dto.userId, dto.problemId)
    if (existing) {
      throw new Error("Schedule already exists for this user and problem")
    }

    return this.repository.createSchedule({
      ...dto,
      easeFactor: dto.easeFactor ?? 2.5, // SM-2 default
      interval: dto.interval ?? 1, // Start with 1 day
      repetitions: dto.repetitions ?? 0,
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

  async getDueSchedules(userId: string, date: Date): Promise<Schedule[]> {
    return this.repository.getDueSchedules(userId, date)
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto): Promise<Schedule> {
    const schedule = await this.repository.getScheduleById(id)
    if (!schedule) {
      throw new Error("Schedule not found")
    }
    return this.repository.updateSchedule(id, dto)
  }

  async deleteSchedule(id: string): Promise<void> {
    const schedule = await this.repository.getScheduleById(id)
    if (!schedule) {
      throw new Error("Schedule not found")
    }
    return this.repository.deleteSchedule(id)
  }
}
