import { FastifyPluginAsync } from "fastify"
import { z } from "zod"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { IntelligenceUseCases } from "@modules/features/intelligence/application/use-cases"
import { DrizzleIntelligenceRepository } from "@modules/features/intelligence/extensions/repository"

const intelligenceRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  const repository = new DrizzleIntelligenceRepository(fastify.db)
  const useCases = new IntelligenceUseCases(repository)

  // Create topic
  app.post("/topics", {
    schema: {
      body: z.object({
        id: z.string().min(1),
      }),
    },
  }, async (request, reply) => {
    try {
      const topic = await useCases.createTopic(request.body)
      return reply.code(201).send(topic)
    } catch (error) {
      app.log.error(error)
      return reply.code(400).send({ error: error.message })
    }
  })

  // Get all topics
  app.get("/topics", async (request, reply) => {
    try {
      const topics = await useCases.getAllTopics()
      return reply.send(topics)
    } catch (error) {
      app.log.error(error)
      return reply.code(500).send({ error: error.message })
    }
  })

  // Get topic with relations
  app.get("/topics/:id", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
    },
  }, async (request, reply) => {
    try {
      const topic = await useCases.getTopic(request.params.id)
      return reply.send(topic)
    } catch (error) {
      app.log.error(error)
      return reply.code(404).send({ error: error.message })
    }
  })

  // Delete topic
  app.delete("/topics/:id", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
    },
  }, async (request, reply) => {
    try {
      await useCases.deleteTopic(request.params.id)
      return reply.code(204).send()
    } catch (error) {
      app.log.error(error)
      return reply.code(404).send({ error: error.message })
    }
  })

  // Define schema for topic
  app.post("/topics/:id/schema", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      body: z.object({
        columnName: z.string().min(1),
        columnType: z.string().min(1),
        columnDescription: z.string().optional(),
      }),
    },
  }, async (request, reply) => {
    try {
      const schema = await useCases.defineSchema({
        topicId: request.params.id,
        ...request.body,
      })
      return reply.code(201).send(schema)
    } catch (error) {
      app.log.error(error)
      return reply.code(400).send({ error: error.message })
    }
  })

  // Get topic schema
  app.get("/topics/:id/schema", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
    },
  }, async (request, reply) => {
    try {
      const schema = await useCases.getTopicSchema(request.params.id)
      return reply.send(schema)
    } catch (error) {
      app.log.error(error)
      return reply.code(404).send({ error: error.message })
    }
  })

  // Add input to topic
  app.post("/topics/:id/inputs", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      body: z.object({
        data: z.record(z.string(), z.any()),
        status: z.enum(["active", "archived", "deleted"]).optional(),
      }),
    },
  }, async (request, reply) => {
    try {
      const input = await useCases.addInput({
        topicId: request.params.id,
        ...request.body,
      })
      return reply.code(201).send(input)
    } catch (error) {
      app.log.error(error)
      return reply.code(400).send({ error: error.message })
    }
  })

  // Get topic inputs
  app.get("/topics/:id/inputs", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      querystring: z.object({
        status: z.enum(["active", "archived", "deleted"]).optional(),
      }),
    },
  }, async (request, reply) => {
    try {
      const inputs = await useCases.getTopicInputs(request.params.id, request.query.status)
      return reply.send(inputs)
    } catch (error) {
      app.log.error(error)
      return reply.code(404).send({ error: error.message })
    }
  })

  // Update input status
  app.patch("/inputs/:inputId/status", {
    schema: {
      params: z.object({
        inputId: z.string(),
      }),
      body: z.object({
        status: z.enum(["active", "archived", "deleted"]),
      }),
    },
  }, async (request, reply) => {
    try {
      const input = await useCases.updateInputStatus({
        id: request.params.inputId,
        status: request.body.status,
      })
      return reply.send(input)
    } catch (error) {
      app.log.error(error)
      return reply.code(404).send({ error: error.message })
    }
  })

  // Link conversation to topic
  app.post("/topics/:id/conversations", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      body: z.object({
        conversationId: z.string().min(1),
        provider: z.enum(["openai"]).optional(),
      }),
    },
  }, async (request, reply) => {
    try {
      const conversation = await useCases.linkConversation({
        topicId: request.params.id,
        ...request.body,
      })
      return reply.code(201).send(conversation)
    } catch (error) {
      app.log.error(error)
      return reply.code(400).send({ error: error.message })
    }
  })

  // Get topic conversations
  app.get("/topics/:id/conversations", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
    },
  }, async (request, reply) => {
    try {
      const conversations = await useCases.getTopicConversations(request.params.id)
      return reply.send(conversations)
    } catch (error) {
      app.log.error(error)
      return reply.code(404).send({ error: error.message })
    }
  })

  // Add note to topic
  app.post("/topics/:id/notes", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      body: z.object({
        note: z.string().min(1),
      }),
    },
  }, async (request, reply) => {
    try {
      const note = await useCases.addNote({
        topicId: request.params.id,
        note: request.body.note,
      })
      return reply.code(201).send(note)
    } catch (error) {
      app.log.error(error)
      return reply.code(400).send({ error: error.message })
    }
  })

  // Get topic notes
  app.get("/topics/:id/notes", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
    },
  }, async (request, reply) => {
    try {
      const notes = await useCases.getTopicNotes(request.params.id)
      return reply.send(notes)
    } catch (error) {
      app.log.error(error)
      return reply.code(404).send({ error: error.message })
    }
  })

  // Update note
  app.put("/notes/:noteId", {
    schema: {
      params: z.object({
        noteId: z.string(),
      }),
      body: z.object({
        note: z.string().min(1),
      }),
    },
  }, async (request, reply) => {
    try {
      const note = await useCases.updateNote({
        id: request.params.noteId,
        note: request.body.note,
      })
      return reply.send(note)
    } catch (error) {
      app.log.error(error)
      return reply.code(404).send({ error: error.message })
    }
  })

  // Delete note
  app.delete("/notes/:noteId", {
    schema: {
      params: z.object({
        noteId: z.string(),
      }),
    },
  }, async (request, reply) => {
    try {
      await useCases.deleteNote(request.params.noteId)
      return reply.code(204).send()
    } catch (error) {
      app.log.error(error)
      return reply.code(404).send({ error: error.message })
    }
  })
}

export default intelligenceRoutes