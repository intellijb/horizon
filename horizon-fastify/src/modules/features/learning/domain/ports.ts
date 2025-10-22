import {
  Category,
  Problem,
  Submission,
  Evaluation,
  Schedule,
} from "./entities"
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateProblemDto,
  UpdateProblemDto,
  CreateSubmissionDto,
  UpdateSubmissionDto,
  CreateEvaluationDto,
  UpdateScheduleDto,
  CreateScheduleDto,
} from "../application/dto"

/**
 * Repository port interface for the learning module
 * Defines the contract for data persistence operations
 */
export interface LearningRepository {
  // Category operations
  createCategory(dto: CreateCategoryDto): Promise<Category>
  getCategoryById(id: string): Promise<Category | null>
  getAllCategories(): Promise<Category[]>
  getCategoriesByParentId(parentId: string): Promise<Category[]>
  updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category>
  deleteCategory(id: string): Promise<void>

  // Problem operations
  createProblem(dto: CreateProblemDto): Promise<Problem>
  getProblemById(id: string): Promise<Problem | null>
  getProblemsByCategoryId(categoryId: string): Promise<Problem[]>
  getProblemsByDifficulty(difficulty: string): Promise<Problem[]>
  getAllProblems(): Promise<Problem[]>
  updateProblem(id: string, dto: UpdateProblemDto): Promise<Problem>
  deleteProblem(id: string): Promise<void>

  // Submission operations
  createSubmission(dto: CreateSubmissionDto): Promise<Submission>
  getSubmissionById(id: string): Promise<Submission | null>
  getSubmissionsByUserId(userId: string): Promise<Submission[]>
  getSubmissionsByProblemId(problemId: string): Promise<Submission[]>
  getSubmissionsByUserAndProblem(userId: string, problemId: string): Promise<Submission[]>
  updateSubmission(id: string, dto: UpdateSubmissionDto): Promise<Submission>
  deleteSubmission(id: string): Promise<void>

  // Evaluation operations
  createEvaluation(dto: CreateEvaluationDto): Promise<Evaluation>
  getEvaluationById(id: string): Promise<Evaluation | null>
  getEvaluationBySubmissionId(submissionId: string): Promise<Evaluation | null>
  deleteEvaluation(id: string): Promise<void>

  // Schedule operations (Spaced Repetition)
  createSchedule(dto: CreateScheduleDto): Promise<Schedule>
  getScheduleById(id: string): Promise<Schedule | null>
  getSchedulesByUserId(userId: string): Promise<Schedule[]>
  getSchedulesByUserAndProblem(userId: string, problemId: string): Promise<Schedule | null>
  getDueSchedules(userId: string, date: Date): Promise<Schedule[]>
  updateSchedule(id: string, dto: UpdateScheduleDto): Promise<Schedule>
  deleteSchedule(id: string): Promise<void>
}
