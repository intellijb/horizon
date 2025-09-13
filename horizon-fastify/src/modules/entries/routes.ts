import { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import {
  CreateEntryBodySchema,
  UpdateEntryBodySchema,
  EntryParamsSchema,
  ListEntriesQuerySchema,
  EntrySchema,
  EntryListSchema,
} from "./schemas"
import { createEntriesService } from "./service"

const entriesRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  const service = createEntriesService(fastify)

  // List entries
  app.get(
    "/",
    {
      schema: {
        querystring: ListEntriesQuerySchema,
        response: {
          200: EntryListSchema,
        },
        tags: ["entries"],
        summary: "List entries",
        description: "Get a paginated list of entries",
      },
    },
    async (request, reply) => {
      const entries = await service.listEntries(request.query)
      return reply.send(entries)
    },
  )

  // Get single entry
  app.get(
    "/:id",
    {
      schema: {
        params: EntryParamsSchema,
        response: {
          200: EntrySchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["entries"],
        summary: "Get entry",
        description: "Get a single entry by ID",
      },
    },
    async (request, reply) => {
      const entry = await service.getEntry(request.params.id)
      return reply.send(entry)
    },
  )

  // Create entry
  app.post(
    "/",
    {
      schema: {
        body: CreateEntryBodySchema,
        response: {
          201: EntrySchema,
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["entries"],
        summary: "Create entry",
        description: "Create a new entry",
      },
    },
    async (request, reply) => {
      const entry = await service.createEntry(request.body)
      return reply.code(201).send(entry)
    },
  )

  // Update entry
  app.patch(
    "/:id",
    {
      schema: {
        params: EntryParamsSchema,
        body: UpdateEntryBodySchema,
        response: {
          200: EntrySchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
        tags: ["entries"],
        summary: "Update entry",
        description: "Update an existing entry",
      },
    },
    async (request, reply) => {
      const entry = await service.updateEntry(request.params.id, request.body)
      return reply.send(entry)
    },
  )

  // Delete entry
  app.delete(
    "/:id",
    {
      schema: {
        params: EntryParamsSchema,
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
        tags: ["entries"],
        summary: "Delete entry",
        description: "Soft delete an entry",
      },
    },
    async (request, reply) => {
      await service.deleteEntry(request.params.id)
      return reply.code(204).send()
    },
  )
}

export default entriesRoutes