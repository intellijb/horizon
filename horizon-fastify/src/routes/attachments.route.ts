import { FastifyInstance, FastifyRequest } from "fastify"
import {
  EntriesError,
  AttachmentsController,
  attachmentsSchemas,
  entriesResponseSchemas,
  entriesErrorResponseSchema,
  CreateAttachmentBody,
  AttachmentParams,
  ListAttachmentsQuery,
} from "@modules/features/entries"
import { createRoutesFactory, commonResponses } from "@modules/platform/fastify"

// Type-safe request interfaces
interface CreateAttachmentRequest extends FastifyRequest { Body: CreateAttachmentBody }
interface GetAttachmentRequest extends FastifyRequest { Params: AttachmentParams }
interface DeleteAttachmentRequest extends FastifyRequest { Params: AttachmentParams }
interface ListAttachmentsRequest extends FastifyRequest { Querystring: ListAttachmentsQuery }

export default async function attachmentsRoutes(fastify: FastifyInstance) {
  const controller = new AttachmentsController(fastify.db)
  const routes = createRoutesFactory(fastify, {
    tags: ["Attachments"],
    errorClass: EntriesError,
  })

  // List attachments
  routes.get("/attachments", {
    summary: "List attachments",
    description: "Get a paginated list of attachments",
  })
    .withQuery(attachmentsSchemas.listAttachmentsQuery)
    .withResponses({
      200: entriesResponseSchemas.attachmentList,
      400: entriesErrorResponseSchema,
      401: entriesErrorResponseSchema,
    })
    .handle(async (request: ListAttachmentsRequest) => {
      const { limit, offset, entryId } = request.query as ListAttachmentsQuery
      return await controller.listAttachments({ limit, offset, entryId })
    })

  // Get single attachment
  routes.get("/attachments/:id", {
    summary: "Get attachment by ID",
    description: "Get a single attachment by its ID",
  })
    .withParams(attachmentsSchemas.attachmentParams)
    .withResponses({
      200: entriesResponseSchemas.attachment,
      400: entriesErrorResponseSchema,
      401: entriesErrorResponseSchema,
      404: entriesErrorResponseSchema,
    })
    .handle(async (request: GetAttachmentRequest) => {
      const { id } = request.params as AttachmentParams
      return await controller.getAttachmentById(id)
    })

  // Create attachment
  routes.post("/attachments", {
    summary: "Create attachment",
    description: "Create a new attachment for an entry",
  })
    .withBody(attachmentsSchemas.createAttachmentBody)
    .withResponses({
      201: entriesResponseSchemas.attachment,
      400: entriesErrorResponseSchema,
      401: entriesErrorResponseSchema,
    })
    .handle(async (request: CreateAttachmentRequest) => {
      const { entryId, data, mimeType } = request.body as CreateAttachmentBody
      return await controller.createAttachment({ entryId, data, mimeType })
    })

  // Delete attachment
  routes.delete("/attachments/:id", {
    summary: "Delete attachment",
    description: "Delete an attachment",
  })
    .withParams(attachmentsSchemas.attachmentParams)
    .withResponses({
      204: { type: "null", description: "No content" },
      400: entriesErrorResponseSchema,
      401: entriesErrorResponseSchema,
      404: entriesErrorResponseSchema,
    })
    .handle(async (request: DeleteAttachmentRequest) => {
      const { id } = request.params as AttachmentParams
      return await controller.deleteAttachment(id)
    })
}