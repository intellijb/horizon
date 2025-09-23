import { describe, it, expect, beforeAll, afterAll } from "@jest/globals"
import { FastifyInstance } from "fastify"
import { buildApp } from "../../app"

describe("Journal E2E Tests", () => {
  let app: FastifyInstance
  let createdCardId: string
  let createdInputId: string

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe("Journal Cards", () => {
    describe("POST /api/journal/cards", () => {
      it("should create a new journal card", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/api/journal/cards",
          payload: {
            category: "health",
            type: "exercise",
            name: "Morning Run",
            order: 1,
          },
        })

        expect(response.statusCode).toBe(201)
        const body = JSON.parse(response.body)
        expect(body).toHaveProperty("id")
        expect(body.category).toBe("health")
        expect(body.type).toBe("exercise")
        expect(body.name).toBe("Morning Run")
        expect(body.order).toBe(1)

        createdCardId = body.id
      })

      it("should create a card with default order", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/api/journal/cards",
          payload: {
            category: "mood",
            type: "emotion",
            name: "Daily Mood Check",
          },
        })

        expect(response.statusCode).toBe(201)
        const body = JSON.parse(response.body)
        expect(body.order).toBe(0)
      })

      it("should validate required fields", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/api/journal/cards",
          payload: {
            category: "health",
            // missing type and name
          },
        })

        expect(response.statusCode).toBe(400)
      })
    })

    describe("GET /api/journal/cards", () => {
      it("should get all journal cards", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/journal/cards",
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Array.isArray(body)).toBe(true)
        expect(body.length).toBeGreaterThan(0)
        expect(body[0]).toHaveProperty("id")
        expect(body[0]).toHaveProperty("category")
        expect(body[0]).toHaveProperty("type")
        expect(body[0]).toHaveProperty("name")
        expect(body[0]).toHaveProperty("order")
      })
    })

    describe("GET /api/journal/cards/:id", () => {
      it("should get a specific journal card", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/journal/cards/${createdCardId}`,
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.id).toBe(createdCardId)
        expect(body.name).toBe("Morning Run")
      })

      it("should return 404 for non-existent card", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/journal/cards/non_existent_id",
        })

        expect(response.statusCode).toBe(404)
        const body = JSON.parse(response.body)
        expect(body.error).toBe("Journal card not found")
      })
    })

    describe("PATCH /api/journal/cards/:id", () => {
      it("should update a journal card", async () => {
        const response = await app.inject({
          method: "PATCH",
          url: `/api/journal/cards/${createdCardId}`,
          payload: {
            name: "Evening Run",
            order: 2,
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.id).toBe(createdCardId)
        expect(body.name).toBe("Evening Run")
        expect(body.order).toBe(2)
        expect(body.category).toBe("health") // unchanged
      })

      it("should return 404 for non-existent card", async () => {
        const response = await app.inject({
          method: "PATCH",
          url: "/api/journal/cards/non_existent_id",
          payload: {
            name: "Updated Name",
          },
        })

        expect(response.statusCode).toBe(404)
      })
    })
  })

  describe("Journal Inputs", () => {
    describe("POST /api/journal/inputs", () => {
      it("should create a new journal input", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/api/journal/inputs",
          payload: {
            cardId: createdCardId,
            value: "Ran 5km in 25 minutes",
            order: 1,
          },
        })

        expect(response.statusCode).toBe(201)
        const body = JSON.parse(response.body)
        expect(body).toHaveProperty("id")
        expect(body.cardId).toBe(createdCardId)
        expect(body.value).toBe("Ran 5km in 25 minutes")
        expect(body.status).toBe("active")
        expect(body.order).toBe(1)
        expect(body).toHaveProperty("date")

        createdInputId = body.id
      })

      it("should create input with default status", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/api/journal/inputs",
          payload: {
            cardId: createdCardId,
            value: "Another run entry",
          },
        })

        expect(response.statusCode).toBe(201)
        const body = JSON.parse(response.body)
        expect(body.status).toBe("active")
        expect(body.order).toBe(0)
      })

      it("should return 404 for non-existent card", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/api/journal/inputs",
          payload: {
            cardId: "non_existent_card",
            value: "Test value",
          },
        })

        expect(response.statusCode).toBe(404)
        const body = JSON.parse(response.body)
        expect(body.error).toBe("Journal card not found")
      })
    })

    describe("GET /api/journal/inputs", () => {
      it("should get inputs by card ID", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/journal/inputs?cardId=${createdCardId}`,
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Array.isArray(body)).toBe(true)
        expect(body.length).toBeGreaterThan(0)
        expect(body[0].cardId).toBe(createdCardId)
      })
    })

    describe("GET /api/journal/inputs/today", () => {
      it("should get today's inputs", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/journal/inputs/today",
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Array.isArray(body)).toBe(true)

        if (body.length > 0) {
          const today = new Date().toISOString().split("T")[0]
          expect(body[0].date).toBe(today)
        }
      })
    })

    describe("GET /api/journal/inputs/by-date", () => {
      it("should get inputs by specific date", async () => {
        const today = new Date().toISOString().split("T")[0]
        const response = await app.inject({
          method: "GET",
          url: `/api/journal/inputs/by-date?date=${today}`,
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Array.isArray(body)).toBe(true)

        if (body.length > 0) {
          expect(body[0].date).toBe(today)
        }
      })

      it("should validate date format", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/journal/inputs/by-date?date=invalid-date",
        })

        expect(response.statusCode).toBe(400)
      })
    })

    describe("GET /api/journal/inputs/:id", () => {
      it("should get a specific input", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/journal/inputs/${createdInputId}`,
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.id).toBe(createdInputId)
        expect(body.value).toBe("Ran 5km in 25 minutes")
      })

      it("should return 404 for non-existent input", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/journal/inputs/non_existent_id",
        })

        expect(response.statusCode).toBe(404)
      })
    })

    describe("PATCH /api/journal/inputs/:id", () => {
      it("should update an input", async () => {
        const response = await app.inject({
          method: "PATCH",
          url: `/api/journal/inputs/${createdInputId}`,
          payload: {
            value: "Ran 6km in 30 minutes",
            order: 2,
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.id).toBe(createdInputId)
        expect(body.value).toBe("Ran 6km in 30 minutes")
        expect(body.order).toBe(2)
      })

      it("should update input status", async () => {
        const response = await app.inject({
          method: "PATCH",
          url: `/api/journal/inputs/${createdInputId}`,
          payload: {
            status: "archived",
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.status).toBe("archived")
      })
    })

    describe("POST /api/journal/inputs/:id/archive", () => {
      it("should archive an input", async () => {
        // First, set it back to active
        await app.inject({
          method: "PATCH",
          url: `/api/journal/inputs/${createdInputId}`,
          payload: { status: "active" },
        })

        const response = await app.inject({
          method: "POST",
          url: `/api/journal/inputs/${createdInputId}/archive`,
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.status).toBe("archived")
      })
    })

    describe("POST /api/journal/inputs/:id/activate", () => {
      it("should activate an archived input", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/journal/inputs/${createdInputId}/activate`,
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.status).toBe("active")
      })
    })
  })

  describe("Batch Operations", () => {
    describe("GET /api/journal/data/today", () => {
      it("should get today's journal data", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/journal/data/today",
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body).toHaveProperty("cards")
        expect(body).toHaveProperty("inputs")
        expect(Array.isArray(body.cards)).toBe(true)
        expect(Array.isArray(body.inputs)).toBe(true)

        // Should have the cards we created
        expect(body.cards.length).toBeGreaterThan(0)
      })
    })

    describe("GET /api/journal/data/by-date", () => {
      it("should get journal data by date", async () => {
        const today = new Date().toISOString().split("T")[0]
        const response = await app.inject({
          method: "GET",
          url: `/api/journal/data/by-date?date=${today}`,
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body).toHaveProperty("cards")
        expect(body).toHaveProperty("inputs")

        // Inputs should be for the requested date
        if (body.inputs.length > 0) {
          expect(body.inputs[0].date).toBe(today)
        }
      })
    })
  })

  describe("Delete Operations", () => {
    describe("DELETE /api/journal/inputs/:id", () => {
      it("should delete an input", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/api/journal/inputs/${createdInputId}`,
        })

        expect(response.statusCode).toBe(204)

        // Verify it's deleted
        const getResponse = await app.inject({
          method: "GET",
          url: `/api/journal/inputs/${createdInputId}`,
        })
        expect(getResponse.statusCode).toBe(404)
      })
    })

    describe("DELETE /api/journal/cards/:id", () => {
      it("should delete a card and cascade delete inputs", async () => {
        // First create an input for this card
        const inputResponse = await app.inject({
          method: "POST",
          url: "/api/journal/inputs",
          payload: {
            cardId: createdCardId,
            value: "Test input for deletion",
          },
        })
        const inputId = JSON.parse(inputResponse.body).id

        // Delete the card
        const response = await app.inject({
          method: "DELETE",
          url: `/api/journal/cards/${createdCardId}`,
        })

        expect(response.statusCode).toBe(204)

        // Verify card is deleted
        const getCardResponse = await app.inject({
          method: "GET",
          url: `/api/journal/cards/${createdCardId}`,
        })
        expect(getCardResponse.statusCode).toBe(404)

        // Verify input is also deleted (cascade)
        const getInputResponse = await app.inject({
          method: "GET",
          url: `/api/journal/inputs/${inputId}`,
        })
        expect(getInputResponse.statusCode).toBe(404)
      })
    })
  })
})