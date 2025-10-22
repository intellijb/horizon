import { FastifyInstance } from "fastify"
import { LearningService } from "@modules/features/learning/business/learning.service"
import {
  createCategorySchema,
  updateCategorySchema,
  createProblemSchema,
  updateProblemSchema,
  createSubmissionSchema,
  createEvaluationSchema,
  createScheduleSchema,
  updateScheduleSchema,
  categoryQuerySchema,
  problemQuerySchema,
  submissionQuerySchema,
  scheduleQuerySchema,
  type CreateCategoryDto,
  type UpdateCategoryDto,
  type CreateProblemDto,
  type UpdateProblemDto,
  type CreateSubmissionDto,
  type CreateEvaluationDto,
  type CreateScheduleDto,
  type UpdateScheduleDto,
} from "@modules/features/learning/application/dto"

/**
 * Learning module routes
 * Provides endpoints for spaced-repetition learning platform:
 * - Categories (tree structure)
 * - Problems (LLM-generated content)
 * - Submissions (multiple attempts per problem)
 * - Schedules (SM-2 spaced repetition)
 * - Evaluations (AI-based feedback)
 */
export async function learningRoutes(fastify: FastifyInstance) {
  const learningService = new LearningService(fastify.db)

  // ========================================
  // Category Routes
  // ========================================

  // List all categories
  fastify.get("/categories", {
    schema: {
      querystring: categoryQuerySchema,
    },
  }, async (request, reply) => {
    const categories = await learningService.getAllCategories()
    return reply.send(categories)
  })

  // Get category by ID
  fastify.get<{ Params: { id: string } }>(
    "/categories/:id",
    async (request, reply) => {
      const category = await learningService.getCategory(request.params.id)
      if (!category) {
        return reply.status(404).send({ error: "Category not found" })
      }
      return reply.send(category)
    }
  )

  // Get child categories
  fastify.get<{ Params: { id: string } }>(
    "/categories/:id/children",
    async (request, reply) => {
      const categories = await learningService.getCategoriesByParent(request.params.id)
      return reply.send(categories)
    }
  )

  // Create category
  fastify.post<{ Body: CreateCategoryDto }>(
    "/categories",
    {
      schema: {
        body: createCategorySchema,
      },
    },
    async (request, reply) => {
      try {
        const category = await learningService.createCategory(request.body)
        return reply.status(201).send(category)
      } catch (error) {
        return reply.status(400).send({ error: "Failed to create category" })
      }
    }
  )

  // Update category
  fastify.patch<{ Params: { id: string }; Body: UpdateCategoryDto }>(
    "/categories/:id",
    {
      schema: {
        body: updateCategorySchema,
      },
    },
    async (request, reply) => {
      try {
        const category = await learningService.updateCategory(
          request.params.id,
          request.body
        )
        if (!category) {
          return reply.status(404).send({ error: "Category not found" })
        }
        return reply.send(category)
      } catch (error) {
        return reply.status(400).send({ error: "Failed to update category" })
      }
    }
  )

  // Delete category
  fastify.delete<{ Params: { id: string } }>(
    "/categories/:id",
    async (request, reply) => {
      try {
        await learningService.deleteCategory(request.params.id)
        return reply.status(204).send()
      } catch (error) {
        return reply.status(400).send({ error: "Failed to delete category" })
      }
    }
  )

  // ========================================
  // Problem Routes
  // ========================================

  // List all problems
  fastify.get("/problems", {
    schema: {
      querystring: problemQuerySchema,
    },
  }, async (request, reply) => {
    const problems = await learningService.getAllProblems()
    return reply.send(problems)
  })

  // Get problem by ID
  fastify.get<{ Params: { id: string } }>(
    "/problems/:id",
    async (request, reply) => {
      const problem = await learningService.getProblem(request.params.id)
      if (!problem) {
        return reply.status(404).send({ error: "Problem not found" })
      }
      return reply.send(problem)
    }
  )

  // Get problems by category
  fastify.get<{ Querystring: { categoryId: string } }>(
    "/problems/by-category",
    async (request, reply) => {
      const problems = await learningService.getProblemsByCategory(
        request.query.categoryId
      )
      return reply.send(problems)
    }
  )

  // Get problems by difficulty
  fastify.get<{ Querystring: { difficulty: string } }>(
    "/problems/by-difficulty",
    async (request, reply) => {
      const problems = await learningService.getProblemsByDifficulty(
        request.query.difficulty as any
      )
      return reply.send(problems)
    }
  )

  // Create problem
  fastify.post<{ Body: CreateProblemDto }>(
    "/problems",
    {
      schema: {
        body: createProblemSchema,
      },
    },
    async (request, reply) => {
      try {
        const problem = await learningService.createProblem(request.body)
        return reply.status(201).send(problem)
      } catch (error) {
        return reply.status(400).send({ error: "Failed to create problem" })
      }
    }
  )

  // Update problem
  fastify.patch<{ Params: { id: string }; Body: UpdateProblemDto }>(
    "/problems/:id",
    {
      schema: {
        body: updateProblemSchema,
      },
    },
    async (request, reply) => {
      try {
        const problem = await learningService.updateProblem(
          request.params.id,
          request.body
        )
        if (!problem) {
          return reply.status(404).send({ error: "Problem not found" })
        }
        return reply.send(problem)
      } catch (error) {
        return reply.status(400).send({ error: "Failed to update problem" })
      }
    }
  )

  // Delete problem
  fastify.delete<{ Params: { id: string } }>(
    "/problems/:id",
    async (request, reply) => {
      try {
        await learningService.deleteProblem(request.params.id)
        return reply.status(204).send()
      } catch (error) {
        return reply.status(400).send({ error: "Failed to delete problem" })
      }
    }
  )

  // ========================================
  // Submission Routes
  // ========================================

  // List submissions for a user
  fastify.get<{ Querystring: { userId: string } }>("/submissions", {
    schema: {
      querystring: submissionQuerySchema,
    },
  }, async (request, reply) => {
    const submissions = await learningService.getSubmissionsByUser(
      request.query.userId
    )
    return reply.send(submissions)
  })

  // Get submission by ID
  fastify.get<{ Params: { id: string } }>(
    "/submissions/:id",
    async (request, reply) => {
      const submission = await learningService.getSubmission(request.params.id)
      if (!submission) {
        return reply.status(404).send({ error: "Submission not found" })
      }
      return reply.send(submission)
    }
  )

  // Get submissions by problem
  fastify.get<{ Querystring: { problemId: string; userId?: string } }>(
    "/submissions/by-problem",
    async (request, reply) => {
      const submissions = await learningService.getSubmissionsByProblem(
        request.query.problemId,
        request.query.userId
      )
      return reply.send(submissions)
    }
  )

  // Create submission
  fastify.post<{ Body: CreateSubmissionDto }>(
    "/submissions",
    {
      schema: {
        body: createSubmissionSchema,
      },
    },
    async (request, reply) => {
      try {
        const submission = await learningService.createSubmission(request.body)
        return reply.status(201).send(submission)
      } catch (error) {
        return reply.status(400).send({ error: "Failed to create submission" })
      }
    }
  )

  // ========================================
  // Evaluation Routes
  // ========================================

  // Get evaluation by ID
  fastify.get<{ Params: { id: string } }>(
    "/evaluations/:id",
    async (request, reply) => {
      const evaluation = await learningService.getEvaluation(request.params.id)
      if (!evaluation) {
        return reply.status(404).send({ error: "Evaluation not found" })
      }
      return reply.send(evaluation)
    }
  )

  // Get evaluation by submission
  fastify.get<{ Querystring: { submissionId: string } }>(
    "/evaluations/by-submission",
    async (request, reply) => {
      const evaluation = await learningService.getEvaluationBySubmission(
        request.query.submissionId
      )
      if (!evaluation) {
        return reply.status(404).send({ error: "Evaluation not found" })
      }
      return reply.send(evaluation)
    }
  )

  // Create evaluation
  fastify.post<{ Body: CreateEvaluationDto }>(
    "/evaluations",
    {
      schema: {
        body: createEvaluationSchema,
      },
    },
    async (request, reply) => {
      try {
        const evaluation = await learningService.createEvaluation(request.body)
        return reply.status(201).send(evaluation)
      } catch (error) {
        return reply.status(400).send({ error: "Failed to create evaluation" })
      }
    }
  )

  // ========================================
  // Schedule Routes (Spaced Repetition)
  // ========================================

  // Get schedules for a user
  fastify.get<{ Querystring: { userId: string } }>("/schedules", {
    schema: {
      querystring: scheduleQuerySchema,
    },
  }, async (request, reply) => {
    const schedules = await learningService.getSchedulesByUser(
      request.query.userId
    )
    return reply.send(schedules)
  })

  // Get due items for review
  fastify.get<{ Querystring: { userId: string } }>("/schedules/due", {
    schema: {
      querystring: scheduleQuerySchema,
    },
  }, async (request, reply) => {
    const schedules = await learningService.getDueSchedules(request.query.userId)
    return reply.send(schedules)
  })

  // Get schedule by problem
  fastify.get<{ Querystring: { userId: string; problemId: string } }>(
    "/schedules/by-problem",
    async (request, reply) => {
      const schedule = await learningService.getScheduleByProblem(
        request.query.userId,
        request.query.problemId
      )
      if (!schedule) {
        return reply.status(404).send({ error: "Schedule not found" })
      }
      return reply.send(schedule)
    }
  )

  // Create schedule
  fastify.post<{ Body: CreateScheduleDto }>(
    "/schedules",
    {
      schema: {
        body: createScheduleSchema,
      },
    },
    async (request, reply) => {
      try {
        const schedule = await learningService.createSchedule(request.body)
        return reply.status(201).send(schedule)
      } catch (error) {
        return reply.status(400).send({ error: "Failed to create schedule" })
      }
    }
  )

  // Update schedule
  fastify.patch<{ Params: { id: string }; Body: UpdateScheduleDto }>(
    "/schedules/:id",
    {
      schema: {
        body: updateScheduleSchema,
      },
    },
    async (request, reply) => {
      try {
        const schedule = await learningService.updateSchedule(
          request.params.id,
          request.body
        )
        if (!schedule) {
          return reply.status(404).send({ error: "Schedule not found" })
        }
        return reply.send(schedule)
      } catch (error) {
        return reply.status(400).send({ error: "Failed to update schedule" })
      }
    }
  )

  // Delete schedule
  fastify.delete<{ Params: { id: string } }>(
    "/schedules/:id",
    async (request, reply) => {
      try {
        await learningService.deleteSchedule(request.params.id)
        return reply.status(204).send()
      } catch (error) {
        return reply.status(400).send({ error: "Failed to delete schedule" })
      }
    }
  )

  // Utility endpoint: Calculate next review using SM-2
  fastify.post<{
    Body: { quality: number; easeFactor: number; interval: number; repetitions: number }
  }>(
    "/schedules/calculate-next-review",
    async (request, reply) => {
      const { quality, easeFactor, interval, repetitions } = request.body
      const result = learningService.calculateNextReview(
        quality,
        easeFactor,
        interval,
        repetitions
      )
      return reply.send(result)
    }
  )
}