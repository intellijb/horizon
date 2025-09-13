import { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import {
  CreateAttachmentBodySchema,
  AttachmentParamsSchema,
  ListAttachmentsQuerySchema,
  AttachmentSchema,
  AttachmentListSchema,
} from "./schemas"
import { createAttachmentsService } from "./service"

const attachmentsRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  const service = createAttachmentsService(fastify)

  // List attachments
  app.get(
    "/",
    {
      schema: {
        querystring: ListAttachmentsQuerySchema,
        response: {
          200: AttachmentListSchema,
        },
        tags: ["attachments"],
        summary: "List attachments",
        description: "Get a paginated list of attachments",
      },
    },
    async (request, reply) => {
      const attachments = await service.listAttachments(request.query)
      return reply.send(attachments)
    },
  )

  // Get single attachment
  app.get(
    "/:id",
    {
      schema: {
        params: AttachmentParamsSchema,
        response: {
          200: AttachmentSchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["attachments"],
        summary: "Get attachment",
        description: "Get a single attachment by ID",
      },
    },
    async (request, reply) => {
      const attachment = await service.getAttachment(request.params.id)
      return reply.send(attachment)
    },
  )

  // Create attachment
  app.post(
    "/",
    {
      schema: {
        body: CreateAttachmentBodySchema,
        response: {
          201: AttachmentSchema,
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["attachments"],
        summary: "Create attachment",
        description: "Create a new attachment for an entry",
      },
    },
    async (request, reply) => {
      const attachment = await service.createAttachment(request.body)
      return reply.code(201).send(attachment)
    },
  )

  // Delete attachment
  app.delete(
    "/:id",
    {
      schema: {
        params: AttachmentParamsSchema,
        response: {
          204: {
            type: "null",
            description: "No content",
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["attachments"],
        summary: "Delete attachment",
        description: "Delete an attachment",
      },
    },
    async (request, reply) => {
      await service.deleteAttachment(request.params.id)
      return reply.code(204).send()
    },
  )
}

export default attachmentsRoutes