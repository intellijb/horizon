import { describe, test, expect, beforeAll, afterAll } from "@jest/globals"
import { FastifyInstance } from "fastify"
import { buildApp } from "../../app"

describe("Interview API with Expired Token", () => {
  let app: FastifyInstance

  // This token expired at 2025-09-15T17:32:59.000Z
  const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MjkyNDRmMy1jZjAxLTQyNjktYTVjYS0yM2U1ZGM2ZDYyN2UiLCJlbWFpbCI6ImludGVsbGlqYkBnbWFpbC5jb20iLCJyb2xlIjoidXNlciIsImRldmljZUlkIjoiNWY5YzFkODctZjcwYi00YmI4LTk2MmItODA3ZWE5ZmU1ZDZlIiwic2Vzc2lvbklkIjoiOWRjODk1MmUtODU1NC00ZTEwLTk5MjgtNzI3OGY1ZDlhZmViIiwianRpIjoiYjRjNzkwODYtY2U4NC00NjE4LWFlZTItMWJiZjU5OGJhODAxIiwiaWF0IjoxNzU3OTU2Njc5LCJleHAiOjE3NTc5NTc1Nzl9.MEsW4dMIRN9LGGvprGP55TCEXp-KXbuLnjuMAc1NLtM"

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  test("should reject expired token when creating interview", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/interviews",
      headers: {
        authorization: `Bearer ${expiredToken}`,
      },
      payload: {
        topicIds: ["550e8400-e29b-41d4-a716-446655440001"],
        title: "Test Interview",
        language: "en",
        difficulty: 3,
      },
    })

    // Should get 401 for expired token
    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.error).toContain("expired")
  })

  test("should reject expired token when answering interview", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/interviews/550e8400-e29b-41d4-a716-446655440001/answer",
      headers: {
        authorization: `Bearer ${expiredToken}`,
      },
      payload: {
        message: "Test answer",
      },
    })

    // Should get 401 for expired token
    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.error).toContain("expired")
  })

  test("demonstrates the token is expired", () => {
    // Decode the JWT payload
    const payload = JSON.parse(
      Buffer.from(expiredToken.split('.')[1], 'base64').toString()
    )

    const expirationTime = new Date(payload.exp * 1000)
    const currentTime = new Date()

    // Confirm the token is expired
    expect(currentTime > expirationTime).toBe(true)
    console.log(`Token expired at: ${expirationTime.toISOString()}`)
    console.log(`Current time: ${currentTime.toISOString()}`)
  })
})