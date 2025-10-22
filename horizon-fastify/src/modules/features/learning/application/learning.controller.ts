import { DrizzleLearningRepository } from "../extensions/learning.repository"
import { LearningUseCases } from "./use-cases"
import { LearningError } from "../constants/error.codes"
import { spacedRepetitionService } from "../business/spaced-repetition.service"

/**
 * Controller for handling HTTP requests to the learning module
 * Directly uses use-cases following proper architecture pattern
 */
export class LearningController {
  private useCases: LearningUseCases

  constructor(db: any) {
    const repository = new DrizzleLearningRepository(db)
    this.useCases = new LearningUseCases(repository)
  }

  // Category handlers
  async listCategories() {
    const categories = await this.useCases.getAllCategories()
    return { data: categories, statusCode: 200 }
  }

  async getCategory(id: string) {
    const category = await this.useCases.getCategoryById(id)
    if (!category) {
      return { error: "Category not found", statusCode: 404 }
    }
    return { data: category, statusCode: 200 }
  }

  async createCategory(data: any) {
    try {
      const category = await this.useCases.createCategory(data)
      return { data: category, statusCode: 201 }
    } catch (error) {
      if (LearningError.isLearningError(error)) {
        return { error: error.message, statusCode: error.statusCode }
      }
      return { error: "Failed to create category", statusCode: 400 }
    }
  }

  async updateCategory(id: string, data: any) {
    try {
      const category = await this.useCases.updateCategory(id, data)
      return { data: category, statusCode: 200 }
    } catch (error) {
      if (LearningError.isLearningError(error)) {
        return { error: error.message, statusCode: error.statusCode }
      }
      return { error: "Failed to update category", statusCode: 400 }
    }
  }

  async deleteCategory(id: string) {
    try {
      await this.useCases.deleteCategory(id)
      return { statusCode: 204 }
    } catch (error) {
      if (LearningError.isLearningError(error)) {
        return { error: error.message, statusCode: error.statusCode }
      }
      return { error: "Failed to delete category", statusCode: 400 }
    }
  }

  // Problem handlers
  async listProblems() {
    const problems = await this.useCases.getAllProblems()
    return { data: problems, statusCode: 200 }
  }

  async getProblem(id: string) {
    const problem = await this.useCases.getProblemById(id)
    if (!problem) {
      return { error: "Problem not found", statusCode: 404 }
    }
    return { data: problem, statusCode: 200 }
  }

  async createProblem(data: any) {
    try {
      const problem = await this.useCases.createProblem(data)
      return { data: problem, statusCode: 201 }
    } catch (error) {
      if (LearningError.isLearningError(error)) {
        return { error: error.message, statusCode: error.statusCode }
      }
      return { error: "Failed to create problem", statusCode: 400 }
    }
  }

  async updateProblem(id: string, data: any) {
    try {
      const problem = await this.useCases.updateProblem(id, data)
      return { data: problem, statusCode: 200 }
    } catch (error) {
      if (LearningError.isLearningError(error)) {
        return { error: error.message, statusCode: error.statusCode }
      }
      return { error: "Failed to update problem", statusCode: 400 }
    }
  }

  async deleteProblem(id: string) {
    try {
      await this.useCases.deleteProblem(id)
      return { statusCode: 204 }
    } catch (error) {
      if (LearningError.isLearningError(error)) {
        return { error: error.message, statusCode: error.statusCode }
      }
      return { error: "Failed to delete problem", statusCode: 400 }
    }
  }

  // Submission handlers
  async listUserSubmissions(userId: string) {
    const submissions = await this.useCases.getSubmissionsByUserId(userId)
    return { data: submissions, statusCode: 200 }
  }

  async getSubmission(id: string) {
    const submission = await this.useCases.getSubmissionById(id)
    if (!submission) {
      return { error: "Submission not found", statusCode: 404 }
    }
    return { data: submission, statusCode: 200 }
  }

  async createSubmission(data: any) {
    try {
      const submission = await this.useCases.createSubmission(data)
      return { data: submission, statusCode: 201 }
    } catch (error) {
      if (LearningError.isLearningError(error)) {
        return { error: error.message, statusCode: error.statusCode }
      }
      return { error: "Failed to create submission", statusCode: 400 }
    }
  }

  // Schedule handlers
  async getUserSchedules(userId: string) {
    const schedules = await this.useCases.getSchedulesByUserId(userId)
    return { data: schedules, statusCode: 200 }
  }

  async getDueReviews(userId: string) {
    const schedules = await this.useCases.getDueSchedules(userId, new Date())
    return { data: schedules, statusCode: 200 }
  }

  async createSchedule(data: any) {
    try {
      const schedule = await this.useCases.createSchedule(data)
      return { data: schedule, statusCode: 201 }
    } catch (error) {
      if (LearningError.isLearningError(error)) {
        return { error: error.message, statusCode: error.statusCode }
      }
      return { error: "Failed to create schedule", statusCode: 400 }
    }
  }

  async updateSchedule(id: string, data: any) {
    try {
      const schedule = await this.useCases.updateSchedule(id, data)
      return { data: schedule, statusCode: 200 }
    } catch (error) {
      if (LearningError.isLearningError(error)) {
        return { error: error.message, statusCode: error.statusCode }
      }
      return { error: "Failed to update schedule", statusCode: 400 }
    }
  }

  // Additional methods for SM-2 algorithm
  async calculateNextReview(quality: number, easeFactor: number, interval: number, repetitions: number) {
    const result = spacedRepetitionService.calculateNextReview(quality, easeFactor, interval, repetitions)
    return { data: result, statusCode: 200 }
  }

  async processReview(userId: string, problemId: string, quality: number) {
    try {
      const schedule = await this.useCases.processReview(userId, problemId, quality)
      return { data: schedule, statusCode: 200 }
    } catch (error) {
      if (LearningError.isLearningError(error)) {
        return { error: error.message, statusCode: error.statusCode }
      }
      return { error: "Failed to process review", statusCode: 400 }
    }
  }

  async getUserAnalytics(userId: string) {
    try {
      const analytics = await this.useCases.getUserPerformanceAnalytics(userId)
      return { data: analytics, statusCode: 200 }
    } catch (error) {
      if (LearningError.isLearningError(error)) {
        return { error: error.message, statusCode: error.statusCode }
      }
      return { error: "Failed to get user analytics", statusCode: 400 }
    }
  }
}
