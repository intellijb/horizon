import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import {
  CreateEntryUseCase,
  ListEntriesUseCase,
  CreateAttachmentUseCase,
  EntriesRepositoryDrizzle,
  EntriesError,
} from "@modules/features/entries"
import {
  CreateEntryBodySchema,
  UpdateEntryBodySchema,
  EntryParamsSchema,
  ListEntriesQuerySchema,
  CreateEntryBody,
  UpdateEntryBody,
  EntryParams,
  ListEntriesQuery,
} from "./entries.types"

interface CreateEntryRequest {
  Body: CreateEntryBody
}

interface UpdateEntryRequest {
  Body: UpdateEntryBody
  Params: EntryParams
}

interface GetEntryRequest {
  Params: EntryParams
}

interface DeleteEntryRequest {
  Params: EntryParams
}

interface ListEntriesRequest {
  Querystring: ListEntriesQuery
}

export default async function entriesRoutes(fastify: FastifyInstance) {
  // Initialize repository and use cases
  const repository = new EntriesRepositoryDrizzle(fastify.db)
  const createEntryUseCase = new CreateEntryUseCase(repository)
  const listEntriesUseCase = new ListEntriesUseCase(repository)

  // List entries
  fastify.get<ListEntriesRequest>("/", {
    schema: {
      tags: ["Entries"],
      summary: "List entries",
      description: "Get a paginated list of entries",
      querystring: ListEntriesQuerySchema,
    },
  }, async (request: FastifyRequest<ListEntriesRequest>, reply: FastifyReply) => {
    try {
      const result = await listEntriesUseCase.execute(request.query)

      return reply.send({
        items: result.items.map(entry => entry.toJSON()),
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

  // Get single entry
  fastify.get<GetEntryRequest>("/:id", {
    schema: {
      tags: ["Entries"],
      summary: "Get entry by ID",
      description: "Get a single entry by its ID",
      params: EntryParamsSchema,
    },
  }, async (request: FastifyRequest<GetEntryRequest>, reply: FastifyReply) => {
    try {
      const entry = await repository.findEntryById(request.params.id)

      if (!entry) {
        return reply.code(404).send({ error: "Entry not found" })
      }

      return reply.send(entry.toJSON())
    } catch (error) {
      if (error instanceof EntriesError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      throw error
    }
  })

  // Create entry
  fastify.post<CreateEntryRequest>("/", {
    schema: {
      tags: ["Entries"],
      summary: "Create entry",
      description: "Create a new entry",
      body: CreateEntryBodySchema,
    },
  }, async (request: FastifyRequest<CreateEntryRequest>, reply: FastifyReply) => {
    try {
      const entry = await createEntryUseCase.execute(request.body)
      return reply.code(201).send(entry.toJSON())
    } catch (error) {
      if (error instanceof EntriesError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      throw error
    }
  })

  // Update entry
  fastify.patch<UpdateEntryRequest>("/:id", {
    schema: {
      tags: ["Entries"],
      summary: "Update entry",
      description: "Update an existing entry",
      params: EntryParamsSchema,
      body: UpdateEntryBodySchema,
    },
  }, async (request: FastifyRequest<UpdateEntryRequest>, reply: FastifyReply) => {
    try {
      const entry = await repository.updateEntry(request.params.id, request.body)

      if (!entry) {
        return reply.code(404).send({ error: "Entry not found" })
      }

      return reply.send(entry.toJSON())
    } catch (error) {
      if (error instanceof EntriesError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      throw error
    }
  })

  // Delete entry
  fastify.delete<DeleteEntryRequest>("/:id", {
    schema: {
      tags: ["Entries"],
      summary: "Delete entry",
      description: "Soft delete an entry",
      params: EntryParamsSchema,
    },
  }, async (request: FastifyRequest<DeleteEntryRequest>, reply: FastifyReply) => {
    try {
      const deleted = await repository.deleteEntry(request.params.id)

      if (!deleted) {
        return reply.code(404).send({ error: "Entry not found" })
      }

      // Also delete all attachments for this entry
      await repository.deleteAttachmentsByEntryId(request.params.id)

      return reply.code(204).send()
    } catch (error) {
      if (error instanceof EntriesError) {
        return reply.code(error.statusCode).send({ error: error.message })
      }
      throw error
    }
  })
}