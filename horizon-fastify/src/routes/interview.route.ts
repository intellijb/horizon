import { FastifyInstance, FastifyRequest } from "fastify"
import { z } from "zod"
import { InterviewController } from "@modules/features/interview/application/interview.controller"
import { createRoutesFactory } from "@modules/platform/fastify"
import {
  createInterviewBodySchema,
  answerInterviewBodySchema,
  completeInterviewBodySchema,
  emptyBodySchema,
  sessionIdParamsSchema,
  interviewIdParamsSchema,
  listInterviewsQuerySchema,
  listCategoriesQuerySchema,
  listTopicsQuerySchema,
  listInterviewersQuerySchema,
  createInterviewResponseSchema,
  answerInterviewResponseSchema,
  interviewSessionSchema,
  interviewHistoryResponseSchema,
  categorySchema,
  topicSchema,
  interviewerSchema,
  errorResponseSchema,
  CreateInterviewBody,
  AnswerInterviewBody,
  CompleteInterviewBody,
  SessionIdParams,
  InterviewIdParams,
  ListInterviewsQuery,
  ListCategoriesQuery,
  ListTopicsQuery,
  ListInterviewersQuery,
} from "@modules/features/interview/domain/route-types"

// Type-safe request interfaces
interface CreateInterviewRequest extends FastifyRequest { Body: CreateInterviewBody }
interface AnswerInterviewRequest extends FastifyRequest { Body: AnswerInterviewBody; Params: SessionIdParams }
interface CompleteInterviewRequest extends FastifyRequest { Body: CompleteInterviewBody; Params: SessionIdParams }
interface GetSessionRequest extends FastifyRequest { Params: SessionIdParams }
interface ListInterviewsRequest extends FastifyRequest { Querystring: ListInterviewsQuery }
interface ListCategoriesRequest extends FastifyRequest { Querystring: ListCategoriesQuery }
interface ListTopicsRequest extends FastifyRequest { Querystring: ListTopicsQuery }
interface ListInterviewersRequest extends FastifyRequest { Querystring: ListInterviewersQuery }
interface GetByIdRequest extends FastifyRequest { Params: InterviewIdParams }
interface SearchRequest extends FastifyRequest { Querystring: { q: string } }

