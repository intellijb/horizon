import { FastifyInstance } from "fastify"
import { JournalService } from "@modules/features/journal/business/journal.service"
import {
  createJournalCardSchema,
  updateJournalCardSchema,
  journalCardParamsSchema,
  createJournalCardInputSchema,
  updateJournalCardInputSchema,
  journalCardInputParamsSchema,
  journalDateQuerySchema,
  journalCardIdQuerySchema,
  CreateJournalCardBody,
  UpdateJournalCardBody,
  JournalCardParams,
  CreateJournalCardInputBody,
  UpdateJournalCardInputBody,
  JournalCardInputParams,
  JournalDateQuery,
  JournalCardIdQuery,
} from "./journal.types"

export async function journalRoutes(fastify: FastifyInstance) {
  const journalService = new JournalService(fastify.db)

  // Journal Card Routes
  fastify.post<{ Body: CreateJournalCardBody }>(
    "/cards",
    {
      schema: {
        body: createJournalCardSchema,
      },
    },
    async (request, reply) => {
      const card = await journalService.createCard(request.body)
      return reply.status(201).send(card)
    }
  )

  fastify.get("/cards", async (request, reply) => {
    const cards = await journalService.getAllCards()
    return reply.send(cards)
  })

  fastify.get<{ Params: JournalCardParams }>(
    "/cards/:id",
    {
      schema: {
        params: journalCardParamsSchema,
      },
    },
    async (request, reply) => {
      const card = await journalService.getCard(request.params.id)
      if (!card) {
        return reply.status(404).send({ error: "Journal card not found" })
      }
      return reply.send(card)
    }
  )

  fastify.patch<{ Params: JournalCardParams; Body: UpdateJournalCardBody }>(
    "/cards/:id",
    {
      schema: {
        params: journalCardParamsSchema,
        body: updateJournalCardSchema,
      },
    },
    async (request, reply) => {
      try {
        const card = await journalService.updateCard(request.params.id, request.body)
        return reply.send(card)
      } catch (error) {
        return reply.status(404).send({ error: "Journal card not found" })
      }
    }
  )

  fastify.delete<{ Params: JournalCardParams }>(
    "/cards/:id",
    {
      schema: {
        params: journalCardParamsSchema,
      },
    },
    async (request, reply) => {
      try {
        await journalService.deleteCard(request.params.id)
        return reply.status(204).send()
      } catch (error) {
        return reply.status(404).send({ error: "Journal card not found" })
      }
    }
  )

  // Journal Card Input Routes
  fastify.post<{ Body: CreateJournalCardInputBody }>(
    "/inputs",
    {
      schema: {
        body: createJournalCardInputSchema,
      },
    },
    async (request, reply) => {
      try {
        const input = await journalService.createCardInput(request.body)
        return reply.status(201).send(input)
      } catch (error) {
        if (error instanceof Error && error.message === "Journal card not found") {
          return reply.status(404).send({ error: error.message })
        }
        throw error
      }
    }
  )

  fastify.get<{ Querystring: JournalCardIdQuery }>(
    "/inputs",
    {
      schema: {
        querystring: journalCardIdQuerySchema,
      },
    },
    async (request, reply) => {
      const inputs = await journalService.getInputsByCard(request.query.cardId)
      return reply.send(inputs)
    }
  )

  fastify.get<{ Querystring: JournalDateQuery }>(
    "/inputs/by-date",
    {
      schema: {
        querystring: journalDateQuerySchema,
      },
    },
    async (request, reply) => {
      const inputs = await journalService.getInputsByDate(request.query.date)
      return reply.send(inputs)
    }
  )

  fastify.get("/inputs/today", async (request, reply) => {
    const inputs = await journalService.getTodayInputs()
    return reply.send(inputs)
  })

  fastify.get<{ Params: JournalCardInputParams }>(
    "/inputs/:id",
    {
      schema: {
        params: journalCardInputParamsSchema,
      },
    },
    async (request, reply) => {
      const input = await journalService.getCardInput(request.params.id)
      if (!input) {
        return reply.status(404).send({ error: "Journal card input not found" })
      }
      return reply.send(input)
    }
  )

  fastify.patch<{ Params: JournalCardInputParams; Body: UpdateJournalCardInputBody }>(
    "/inputs/:id",
    {
      schema: {
        params: journalCardInputParamsSchema,
        body: updateJournalCardInputSchema,
      },
    },
    async (request, reply) => {
      try {
        const input = await journalService.updateCardInput(request.params.id, request.body)
        return reply.send(input)
      } catch (error) {
        return reply.status(404).send({ error: "Journal card input not found" })
      }
    }
  )

  fastify.delete<{ Params: JournalCardInputParams }>(
    "/inputs/:id",
    {
      schema: {
        params: journalCardInputParamsSchema,
      },
    },
    async (request, reply) => {
      try {
        await journalService.deleteCardInput(request.params.id)
        return reply.status(204).send()
      } catch (error) {
        return reply.status(404).send({ error: "Journal card input not found" })
      }
    }
  )

  fastify.post<{ Params: JournalCardInputParams }>(
    "/inputs/:id/archive",
    {
      schema: {
        params: journalCardInputParamsSchema,
      },
    },
    async (request, reply) => {
      try {
        const input = await journalService.archiveCardInput(request.params.id)
        return reply.send(input)
      } catch (error) {
        return reply.status(404).send({ error: "Journal card input not found" })
      }
    }
  )

  fastify.post<{ Params: JournalCardInputParams }>(
    "/inputs/:id/activate",
    {
      schema: {
        params: journalCardInputParamsSchema,
      },
    },
    async (request, reply) => {
      try {
        const input = await journalService.activateCardInput(request.params.id)
        return reply.send(input)
      } catch (error) {
        return reply.status(404).send({ error: "Journal card input not found" })
      }
    }
  )

  // Batch operations
  fastify.get<{ Querystring: JournalDateQuery }>(
    "/data/by-date",
    {
      schema: {
        querystring: journalDateQuerySchema,
      },
    },
    async (request, reply) => {
      const data = await journalService.getJournalDataForDate(request.query.date)
      return reply.send(data)
    }
  )

  fastify.get("/data/today", async (request, reply) => {
    const data = await journalService.getTodayJournalData()
    return reply.send(data)
  })
}