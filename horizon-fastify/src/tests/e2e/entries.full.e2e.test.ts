import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals"
import {
  createTestApp,
  closeTestApp,
  testData,
  authHelpers,
  assertions,
  dbHelpers,
} from "../utils/test-helpers"

describe("Entries Routes Integration Tests", () => {
  let app: any
  let authToken: string
  let testEmails: string[] = []
  let testEntries: string[] = []
  let testAttachments: string[] = []

  beforeAll(async () => {
    app = await createTestApp()

    // Register and get auth token for protected routes
    const userData = testData.user()
    testEmails.push(userData.email)
    const result = await authHelpers.registerTestUser(app, userData)
    authToken = result.body.accessToken
  })

  afterAll(async () => {
    await dbHelpers.cleanupTestData(app, testEmails)
    await closeTestApp(app)
  })

  beforeEach(() => {
    testEntries = []
    testAttachments = []
  })

  describe("POST /entries", () => {
    it("should create a new entry successfully", async () => {
      const entryData = {
        content: "This is a test entry",
        type: "text",
        metadata: { source: "test" },
      }

      const response = await app.inject({
        method: "POST",
        url: "/entries",
        payload: entryData,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.data).toHaveProperty("id")
      expect(body.data.content).toBe(entryData.content)
      expect(body.data.type).toBe(entryData.type)
      expect(body.data.metadata).toEqual(entryData.metadata)
      expect(body.data).toHaveProperty("createdAt")
      expect(body.data).toHaveProperty("updatedAt")

      testEntries.push(body.data.id)
    })

    it("should create entry with default type when not specified", async () => {
      const entryData = {
        content: "Entry without type",
      }

      const response = await app.inject({
        method: "POST",
        url: "/entries",
        payload: entryData,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.data.content).toBe(entryData.content)
      expect(body.data.type).toBe("text") // Default type

      testEntries.push(body.data.id)
    })

    it("should return 400 for invalid entry data", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/entries",
        payload: {
          content: "", // Empty content should fail
        },
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body).toHaveProperty("error")
    })

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/entries",
        payload: {
          content: "Test entry",
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it("should handle metadata correctly", async () => {
      const entryData = {
        content: "Entry with complex metadata",
        type: "rich_text",
        metadata: {
          tags: ["important", "work"],
          priority: 1,
          nested: {
            value: "test",
            number: 42,
          },
        },
      }

      const response = await app.inject({
        method: "POST",
        url: "/entries",
        payload: entryData,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.data.metadata).toEqual(entryData.metadata)

      testEntries.push(body.data.id)
    })
  })

  describe("GET /entries", () => {
    let createdEntryIds: string[]

    beforeEach(async () => {
      // Create test entries
      const entries = [
        { content: "First entry", type: "text" },
        { content: "Second entry", type: "note" },
        { content: "Third entry", type: "text" },
      ]

      createdEntryIds = []
      for (const entryData of entries) {
        const response = await app.inject({
          method: "POST",
          url: "/entries",
          payload: entryData,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })
        const body = response.json()
        createdEntryIds.push(body.data.id)
        testEntries.push(body.data.id)
      }
    })

    it("should list entries with default pagination", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/entries",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data).toHaveProperty("items")
      expect(body.data).toHaveProperty("total")
      expect(body.data).toHaveProperty("limit", 20) // Default limit
      expect(body.data).toHaveProperty("offset", 0) // Default offset
      expect(Array.isArray(body.data.items)).toBe(true)
      expect(body.data.items.length).toBeGreaterThanOrEqual(3) // At least our test entries
    })

    it("should support custom pagination", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/entries?limit=2&offset=1",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.limit).toBe(2)
      expect(body.data.offset).toBe(1)
      expect(body.data.items.length).toBeLessThanOrEqual(2)
    })

    it("should filter by type", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/entries?type=text",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      // All returned entries should have type 'text'
      body.data.items.forEach((entry: any) => {
        expect(entry.type).toBe("text")
      })
    })

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/entries",
      })

      expect(response.statusCode).toBe(401)
    })

    it("should validate pagination parameters", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/entries?limit=0", // Invalid limit
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe("GET /entries/:id", () => {
    let entryId: string

    beforeEach(async () => {
      // Create a test entry
      const response = await app.inject({
        method: "POST",
        url: "/entries",
        payload: {
          content: "Entry for get test",
          type: "test",
          metadata: { test: true },
        },
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })
      const body = response.json()
      entryId = body.data.id
      testEntries.push(entryId)
    })

    it("should get entry by valid ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/entries/${entryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.id).toBe(entryId)
      expect(body.data.content).toBe("Entry for get test")
      expect(body.data.type).toBe("test")
      expect(body.data.metadata).toEqual({ test: true })
    })

    it("should return 404 for non-existent entry", async () => {
      const fakeId = "12345678-1234-1234-1234-123456789012"
      const response = await app.inject({
        method: "GET",
        url: `/entries/${fakeId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
      const body = response.json()
      expect(body.error).toContain("not found")
    })

    it("should return 400 for invalid UUID format", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/entries/invalid-id",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/entries/${entryId}`,
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe("PATCH /entries/:id", () => {
    let entryId: string

    beforeEach(async () => {
      // Create a test entry
      const response = await app.inject({
        method: "POST",
        url: "/entries",
        payload: {
          content: "Original content",
          type: "text",
          metadata: { version: 1 },
        },
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })
      const body = response.json()
      entryId = body.data.id
      testEntries.push(entryId)
    })

    it("should update entry content", async () => {
      const updateData = {
        content: "Updated content",
      }

      const response = await app.inject({
        method: "PATCH",
        url: `/entries/${entryId}`,
        payload: updateData,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.content).toBe(updateData.content)
      expect(body.data.type).toBe("text") // Should remain unchanged
      expect(body.data.updatedAt).not.toBe(body.data.createdAt)
    })

    it("should update entry type and metadata", async () => {
      const updateData = {
        type: "note",
        metadata: { version: 2, updated: true },
      }

      const response = await app.inject({
        method: "PATCH",
        url: `/entries/${entryId}`,
        payload: updateData,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.type).toBe(updateData.type)
      expect(body.data.metadata).toEqual(updateData.metadata)
      expect(body.data.content).toBe("Original content") // Should remain unchanged
    })

    it("should update all fields at once", async () => {
      const updateData = {
        content: "Completely updated",
        type: "important",
        metadata: { priority: "high", tags: ["urgent"] },
      }

      const response = await app.inject({
        method: "PATCH",
        url: `/entries/${entryId}`,
        payload: updateData,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.content).toBe(updateData.content)
      expect(body.data.type).toBe(updateData.type)
      expect(body.data.metadata).toEqual(updateData.metadata)
    })

    it("should return 404 for non-existent entry", async () => {
      const fakeId = "12345678-1234-1234-1234-123456789012"
      const response = await app.inject({
        method: "PATCH",
        url: `/entries/${fakeId}`,
        payload: { content: "Updated content" },
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })

    it("should return 400 for invalid update data", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/entries/${entryId}`,
        payload: { content: "" }, // Empty content
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/entries/${entryId}`,
        payload: { content: "Updated content" },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe("DELETE /entries/:id", () => {
    let entryId: string
    let attachmentId: string

    beforeEach(async () => {
      // Create a test entry
      const entryResponse = await app.inject({
        method: "POST",
        url: "/entries",
        payload: {
          content: "Entry to be deleted",
          type: "temp",
        },
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })
      const entryBody = entryResponse.json()
      entryId = entryBody.data.id
      testEntries.push(entryId)

      // Create an attachment for the entry
      const attachmentResponse = await app.inject({
        method: "POST",
        url: "/attachments",
        payload: {
          entryId: entryId,
          data: "attachment data",
          mimeType: "text/plain",
        },
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })
      const attachmentBody = attachmentResponse.json()
      attachmentId = attachmentBody.data.id
      testAttachments.push(attachmentId)
    })

    it("should delete entry successfully", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/entries/${entryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(204)
      expect(response.body).toBe("")
    })

    it("should also delete associated attachments", async () => {
      // Delete the entry
      await app.inject({
        method: "DELETE",
        url: `/entries/${entryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      // Check that attachment is also deleted
      const attachmentResponse = await app.inject({
        method: "GET",
        url: `/attachments/${attachmentId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(attachmentResponse.statusCode).toBe(404)
    })

    it("should return 404 for non-existent entry", async () => {
      const fakeId = "12345678-1234-1234-1234-123456789012"
      const response = await app.inject({
        method: "DELETE",
        url: `/entries/${fakeId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/entries/${entryId}`,
      })

      expect(response.statusCode).toBe(401)
    })

    it("should return 400 for invalid UUID format", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/entries/invalid-id",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe("Attachments", () => {
    let entryId: string

    beforeEach(async () => {
      // Create a test entry for attachments
      const response = await app.inject({
        method: "POST",
        url: "/entries",
        payload: {
          content: "Entry with attachments",
          type: "document",
        },
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })
      const body = response.json()
      entryId = body.data.id
      testEntries.push(entryId)
    })

    describe("POST /attachments", () => {
      it("should create attachment successfully", async () => {
        const attachmentData = {
          entryId: entryId,
          data: "Base64 encoded attachment data",
          mimeType: "image/png",
        }

        const response = await app.inject({
          method: "POST",
          url: "/attachments",
          payload: attachmentData,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })

        expect(response.statusCode).toBe(201)
        const body = response.json()
        expect(body.data).toHaveProperty("id")
        expect(body.data.entryId).toBe(entryId)
        expect(body.data.data).toBe(attachmentData.data)
        expect(body.data.mimeType).toBe(attachmentData.mimeType)

        testAttachments.push(body.data.id)
      })

      it("should create attachment without mimeType", async () => {
        const attachmentData = {
          entryId: entryId,
          data: "Plain text data",
        }

        const response = await app.inject({
          method: "POST",
          url: "/attachments",
          payload: attachmentData,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })

        expect(response.statusCode).toBe(201)
        const body = response.json()
        expect(body.data.entryId).toBe(entryId)
        expect(body.data.data).toBe(attachmentData.data)
        expect(body.data.mimeType).toBeNull()

        testAttachments.push(body.data.id)
      })

      it("should return 400 for invalid attachment data", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/attachments",
          payload: {
            entryId: entryId,
            data: "", // Empty data
          },
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })

        expect(response.statusCode).toBe(400)
      })

      it("should return 400 for invalid entryId format", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/attachments",
          payload: {
            entryId: "invalid-uuid",
            data: "Some data",
          },
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })

        expect(response.statusCode).toBe(400)
      })

      it("should return 401 without authentication", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/attachments",
          payload: {
            entryId: entryId,
            data: "Some data",
          },
        })

        expect(response.statusCode).toBe(401)
      })
    })

    describe("GET /attachments", () => {
      let attachmentIds: string[]

      beforeEach(async () => {
        // Create test attachments
        const attachments = [
          { entryId, data: "Attachment 1", mimeType: "text/plain" },
          { entryId, data: "Attachment 2", mimeType: "image/png" },
          { entryId, data: "Attachment 3" },
        ]

        attachmentIds = []
        for (const attachmentData of attachments) {
          const response = await app.inject({
            method: "POST",
            url: "/attachments",
            payload: attachmentData,
            headers: {
              authorization: `Bearer ${authToken}`,
            },
          })
          const body = response.json()
          attachmentIds.push(body.data.id)
          testAttachments.push(body.data.id)
        }
      })

      it("should list all attachments", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/attachments",
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data).toHaveProperty("items")
        expect(body.data).toHaveProperty("total")
        expect(body.data).toHaveProperty("limit", 20)
        expect(body.data).toHaveProperty("offset", 0)
        expect(body.data.items.length).toBeGreaterThanOrEqual(3)
      })

      it("should filter attachments by entryId", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/attachments?entryId=${entryId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data.items.length).toBe(3)
        body.data.items.forEach((attachment: any) => {
          expect(attachment.entryId).toBe(entryId)
        })
      })

      it("should support pagination", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/attachments?limit=2&offset=1",
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data.limit).toBe(2)
        expect(body.data.offset).toBe(1)
        expect(body.data.items.length).toBeLessThanOrEqual(2)
      })

      it("should return 401 without authentication", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/attachments",
        })

        expect(response.statusCode).toBe(401)
      })
    })

    describe("GET /attachments/:id", () => {
      let attachmentId: string

      beforeEach(async () => {
        const response = await app.inject({
          method: "POST",
          url: "/attachments",
          payload: {
            entryId: entryId,
            data: "Test attachment data",
            mimeType: "application/json",
          },
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })
        const body = response.json()
        attachmentId = body.data.id
        testAttachments.push(attachmentId)
      })

      it("should get attachment by ID", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/attachments/${attachmentId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data.id).toBe(attachmentId)
        expect(body.data.entryId).toBe(entryId)
        expect(body.data.data).toBe("Test attachment data")
        expect(body.data.mimeType).toBe("application/json")
      })

      it("should return 404 for non-existent attachment", async () => {
        const fakeId = "12345678-1234-1234-1234-123456789012"
        const response = await app.inject({
          method: "GET",
          url: `/attachments/${fakeId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })

        expect(response.statusCode).toBe(404)
      })

      it("should return 401 without authentication", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/attachments/${attachmentId}`,
        })

        expect(response.statusCode).toBe(401)
      })
    })

    describe("DELETE /attachments/:id", () => {
      let attachmentId: string

      beforeEach(async () => {
        const response = await app.inject({
          method: "POST",
          url: "/attachments",
          payload: {
            entryId: entryId,
            data: "Attachment to be deleted",
          },
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })
        const body = response.json()
        attachmentId = body.data.id
        testAttachments.push(attachmentId)
      })

      it("should delete attachment successfully", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/attachments/${attachmentId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })

        expect(response.statusCode).toBe(204)
        expect(response.body).toBe("")
      })

      it("should return 404 for non-existent attachment", async () => {
        const fakeId = "12345678-1234-1234-1234-123456789012"
        const response = await app.inject({
          method: "DELETE",
          url: `/attachments/${fakeId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })

        expect(response.statusCode).toBe(404)
      })

      it("should return 401 without authentication", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/attachments/${attachmentId}`,
        })

        expect(response.statusCode).toBe(401)
      })
    })
  })
})