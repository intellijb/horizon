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
      tags: ['Learning'],
      summary: 'List all categories',
      description: 'Get all learning categories with optional filtering',
      querystring: categoryQuerySchema,
      response: {
        200: {
          description: 'Successful response',
          type: 'array',
        },
      },
    },
  }, async (request, reply) => {
    const categories = await learningService.getAllCategories()
    return reply.send(categories)
  })

  // Get category by ID
  fastify.get<{ Params: { id: string } }>(
    "/categories/:id",
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get category by ID',
        description: 'Get a specific learning category',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Category found',
            type: 'object',
          },
          404: {
            description: 'Category not found',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
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
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get child categories',
        description: 'Get all child categories of a parent category',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Child categories list',
            type: 'array',
          }
        }
      }
    },
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
        tags: ['Learning'],
        summary: 'Create a new category',
        description: 'Create a new learning category',
        body: createCategorySchema,
        response: {
          201: {
            description: 'Category created successfully',
            type: 'object',
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
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
        tags: ['Learning'],
        summary: 'Update a category',
        description: 'Update an existing learning category',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        body: updateCategorySchema,
        response: {
          200: {
            description: 'Category updated successfully',
            type: 'object',
          },
          404: {
            description: 'Category not found',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
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
    {
      schema: {
        tags: ['Learning'],
        summary: 'Delete a category',
        description: 'Delete a learning category',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        response: {
          204: {
            description: 'Category deleted successfully',
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
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
      tags: ['Learning'],
      summary: 'List all problems',
      description: 'Get all learning problems with optional filtering',
      querystring: problemQuerySchema,
      response: {
        200: {
          description: 'Successful response',
          type: 'array',
        }
      }
    },
  }, async (request, reply) => {
    const problems = await learningService.getAllProblems()
    return reply.send(problems)
  })

  // Get problem by ID
  fastify.get<{ Params: { id: string } }>(
    "/problems/:id",
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get problem by ID',
        description: 'Get a specific learning problem',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Problem found',
            type: 'object',
          },
          404: {
            description: 'Problem not found',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
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
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get problems by category',
        description: 'Get all problems in a specific category',
        querystring: {
          type: 'object',
          properties: {
            categoryId: { type: 'string', format: 'uuid' }
          },
          required: ['categoryId']
        },
        response: {
          200: {
            description: 'Problems list',
            type: 'array',
          }
        }
      }
    },
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
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get problems by difficulty',
        description: 'Get all problems with a specific difficulty level',
        querystring: {
          type: 'object',
          properties: {
            difficulty: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced', 'expert']
            }
          },
          required: ['difficulty']
        },
        response: {
          200: {
            description: 'Problems list',
            type: 'array',
          }
        }
      }
    },
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
        tags: ['Learning'],
        summary: 'Create a new problem',
        description: 'Create a new learning problem',
        body: createProblemSchema,
        response: {
          201: {
            description: 'Problem created successfully',
            type: 'object',
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
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
        tags: ['Learning'],
        summary: 'Update a problem',
        description: 'Update an existing learning problem',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        body: updateProblemSchema,
        response: {
          200: {
            description: 'Problem updated successfully',
            type: 'object',
          },
          404: {
            description: 'Problem not found',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
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
    {
      schema: {
        tags: ['Learning'],
        summary: 'Delete a problem',
        description: 'Delete a learning problem',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        response: {
          204: {
            description: 'Problem deleted successfully',
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
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
      tags: ['Learning'],
      summary: 'List user submissions',
      description: 'Get all submissions for a specific user',
      querystring: submissionQuerySchema,
      response: {
        200: {
          description: 'Submissions list',
          type: 'array',
        }
      }
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
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get submission by ID',
        description: 'Get a specific submission',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Submission found',
            type: 'object',
          },
          404: {
            description: 'Submission not found',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
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
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get submissions by problem',
        description: 'Get all submissions for a specific problem',
        querystring: {
          type: 'object',
          properties: {
            problemId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' }
          },
          required: ['problemId']
        },
        response: {
          200: {
            description: 'Submissions list',
            type: 'array',
          }
        }
      }
    },
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
        tags: ['Learning'],
        summary: 'Create a new submission',
        description: 'Submit an answer to a problem',
        body: createSubmissionSchema,
        response: {
          201: {
            description: 'Submission created successfully',
            type: 'object',
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
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
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get evaluation by ID',
        description: 'Get a specific AI evaluation',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        response: {
          200: {
            description: 'Evaluation found',
            type: 'object',
          },
          404: {
            description: 'Evaluation not found',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
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
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get evaluation by submission',
        description: 'Get the AI evaluation for a specific submission',
        querystring: {
          type: 'object',
          properties: {
            submissionId: { type: 'string', format: 'uuid' }
          },
          required: ['submissionId']
        },
        response: {
          200: {
            description: 'Evaluation found',
            type: 'object',
          },
          404: {
            description: 'Evaluation not found',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
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
        tags: ['Learning'],
        summary: 'Create a new evaluation',
        description: 'Create an AI evaluation for a submission',
        body: createEvaluationSchema,
        response: {
          201: {
            description: 'Evaluation created successfully',
            type: 'object',
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
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
      tags: ['Learning'],
      summary: 'List user schedules',
      description: 'Get all spaced repetition schedules for a user',
      querystring: scheduleQuerySchema,
      response: {
        200: {
          description: 'Schedules list',
          type: 'array',
        }
      }
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
      tags: ['Learning'],
      summary: 'Get due schedules',
      description: 'Get problems that are due for review',
      querystring: scheduleQuerySchema,
      response: {
        200: {
          description: 'Due schedules list',
          type: 'array',
        }
      }
    },
  }, async (request, reply) => {
    const schedules = await learningService.getDueSchedules(request.query.userId)
    return reply.send(schedules)
  })

  // Get schedule by problem
  fastify.get<{ Querystring: { userId: string; problemId: string } }>(
    "/schedules/by-problem",
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get schedule by problem',
        description: 'Get the spaced repetition schedule for a specific problem',
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            problemId: { type: 'string', format: 'uuid' }
          },
          required: ['userId', 'problemId']
        },
        response: {
          200: {
            description: 'Schedule found',
            type: 'object',
          },
          404: {
            description: 'Schedule not found',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
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
        tags: ['Learning'],
        summary: 'Create a new schedule',
        description: 'Create a spaced repetition schedule for a problem',
        body: createScheduleSchema,
        response: {
          201: {
            description: 'Schedule created successfully',
            type: 'object',
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
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
        tags: ['Learning'],
        summary: 'Update a schedule',
        description: 'Update a spaced repetition schedule',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        body: updateScheduleSchema,
        response: {
          200: {
            description: 'Schedule updated successfully',
            type: 'object',
          },
          404: {
            description: 'Schedule not found',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
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
    {
      schema: {
        tags: ['Learning'],
        summary: 'Delete a schedule',
        description: 'Delete a spaced repetition schedule',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        },
        response: {
          204: {
            description: 'Schedule deleted successfully',
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
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
    {
      schema: {
        tags: ['Learning'],
        summary: 'Calculate next review',
        description: 'Calculate the next review date using the SM-2 algorithm',
        body: {
          type: 'object',
          properties: {
            quality: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              description: 'Response quality (0-5)'
            },
            easeFactor: {
              type: 'number',
              minimum: 1.3,
              maximum: 2.5,
              description: 'Current ease factor'
            },
            interval: {
              type: 'number',
              minimum: 1,
              description: 'Current interval in days'
            },
            repetitions: {
              type: 'number',
              minimum: 0,
              description: 'Number of successful repetitions'
            }
          },
          required: ['quality', 'easeFactor', 'interval', 'repetitions']
        },
        response: {
          200: {
            description: 'Next review calculation',
            type: 'object',
            properties: {
              easeFactor: { type: 'number' },
              interval: { type: 'number' },
              repetitions: { type: 'number' },
              nextReviewDate: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
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