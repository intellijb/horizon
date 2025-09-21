import { describe, test, expect, beforeAll, afterAll } from "@jest/globals"
import { FastifyInstance } from "fastify"
import { buildApp } from "../../app"

describe("Intelligence E2E Tests", () => {
  let app: FastifyInstance
  let testTopicId: string

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
    testTopicId = `test-topic-${Date.now()}`
  })

  afterAll(async () => {
    // Clean up test data
    try {
      await app.inject({
        method: "DELETE",
        url: `/api/intelligence/topics/${testTopicId}`,
      })
    } catch (error) {
      // Ignore cleanup errors
    }
    await app.close()
  })

  describe("Topic Management", () => {
    test("should create a new topic", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/intelligence/topics",
        payload: {
          id: testTopicId,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        id: testTopicId,
      })
      expect(body.createdAt).toBeDefined()
      expect(body.updatedAt).toBeDefined()
    })

    test("should not create duplicate topic", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/intelligence/topics",
        payload: {
          id: testTopicId,
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toContain("already exists")
    })

    test("should validate topic ID format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/intelligence/topics",
        payload: {
          id: "",
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe("FST_ERR_VALIDATION")
    })

    test("should get all topics", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/intelligence/topics",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.some((t: any) => t.id === testTopicId)).toBe(true)
    })

    test("should get topic with relations", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/intelligence/topics/${testTopicId}`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        id: testTopicId,
      })
      expect(body.schema).toBeDefined()
      expect(body.inputs).toBeDefined()
      expect(body.conversations).toBeDefined()
      expect(body.notes).toBeDefined()
    })

    test("should return 404 for non-existent topic", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/intelligence/topics/non-existent-topic",
      })

      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body.error).toContain("not found")
    })
  })

  describe("Schema Management", () => {
    test("should define schema for topic", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/intelligence/topics/${testTopicId}/schema`,
        payload: {
          columnName: "email",
          columnType: "string",
          columnDescription: "User email address",
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        topicId: testTopicId,
        columnName: "email",
        columnType: "string",
        columnDescription: "User email address",
      })
      expect(body.id).toBeDefined()
    })

    test("should validate schema data", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/intelligence/topics/${testTopicId}/schema`,
        payload: {
          columnName: "",
          columnType: "string",
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe("FST_ERR_VALIDATION")
    })

    test("should get topic schema", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/intelligence/topics/${testTopicId}/schema`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)
      expect(body[0]).toMatchObject({
        topicId: testTopicId,
        columnName: "email",
      })
    })
  })

  describe("Input Management", () => {
    let inputId: string

    test("should add input to topic", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/intelligence/topics/${testTopicId}/inputs`,
        payload: {
          data: {
            email: "test@example.com",
            name: "Test User",
          },
          status: "active",
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        topicId: testTopicId,
        status: "active",
        data: {
          email: "test@example.com",
          name: "Test User",
        },
      })
      inputId = body.id
    })

    test("should validate input data", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/intelligence/topics/${testTopicId}/inputs`,
        payload: {
          data: "invalid-data",
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe("FST_ERR_VALIDATION")
    })

    test("should get topic inputs", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/intelligence/topics/${testTopicId}/inputs`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)
      expect(body[0]).toMatchObject({
        topicId: testTopicId,
        status: "active",
      })
    })

    test("should filter inputs by status", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/intelligence/topics/${testTopicId}/inputs?status=active`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.every((input: any) => input.status === "active")).toBe(true)
    })

    test("should update input status", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/intelligence/inputs/${inputId}/status`,
        payload: {
          status: "archived",
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        id: inputId,
        status: "archived",
      })
    })

    test("should validate status value", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/intelligence/inputs/${inputId}/status`,
        payload: {
          status: "invalid-status",
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe("FST_ERR_VALIDATION")
    })
  })

  describe("Conversation Management", () => {
    test("should link conversation to topic", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/intelligence/topics/${testTopicId}/conversations`,
        payload: {
          conversationId: "conv-123",
          provider: "openai",
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        topicId: testTopicId,
        conversationId: "conv-123",
        conversationProvider: "openai",
      })
    })

    test("should validate conversation data", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/intelligence/topics/${testTopicId}/conversations`,
        payload: {
          conversationId: "",
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe("FST_ERR_VALIDATION")
    })

    test("should get topic conversations", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/intelligence/topics/${testTopicId}/conversations`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)
      expect(body[0]).toMatchObject({
        topicId: testTopicId,
        conversationId: "conv-123",
      })
    })
  })

  describe("Note Management", () => {
    let noteId: string

    test("should add note to topic", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/intelligence/topics/${testTopicId}/notes`,
        payload: {
          note: "This is an important note",
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        topicId: testTopicId,
        note: "This is an important note",
      })
      noteId = body.id
    })

    test("should validate note data", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/intelligence/topics/${testTopicId}/notes`,
        payload: {
          note: "",
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.code).toBe("FST_ERR_VALIDATION")
    })

    test("should get topic notes", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/intelligence/topics/${testTopicId}/notes`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)
      expect(body[0]).toMatchObject({
        topicId: testTopicId,
        note: "This is an important note",
      })
    })

    test("should update note", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/api/intelligence/notes/${noteId}`,
        payload: {
          note: "Updated note content",
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        id: noteId,
        note: "Updated note content",
      })
    })

    test("should delete note", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/intelligence/notes/${noteId}`,
      })

      expect(response.statusCode).toBe(204)
      expect(response.body).toBe("")
    })

    test("should return 404 when deleting non-existent note", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/intelligence/notes/non-existent-note",
      })

      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body.error).toContain("not found")
    })
  })

  describe("Topic Deletion", () => {
    test("should delete topic with all relations", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/intelligence/topics/${testTopicId}`,
      })

      expect(response.statusCode).toBe(204)
      expect(response.body).toBe("")

      // Verify topic is deleted
      const getResponse = await app.inject({
        method: "GET",
        url: `/api/intelligence/topics/${testTopicId}`,
      })
      expect(getResponse.statusCode).toBe(404)
    })

    test("should return 404 when deleting non-existent topic", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/intelligence/topics/non-existent-topic",
      })

      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body.error).toContain("not found")
    })
  })
})