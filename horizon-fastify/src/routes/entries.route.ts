import { FastifyInstance, FastifyRequest } from "fastify"
import {
  EntriesError,
  EntriesController,
  entriesSchemas,
  entriesResponseSchemas,
  entriesErrorResponseSchema,
  CreateEntryBody,
  UpdateEntryBody,
  EntryParams,
  ListEntriesQuery,
} from "@modules/features/entries"
import { createRoutesFactory, commonResponses } from "@modules/platform/fastify"

// Type-safe request interfaces
interface CreateEntryRequest extends FastifyRequest { Body: CreateEntryBody }
interface UpdateEntryRequest extends FastifyRequest { Body: UpdateEntryBody; Params: EntryParams }
interface GetEntryRequest extends FastifyRequest { Params: EntryParams }
interface DeleteEntryRequest extends FastifyRequest { Params: EntryParams }
interface ListEntriesRequest extends FastifyRequest { Querystring: ListEntriesQuery }

export default async function entriesRoutes(fastify: FastifyInstance) {
  const controller = new EntriesController(fastify.db)
  const routes = createRoutesFactory(fastify, {
    tags: ["Entries"],
    errorClass: EntriesError,
  })

  // List entries
  routes.get("/entries", {
    summary: "List entries",
    description: "Get a paginated list of entries",
  })
    .withQuery(entriesSchemas.listEntriesQuery)
    .withResponses({
      200: entriesResponseSchemas.entryList,
      400: entriesErrorResponseSchema,
      401: entriesErrorResponseSchema,
    })
    .handle(async (request: ListEntriesRequest) => {
      const { limit, offset, type } = request.query as ListEntriesQuery
      return await controller.listEntries({ limit, offset, type })
    })

  // Get single entry
  routes.get("/entries/:id", {
    summary: "Get entry by ID",
    description: "Get a single entry by its ID",
  })
    .withParams(entriesSchemas.entryParams)
    .withResponses({
      200: entriesResponseSchemas.entry,
      400: entriesErrorResponseSchema,
      401: entriesErrorResponseSchema,
      404: entriesErrorResponseSchema,
    })
    .handle(async (request: GetEntryRequest) => {
      const { id } = request.params as EntryParams
      return await controller.getEntryById(id)
    })

  // Create entry
  routes.post("/entries", {
    summary: "Create entry",
    description: "Create a new entry",
  })
    .withBody(entriesSchemas.createEntryBody)
    .withResponses({
      201: entriesResponseSchemas.entry,
      400: entriesErrorResponseSchema,
      401: entriesErrorResponseSchema,
    })
    .handle(async (request: CreateEntryRequest) => {
      const { content, type, metadata } = request.body as CreateEntryBody
      return await controller.createEntry({ content, type, metadata })
    })

  // Update entry
  routes.patch("/entries/:id", {
    summary: "Update entry",
    description: "Update an existing entry",
  })
    .withParams(entriesSchemas.entryParams)
    .withBody(entriesSchemas.updateEntryBody)
    .withResponses({
      200: entriesResponseSchemas.entry,
      400: entriesErrorResponseSchema,
      401: entriesErrorResponseSchema,
      404: entriesErrorResponseSchema,
    })
    .handle(async (request: UpdateEntryRequest) => {
      const { id } = request.params as EntryParams
      const { content, type, metadata } = request.body as UpdateEntryBody
      return await controller.updateEntry(id, { content, type, metadata })
    })

  // Delete entry
  routes.delete("/entries/:id", {
    summary: "Delete entry",
    description: "Soft delete an entry",
  })
    .withParams(entriesSchemas.entryParams)
    .withResponses({
      204: { type: "null", description: "No content" },
      400: entriesErrorResponseSchema,
      401: entriesErrorResponseSchema,
      404: entriesErrorResponseSchema,
    })
    .handle(async (request: DeleteEntryRequest) => {
      const { id } = request.params as EntryParams
      return await controller.deleteEntry(id)
    })
}