export default async function interviewRoutes(fastify: FastifyInstance) {
  const controller = new InterviewController(fastify.db)
  const routes = createRoutesFactory(fastify, {
    tags: ["Interview"],
  })

  // ================== Interview Session Routes ==================

  // Create a new interview session
  routes.post("/interviews", {
    summary: "Create a new interview session",
    description: "Start a new interview session with selected topics and configuration",
  })
    .withBody(createInterviewBodySchema)
    .withResponses({
      201: createInterviewResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    })
    .handle(async (request) => {
      const token = request.headers.authorization?.replace("Bearer ", "") || ""
      return await controller.createInterview(request.body as CreateInterviewBody, token)
    })

  // Answer in an interview session
  routes.post("/interviews/:sessionId/answer", {
    summary: "Send an answer to the interview",
    description: "Submit a response to the current interview question",
  })
    .withParams(sessionIdParamsSchema)
    .withBody(answerInterviewBodySchema)
    .withResponses({
      200: answerInterviewResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    })
    .handle(async (request) => {
      const token = request.headers.authorization?.replace("Bearer ", "") || ""
      const params = request.params as SessionIdParams
      const body = request.body as AnswerInterviewBody
      return await controller.answerInterview(params.sessionId, body, token)
    })

  // Complete an interview session
  routes.post("/interviews/:sessionId/complete", {
    summary: "Complete an interview session",
    description: "Mark an interview session as completed with optional final score",
  })
    .withParams(sessionIdParamsSchema)
    .withBody(completeInterviewBodySchema)
    .withResponses({
      200: interviewSessionSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    })
    .handle(async (request) => {
      const token = request.headers.authorization?.replace("Bearer ", "") || ""
      const params = request.params as SessionIdParams
      const body = request.body as CompleteInterviewBody
      return await controller.completeInterview(params.sessionId, body, token)
    })

  // Pause an interview session
  routes.post("/interviews/:sessionId/pause", {
    summary: "Pause an interview session",
    description: "Pause an active interview session to resume later",
  })
    .withParams(sessionIdParamsSchema)
    .withBody(emptyBodySchema)
    .withResponses({
      200: interviewSessionSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    })
    .handle(async (request) => {
      const token = request.headers.authorization?.replace("Bearer ", "") || ""
      const params = request.params as SessionIdParams
      return await controller.pauseInterview(params.sessionId, token)
    })

  // Resume an interview session
  routes.post("/interviews/:sessionId/resume", {
    summary: "Resume an interview session",
    description: "Resume a paused interview session",
  })
    .withParams(sessionIdParamsSchema)
    .withBody(emptyBodySchema)
    .withResponses({
      200: interviewSessionSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    })
    .handle(async (request) => {
      const token = request.headers.authorization?.replace("Bearer ", "") || ""
      const params = request.params as SessionIdParams
      return await controller.resumeInterview(params.sessionId, token)
    })

  // Get interview history
  routes.get("/interviews/:sessionId/history", {
    summary: "Get interview conversation history",
    description: "Retrieve the full conversation history of an interview session",
  })
    .withParams(sessionIdParamsSchema)
    .withResponses({
      200: interviewHistoryResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    })
    .handle(async (request) => {
      const token = request.headers.authorization?.replace("Bearer ", "") || ""
      const params = request.params as SessionIdParams
      return await controller.getInterviewHistory(params.sessionId, token)
    })

  // Get single interview session
  routes.get("/interviews/:sessionId", {
    summary: "Get interview session details",
    description: "Retrieve details of a specific interview session",
  })
    .withParams(sessionIdParamsSchema)
    .withResponses({
      200: interviewSessionSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    })
    .handle(async (request) => {
      const token = request.headers.authorization?.replace("Bearer ", "") || ""
      const params = request.params as SessionIdParams
      return await controller.getSession(params.sessionId, token)
    })

  // List interview sessions
  routes.get("/interviews", {
    summary: "List interview sessions",
    description: "Get a list of interview sessions with optional filters",
  })
    .withQuery(listInterviewsQuerySchema)
    .withResponses({
      200: z.array(interviewSessionSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    })
    .handle(async (request) => {
      const token = request.headers.authorization?.replace("Bearer ", "") || ""
      const query = request.query as ListInterviewsQuery
      return await controller.listSessions(query, token)
    })

  // ================== Category Routes ==================

  // List categories
  routes.get("/interviews/categories", {
    summary: "List interview categories",
    description: "Get a list of all interview categories",
  })
    .withQuery(listCategoriesQuerySchema)
    .withResponses({
      200: z.array(categorySchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    })
    .handle(async (request) => {
      const query = request.query as ListCategoriesQuery
      return await controller.listCategories(query)
    })

  // List categories with topics
  routes.get("/interviews/categories/with-topics", {
    summary: "List categories with their topics",
    description: "Get categories including their associated topics",
  })
    .withQuery(listCategoriesQuerySchema)
    .withResponses({
      200: z.array(categorySchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    })
    .handle(async (request) => {
      const query = request.query as ListCategoriesQuery
      return await controller.listCategoriesWithTopics(query)
    })

  // Get single category
  routes.get("/interviews/categories/:id", {
    summary: "Get category details",
    description: "Retrieve details of a specific category",
  })
    .withParams(interviewIdParamsSchema)
    .withResponses({
      200: categorySchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    })
    .handle(async (request) => {
      const params = request.params as InterviewIdParams
      return await controller.getCategory(params.id)
    })

  // Get category with topics
  routes.get("/interviews/categories/:id/with-topics", {
    summary: "Get category with topics",
    description: "Retrieve a category including its topics",
  })
    .withParams(interviewIdParamsSchema)
    .withResponses({
      200: categorySchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    })
    .handle(async (request) => {
      const params = request.params as InterviewIdParams
      return await controller.getCategoryWithTopics(params.id)
    })

  // ================== Topic Routes ==================

  // List topics
  routes.get("/interviews/topics", {
    summary: "List interview topics",
    description: "Get a list of interview topics with optional filters",
  })
    .withQuery(listTopicsQuerySchema)
    .withResponses({
      200: z.array(topicSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    })
    .handle(async (request) => {
      const query = request.query as ListTopicsQuery
      return await controller.listTopics(query)
    })

  // Search topics
  routes.get("/interviews/topics/search", {
    summary: "Search topics",
    description: "Search for topics by keyword",
  })
    .withQuery(z.object({
      q: z.string().min(1),
    }))
    .withResponses({
      200: z.array(topicSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    })
    .handle(async (request) => {
      const query = request.query as { q: string }
      return await controller.searchTopics(query.q)
    })

  // Get single topic
  routes.get("/interviews/topics/:id", {
    summary: "Get topic details",
    description: "Retrieve details of a specific topic",
  })
    .withParams(interviewIdParamsSchema)
    .withResponses({
      200: topicSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    })
    .handle(async (request) => {
      const params = request.params as InterviewIdParams
      return await controller.getTopic(params.id)
    })

  // ================== Interviewer Routes ==================

  // List interviewers
  routes.get("/interviews/interviewers", {
    summary: "List interviewers",
    description: "Get a list of available interviewers with optional filters",
  })
    .withQuery(listInterviewersQuerySchema)
    .withResponses({
      200: z.array(interviewerSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    })
    .handle(async (request) => {
      const query = request.query as ListInterviewersQuery
      return await controller.listInterviewers(query)
    })

  // Search interviewers
  routes.get("/interviews/interviewers/search", {
    summary: "Search interviewers",
    description: "Search for interviewers by name, company, or role",
  })
    .withQuery(z.object({
      q: z.string().min(1),
    }))
    .withResponses({
      200: z.array(interviewerSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    })
    .handle(async (request) => {
      const query = request.query as { q: string }
      return await controller.searchInterviewers(query.q)
    })

  // Get single interviewer
  routes.get("/interviews/interviewers/:id", {
    summary: "Get interviewer details",
    description: "Retrieve details of a specific interviewer",
  })
    .withParams(interviewIdParamsSchema)
    .withResponses({
      200: interviewerSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    })
    .handle(async (request) => {
      const params = request.params as InterviewIdParams
      return await controller.getInterviewer(params.id)
    })
}