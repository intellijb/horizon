import { FastifyInstance } from "fastify"
import { LearningController } from "@modules/features/learning/application/learning.controller"
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
  const controller = new LearningController(fastify.db)

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
    const result = await controller.listCategories()
    return reply.send(result.data)
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
      const result = await controller.getCategory(request.params.id)
      return reply.status(result.statusCode).send(result.data || { error: result.error })
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
      const result = await controller.createCategory(request.body)
      return reply.status(result.statusCode).send(result.data || { error: result.error })
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
      const result = await controller.updateCategory(request.params.id, request.body)
      return reply.status(result.statusCode).send(result.data || { error: result.error })
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
      const result = await controller.deleteCategory(request.params.id)
      if (result.statusCode === 204) {
        return reply.status(204).send()
      }
      return reply.status(result.statusCode).send({ error: result.error })
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
    const result = await controller.listProblems()
    return reply.send(result.data)
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
      const result = await controller.getProblem(request.params.id)
      return reply.status(result.statusCode).send(result.data || { error: result.error })
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
      const result = await controller.createProblem(request.body)
      return reply.status(result.statusCode).send(result.data || { error: result.error })
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
      const result = await controller.updateProblem(request.params.id, request.body)
      return reply.status(result.statusCode).send(result.data || { error: result.error })
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
      const result = await controller.deleteProblem(request.params.id)
      if (result.statusCode === 204) {
        return reply.status(204).send()
      }
      return reply.status(result.statusCode).send({ error: result.error })
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
    const result = await controller.listUserSubmissions(request.query.userId)
    return reply.send(result.data)
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
      const result = await controller.getSubmission(request.params.id)
      return reply.status(result.statusCode).send(result.data || { error: result.error })
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
      const result = await controller.createSubmission(request.body)
      return reply.status(result.statusCode).send(result.data || { error: result.error })
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
    const result = await controller.getUserSchedules(request.query.userId)
    return reply.send(result.data)
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
    const result = await controller.getDueReviews(request.query.userId)
    return reply.send(result.data)
  })

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
      const result = await controller.createSchedule(request.body)
      return reply.status(result.statusCode).send(result.data || { error: result.error })
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
      const result = await controller.updateSchedule(request.params.id, request.body)
      return reply.status(result.statusCode).send(result.data || { error: result.error })
    }
  )

  // Utility endpoints

  // Calculate next review using SM-2
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
      const result = await controller.calculateNextReview(quality, easeFactor, interval, repetitions)
      return reply.send(result.data)
    }
  )

  // Process review with quality rating
  fastify.post<{
    Body: { userId: string; problemId: string; quality: number }
  }>(
    "/schedules/process-review",
    {
      schema: {
        tags: ['Learning'],
        summary: 'Process review',
        description: 'Process a review with quality rating and update schedule',
        body: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            problemId: { type: 'string', format: 'uuid' },
            quality: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              description: 'Response quality (0-5)'
            }
          },
          required: ['userId', 'problemId', 'quality']
        },
        response: {
          200: {
            description: 'Updated schedule',
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
      }
    },
    async (request, reply) => {
      const { userId, problemId, quality } = request.body
      const result = await controller.processReview(userId, problemId, quality)
      return reply.status(result.statusCode).send(result.data || { error: result.error })
    }
  )

  // Get user analytics
  fastify.get<{ Querystring: { userId: string } }>(
    "/analytics/user",
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get user analytics',
        description: 'Get performance analytics for a user',
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' }
          },
          required: ['userId']
        },
        response: {
          200: {
            description: 'User analytics',
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
      }
    },
    async (request, reply) => {
      const result = await controller.getUserAnalytics(request.query.userId)
      return reply.status(result.statusCode).send(result.data || { error: result.error })
    }
  )
}