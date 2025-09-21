import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { IntelligenceUseCases } from "../../modules/features/intelligence/application/use-cases"
import { IntelligenceRepository } from "../../modules/features/intelligence/domain/ports"
import { IntelligenceService } from "../../modules/features/intelligence/business/intelligence.service"

describe("IntelligenceUseCases", () => {
  let useCases: IntelligenceUseCases
  let mockRepository: jest.Mocked<IntelligenceRepository>
  let mockService: jest.Mocked<IntelligenceService>

  beforeEach(() => {
    mockRepository = {
      createTopic: jest.fn(),
      getTopic: jest.fn(),
      getAllTopics: jest.fn(),
      deleteTopic: jest.fn(),
      createSchema: jest.fn(),
      getTopicSchema: jest.fn(),
      updateSchema: jest.fn(),
      deleteSchema: jest.fn(),
      createInput: jest.fn(),
      getTopicInputs: jest.fn(),
      updateInput: jest.fn(),
      updateInputStatus: jest.fn(),
      deleteInput: jest.fn(),
      createConversation: jest.fn(),
      getTopicConversations: jest.fn(),
      deleteConversation: jest.fn(),
      createNote: jest.fn(),
      getTopicNotes: jest.fn(),
      updateNote: jest.fn(),
      deleteNote: jest.fn(),
    }

    useCases = new IntelligenceUseCases(mockRepository)

    // Create a spy for the internal service
    mockService = jest.spyOn(
      (useCases as any).service,
      "createTopic"
    ) as unknown as jest.Mocked<IntelligenceService>
  })

  describe("Topic Use Cases", () => {
    it("should validate and create topic", async () => {
      const topicId = "test-topic-123"
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(null)
      mockRepository.createTopic.mockResolvedValue(mockTopic)

      const result = await useCases.createTopic({ id: topicId })

      expect(mockRepository.createTopic).toHaveBeenCalledWith(topicId)
      expect(result).toEqual(mockTopic)
    })

    it("should reject invalid topic ID", async () => {
      await expect(
        useCases.createTopic({ id: "" })
      ).rejects.toThrow()
    })

    it("should get all topics", async () => {
      const mockTopics = [
        { id: "topic-1", createdAt: new Date(), updatedAt: new Date() },
        { id: "topic-2", createdAt: new Date(), updatedAt: new Date() },
      ]

      mockRepository.getAllTopics.mockResolvedValue(mockTopics)

      const result = await useCases.getAllTopics()

      expect(mockRepository.getAllTopics).toHaveBeenCalled()
      expect(result).toEqual(mockTopics)
    })
  })

  describe("Schema Use Cases", () => {
    it("should validate and define schema", async () => {
      const data = {
        topicId: "test-topic",
        columnName: "email",
        columnType: "string",
        columnDescription: "User email",
      }
      const mockTopic = {
        id: data.topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockSchema = {
        id: "schema-123",
        ...data,
        columnDescription: data.columnDescription || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.createSchema.mockResolvedValue(mockSchema)

      const result = await useCases.defineSchema(data)

      expect(mockRepository.createSchema).toHaveBeenCalledWith(
        data.topicId,
        {
          columnName: data.columnName,
          columnType: data.columnType,
          columnDescription: data.columnDescription,
        }
      )
      expect(result).toEqual(mockSchema)
    })

    it("should reject invalid schema data", async () => {
      await expect(
        useCases.defineSchema({
          topicId: "",
          columnName: "field",
          columnType: "string",
        })
      ).rejects.toThrow()

      await expect(
        useCases.defineSchema({
          topicId: "topic-123",
          columnName: "",
          columnType: "string",
        })
      ).rejects.toThrow()
    })

    it("should get topic schema", async () => {
      const topicId = "test-topic"
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockSchema = [
        {
          id: "schema-1",
          topicId,
          columnName: "field1",
          columnType: "string",
          columnDescription: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.getTopicSchema.mockResolvedValue(mockSchema)

      const result = await useCases.getTopicSchema(topicId)

      expect(mockRepository.getTopicSchema).toHaveBeenCalledWith(topicId)
      expect(result).toEqual(mockSchema)
    })
  })

  describe("Input Use Cases", () => {
    it("should validate and add input", async () => {
      const data = {
        topicId: "test-topic",
        data: { field1: "value1", field2: 123 },
        status: "active" as const,
      }
      const mockTopic = {
        id: data.topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockInput = {
        id: "input-123",
        topicId: data.topicId,
        status: data.status,
        data: data.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.getTopicSchema.mockResolvedValue([])
      mockRepository.createInput.mockResolvedValue(mockInput)

      const result = await useCases.addInput(data)

      expect(mockRepository.createInput).toHaveBeenCalledWith(
        data.topicId,
        data.data,
        data.status
      )
      expect(result).toEqual(mockInput)
    })

    it("should reject invalid input data", async () => {
      await expect(
        useCases.addInput({
          topicId: "",
          data: { field: "value" },
        })
      ).rejects.toThrow()
    })

    it("should validate and update input status", async () => {
      const data = {
        id: "input-123",
        status: "archived" as const,
      }
      const mockUpdatedInput = {
        id: data.id,
        topicId: "topic-123",
        status: data.status,
        data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.updateInputStatus.mockResolvedValue(mockUpdatedInput)

      const result = await useCases.updateInputStatus(data)

      expect(mockRepository.updateInputStatus).toHaveBeenCalledWith(
        data.id,
        data.status
      )
      expect(result).toEqual(mockUpdatedInput)
    })

    it("should reject invalid status", async () => {
      await expect(
        useCases.updateInputStatus({
          id: "input-123",
          status: "invalid" as any,
        })
      ).rejects.toThrow()
    })

    it("should get topic inputs with optional status filter", async () => {
      const topicId = "test-topic"
      const status = "active" as const
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockInputs = [
        {
          id: "input-1",
          topicId,
          status,
          data: { field: "value" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.getTopicInputs.mockResolvedValue(mockInputs)

      const result = await useCases.getTopicInputs(topicId, status)

      expect(mockRepository.getTopicInputs).toHaveBeenCalledWith(topicId, status)
      expect(result).toEqual(mockInputs)
    })
  })

  describe("Conversation Use Cases", () => {
    it("should validate and link conversation", async () => {
      const data = {
        topicId: "test-topic",
        conversationId: "conv-123",
        provider: "openai" as const,
      }
      const mockTopic = {
        id: data.topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockConversation = {
        id: "conversation-123",
        topicId: data.topicId,
        conversationProvider: data.provider,
        conversationId: data.conversationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.createConversation.mockResolvedValue(mockConversation)

      const result = await useCases.linkConversation(data)

      expect(mockRepository.createConversation).toHaveBeenCalledWith(
        data.topicId,
        data.conversationId,
        data.provider
      )
      expect(result).toEqual(mockConversation)
    })

    it("should reject invalid conversation data", async () => {
      await expect(
        useCases.linkConversation({
          topicId: "",
          conversationId: "conv-123",
        })
      ).rejects.toThrow()

      await expect(
        useCases.linkConversation({
          topicId: "topic-123",
          conversationId: "",
        })
      ).rejects.toThrow()
    })

    it("should get topic conversations", async () => {
      const topicId = "test-topic"
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockConversations = [
        {
          id: "conv-1",
          topicId,
          conversationProvider: "openai" as const,
          conversationId: "openai-123",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.getTopicConversations.mockResolvedValue(mockConversations)

      const result = await useCases.getTopicConversations(topicId)

      expect(mockRepository.getTopicConversations).toHaveBeenCalledWith(topicId)
      expect(result).toEqual(mockConversations)
    })
  })

  describe("Note Use Cases", () => {
    it("should validate and add note", async () => {
      const data = {
        topicId: "test-topic",
        note: "Important information",
      }
      const mockTopic = {
        id: data.topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockNote = {
        id: "note-123",
        topicId: data.topicId,
        note: data.note,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.createNote.mockResolvedValue(mockNote)

      const result = await useCases.addNote(data)

      expect(mockRepository.createNote).toHaveBeenCalledWith(
        data.topicId,
        data.note
      )
      expect(result).toEqual(mockNote)
    })

    it("should reject invalid note data", async () => {
      await expect(
        useCases.addNote({
          topicId: "",
          note: "text",
        })
      ).rejects.toThrow()

      await expect(
        useCases.addNote({
          topicId: "topic-123",
          note: "",
        })
      ).rejects.toThrow()
    })

    it("should validate and update note", async () => {
      const data = {
        id: "note-123",
        note: "Updated information",
      }
      const mockUpdatedNote = {
        id: data.id,
        topicId: "topic-123",
        note: data.note,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.updateNote.mockResolvedValue(mockUpdatedNote)

      const result = await useCases.updateNote(data)

      expect(mockRepository.updateNote).toHaveBeenCalledWith(
        data.id,
        data.note
      )
      expect(result).toEqual(mockUpdatedNote)
    })

    it("should delete note", async () => {
      const noteId = "note-123"

      mockRepository.deleteNote.mockResolvedValue(true)

      const result = await useCases.deleteNote(noteId)

      expect(mockRepository.deleteNote).toHaveBeenCalledWith(noteId)
      expect(result).toBe(true)
    })

    it("should get topic notes", async () => {
      const topicId = "test-topic"
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockNotes = [
        {
          id: "note-1",
          topicId,
          note: "Note 1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "note-2",
          topicId,
          note: "Note 2",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.getTopicNotes.mockResolvedValue(mockNotes)

      const result = await useCases.getTopicNotes(topicId)

      expect(mockRepository.getTopicNotes).toHaveBeenCalledWith(topicId)
      expect(result).toEqual(mockNotes)
    })
  })
})