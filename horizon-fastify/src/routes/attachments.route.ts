import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import {
  CreateAttachmentUseCase,
  EntriesRepositoryDrizzle,
  EntriesError,
} from "@modules/features/entries"
import {
  CreateAttachmentBodySchema,
  AttachmentParamsSchema,
  ListAttachmentsQuerySchema,
  CreateAttachmentBody,
  AttachmentParams,
  ListAttachmentsQuery,
} from "./entries.types"

interface CreateAttachmentRequest {
  Body: CreateAttachmentBody
}

interface GetAttachmentRequest {
  Params: AttachmentParams
}

interface DeleteAttachmentRequest {
  Params: AttachmentParams
}

interface ListAttachmentsRequest {
  Querystring: ListAttachmentsQuery
}

export default async function attachmentsRoutes(fastify: FastifyInstance) {
  // Initialize repository and use cases
  const repository = new EntriesRepositoryDrizzle(fastify.db)
  const createAttachmentUseCase = new CreateAttachmentUseCase(repository)

  // List attachments
  fastify.get<ListAttachmentsRequest>("/", {
    schema: {
      tags: ["Attachments"],
      summary: "List attachments",
      description: "Get a paginated list of attachments",
      querystring: ListAttachmentsQuerySchema,
    },
  }, async (request: FastifyRequest<ListAttachmentsRequest>, reply: FastifyReply) => {
    try {
      const result = await repository.listAttachments(request.query)

      return reply.send({
        items: result.items.map(attachment => attachment.toJSON()),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      })
    } catch (error) {
      if (error instanceof EntriesError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      throw error
    }
  })

  // Get single attachment
  fastify.get<GetAttachmentRequest>("/:id", {
    schema: {
      tags: ["Attachments"],
      summary: "Get attachment by ID",
      description: "Get a single attachment by its ID",
      params: AttachmentParamsSchema,
    },
  }, async (request: FastifyRequest<GetAttachmentRequest>, reply: FastifyReply) => {
    try {
      const attachment = await repository.findAttachmentById(request.params.id)

      if (!attachment) {
        return reply.code(404).send({ error: "Attachment not found" })
      }

      return reply.send(attachment.toJSON())
    } catch (error) {
      if (error instanceof EntriesError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      throw error
    }
  })

  // Create attachment
  fastify.post<CreateAttachmentRequest>("/", {
    schema: {
      tags: ["Attachments"],
      summary: "Create attachment",
      description: "Create a new attachment for an entry",
      body: CreateAttachmentBodySchema,
    },
  }, async (request: FastifyRequest<CreateAttachmentRequest>, reply: FastifyReply) => {
    try {
      const attachment = await createAttachmentUseCase.execute(request.body)
      return reply.code(201).send(attachment.toJSON())
    } catch (error) {
      if (error instanceof EntriesError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      throw error
    }
  })

  // Delete attachment
  fastify.delete<DeleteAttachmentRequest>("/:id", {
    schema: {
      tags: ["Attachments"],
      summary: "Delete attachment",
      description: "Delete an attachment",
      params: AttachmentParamsSchema,
    },
  }, async (request: FastifyRequest<DeleteAttachmentRequest>, reply: FastifyReply) => {
    try {
      const deleted = await repository.deleteAttachment(request.params.id)

      if (!deleted) {
        return reply.code(404).send({ error: "Attachment not found" })
      }

      return reply.code(204).send()
    } catch (error) {
      if (error instanceof EntriesError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      throw error
    }
  })
}