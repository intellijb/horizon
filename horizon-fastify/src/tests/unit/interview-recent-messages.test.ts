import { describe, it, expect, beforeEach, vi } from "vitest"
import { InterviewController } from "@modules/features/interview/application/interview.controller"
import { TokenService } from "@modules/features/auth/business/token.service"

describe("InterviewController - Recent Messages", () => {
  let controller: InterviewController
  let mockDb: any
  let mockTokenService: TokenService

  beforeEach(() => {
    // Mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    }

    // Create controller instance
    controller = new InterviewController(mockDb)

    // Mock token service
    mockTokenService = controller["tokenService"]
    vi.spyOn(mockTokenService, "verifyAccessToken").mockReturnValue({
      userId: "test-user-id",
      email: "test@example.com",
    } as any)
  })

  describe("getSession", () => {
    it("should return session with recent messages when conversation exists", async () => {
      const sessionId = "session-123"
      const token = "valid-token"

      // Mock session data
      const mockSession = {
        id: sessionId,
        userId: "test-user-id",
        conversationId: "conversation-123",
        title: "Test Interview",
        status: "active",
        progress: 50,
        score: 75,
        topicIds: ["topic-1", "topic-2"],
        interviewerId: "interviewer-123",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      }

      // Mock recent messages
      const mockMessages = [
        {
          id: "msg-1",
          conversationId: "conversation-123",
          status: "completed",
          output: {
            type: "message",
            role: "user",
            content: "Tell me about your experience with microservices",
          },
          createdAt: "2024-01-01T00:01:00Z",
        },
        {
          id: "msg-2",
          conversationId: "conversation-123",
          status: "completed",
          output: {
            type: "message",
            role: "assistant",
            content: [
              {
                text: "I'd be happy to discuss my experience with microservices...",
              },
            ],
          },
          createdAt: "2024-01-01T00:02:00Z",
        },
      ]

      // Mock sessionService.getSession
      vi.spyOn(controller["sessionService"], "getSession").mockResolvedValue(mockSession)

      // Mock interviewUseCase.getRecentMessages
      vi.spyOn(controller["interviewUseCase"], "getRecentMessages").mockResolvedValue(mockMessages)

      // Call the method
      const result = await controller.getSession(sessionId, token)

      // Assertions
      expect(result.statusCode).toBe(200)
      expect(result.data).toBeDefined()
      expect(result.data.id).toBe(sessionId)
      expect(result.data.recentMessages).toEqual(mockMessages)
      expect(controller["interviewUseCase"].getRecentMessages).toHaveBeenCalledWith("conversation-123", 10)
    })

    it("should return session without recent messages when no conversation exists", async () => {
      const sessionId = "session-456"
      const token = "valid-token"

      // Mock session data without conversationId
      const mockSession = {
        id: sessionId,
        userId: "test-user-id",
        conversationId: undefined,
        title: "Test Interview",
        status: "draft",
        progress: 0,
        score: 0,
        topicIds: ["topic-1"],
        interviewerId: "interviewer-123",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      }

      // Mock sessionService.getSession
      vi.spyOn(controller["sessionService"], "getSession").mockResolvedValue(mockSession)

      // Call the method
      const result = await controller.getSession(sessionId, token)

      // Assertions
      expect(result.statusCode).toBe(200)
      expect(result.data).toBeDefined()
      expect(result.data.id).toBe(sessionId)
      expect(result.data.recentMessages).toBeUndefined()
      expect(controller["interviewUseCase"].getRecentMessages).not.toHaveBeenCalled()
    })

    it("should still return session even if fetching messages fails", async () => {
      const sessionId = "session-789"
      const token = "valid-token"

      // Mock session data
      const mockSession = {
        id: sessionId,
        userId: "test-user-id",
        conversationId: "conversation-789",
        title: "Test Interview",
        status: "active",
        progress: 25,
        score: 50,
        topicIds: ["topic-1"],
        interviewerId: "interviewer-123",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      }

      // Mock sessionService.getSession
      vi.spyOn(controller["sessionService"], "getSession").mockResolvedValue(mockSession)

      // Mock interviewUseCase.getRecentMessages to throw error
      vi.spyOn(controller["interviewUseCase"], "getRecentMessages").mockRejectedValue(
        new Error("Failed to fetch messages")
      )

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      // Call the method
      const result = await controller.getSession(sessionId, token)

      // Assertions
      expect(result.statusCode).toBe(200)
      expect(result.data).toBeDefined()
      expect(result.data.id).toBe(sessionId)
      expect(result.data.recentMessages).toBeUndefined()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load recent messages:",
        expect.any(Error)
      )

      // Cleanup
      consoleErrorSpy.mockRestore()
    })

    it("should return 404 if session not found", async () => {
      const sessionId = "non-existent"
      const token = "valid-token"

      // Mock sessionService.getSession to return null
      vi.spyOn(controller["sessionService"], "getSession").mockResolvedValue(null)

      // Call the method
      const result = await controller.getSession(sessionId, token)

      // Assertions
      expect(result.statusCode).toBe(404)
      expect(result.error).toBe("Session not found")
    })

    it("should return 403 if user doesn't own the session", async () => {
      const sessionId = "session-other-user"
      const token = "valid-token"

      // Mock session data with different userId
      const mockSession = {
        id: sessionId,
        userId: "different-user-id",
        conversationId: "conversation-123",
        title: "Someone else's interview",
        status: "active",
        progress: 50,
        score: 75,
        topicIds: ["topic-1"],
        interviewerId: "interviewer-123",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      }

      // Mock sessionService.getSession
      vi.spyOn(controller["sessionService"], "getSession").mockResolvedValue(mockSession)

      // Call the method
      const result = await controller.getSession(sessionId, token)

      // Assertions
      expect(result.statusCode).toBe(403)
      expect(result.error).toBe("Forbidden")
      expect(controller["interviewUseCase"].getRecentMessages).not.toHaveBeenCalled()
    })
  })

  describe("InterviewUseCase.getRecentMessages", () => {
    it("should return recent messages sorted chronologically", async () => {
      const conversationId = "conversation-123"

      // Mock messages in random order
      const mockMessages = [
        {
          id: "msg-3",
          conversationId,
          status: "completed",
          output: { type: "message", role: "assistant", content: "Message 3" },
          createdAt: "2024-01-01T00:03:00Z",
        },
        {
          id: "msg-1",
          conversationId,
          status: "completed",
          output: { type: "message", role: "user", content: "Message 1" },
          createdAt: "2024-01-01T00:01:00Z",
        },
        {
          id: "msg-5",
          conversationId,
          status: "completed",
          output: { type: "message", role: "user", content: "Message 5" },
          createdAt: "2024-01-01T00:05:00Z",
        },
        {
          id: "msg-2",
          conversationId,
          status: "completed",
          output: { type: "message", role: "assistant", content: "Message 2" },
          createdAt: "2024-01-01T00:02:00Z",
        },
        {
          id: "msg-4",
          conversationId,
          status: "completed",
          output: { type: "message", role: "assistant", content: "Message 4" },
          createdAt: "2024-01-01T00:04:00Z",
        },
      ]

      // Mock conversationService.getMessages
      vi.spyOn(controller["interviewUseCase"]["conversationService"], "getMessages")
        .mockResolvedValue(mockMessages)

      // Call the method with limit of 3
      const result = await controller["interviewUseCase"].getRecentMessages(conversationId, 3)

      // Assertions - should return 3 most recent messages in chronological order
      expect(result).toHaveLength(3)
      expect(result[0].id).toBe("msg-3") // Third newest (oldest in the recent 3)
      expect(result[1].id).toBe("msg-4") // Second newest
      expect(result[2].id).toBe("msg-5") // Newest
    })
  })
})