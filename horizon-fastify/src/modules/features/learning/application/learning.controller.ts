import { LearningService } from "../business/learning.service"

/**
 * Controller for handling HTTP requests to the learning module
 * Routes will delegate to this controller
 * TODO: Implement route handlers once routes are defined
 */
export class LearningController {
  private service: LearningService

  constructor(db: any) {
    this.service = new LearningService(db)
  }

  // Category handlers
  async listCategories() {
    const categories = await this.service.getAllCategories()
    return { data: categories, statusCode: 200 }
  }

  async getCategory(id: string) {
    const category = await this.service.getCategory(id)
    if (!category) {
      return { error: "Category not found", statusCode: 404 }
    }
    return { data: category, statusCode: 200 }
  }

  async createCategory(data: any) {
    const category = await this.service.createCategory(data)
    return { data: category, statusCode: 201 }
  }

  async updateCategory(id: string, data: any) {
    try {
      const category = await this.service.updateCategory(id, data)
      return { data: category, statusCode: 200 }
    } catch (error) {
      return { error: "Category not found", statusCode: 404 }
    }
  }

  async deleteCategory(id: string) {
    try {
      await this.service.deleteCategory(id)
      return { statusCode: 204 }
    } catch (error) {
      return { error: "Category not found", statusCode: 404 }
    }
  }

  // Problem handlers
  async listProblems() {
    const problems = await this.service.getAllProblems()
    return { data: problems, statusCode: 200 }
  }

  async getProblem(id: string) {
    const problem = await this.service.getProblem(id)
    if (!problem) {
      return { error: "Problem not found", statusCode: 404 }
    }
    return { data: problem, statusCode: 200 }
  }

  async createProblem(data: any) {
    try {
      const problem = await this.service.createProblem(data)
      return { data: problem, statusCode: 201 }
    } catch (error) {
      return { error: "Failed to create problem", statusCode: 400 }
    }
  }

  async updateProblem(id: string, data: any) {
    try {
      const problem = await this.service.updateProblem(id, data)
      return { data: problem, statusCode: 200 }
    } catch (error) {
      return { error: "Problem not found", statusCode: 404 }
    }
  }

  async deleteProblem(id: string) {
    try {
      await this.service.deleteProblem(id)
      return { statusCode: 204 }
    } catch (error) {
      return { error: "Problem not found", statusCode: 404 }
    }
  }

  // Submission handlers
  async listUserSubmissions(userId: string) {
    const submissions = await this.service.getSubmissionsByUser(userId)
    return { data: submissions, statusCode: 200 }
  }

  async getSubmission(id: string) {
    const submission = await this.service.getSubmission(id)
    if (!submission) {
      return { error: "Submission not found", statusCode: 404 }
    }
    return { data: submission, statusCode: 200 }
  }

  async createSubmission(data: any) {
    try {
      const submission = await this.service.createSubmission(data)
      return { data: submission, statusCode: 201 }
    } catch (error) {
      return { error: "Failed to create submission", statusCode: 400 }
    }
  }

  // Schedule handlers
  async getUserSchedules(userId: string) {
    const schedules = await this.service.getUserSchedules(userId)
    return { data: schedules, statusCode: 200 }
  }

  async getDueReviews(userId: string) {
    const schedules = await this.service.getDueReviews(userId)
    return { data: schedules, statusCode: 200 }
  }

  async createSchedule(data: any) {
    try {
      const schedule = await this.service.createSchedule(data)
      return { data: schedule, statusCode: 201 }
    } catch (error) {
      return { error: "Failed to create schedule", statusCode: 400 }
    }
  }

  async updateSchedule(id: string, data: any) {
    try {
      const schedule = await this.service.updateSchedule(id, data)
      return { data: schedule, statusCode: 200 }
    } catch (error) {
      return { error: "Schedule not found", statusCode: 404 }
    }
  }
}
