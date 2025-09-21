import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { IntelligenceService } from "../../modules/features/intelligence/business/intelligence.service"
import { IntelligenceRepository } from "../../modules/features/intelligence/domain/ports"
import { IntelligenceErrors, INTELLIGENCE_CONSTANTS } from "../../modules/features/intelligence/constants"

describe("IntelligenceService", () => {
  let service: IntelligenceService
  let mockRepository: jest.Mocked<IntelligenceRepository>

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

    service = new IntelligenceService(mockRepository)
  })

  describe("Topic Management", () => {
    it("should create a new topic", async () => {
      const topicId = "test-topic-123"
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(null)
      mockRepository.createTopic.mockResolvedValue(mockTopic)

      const result = await service.createTopic(topicId)

      expect(mockRepository.getTopic).toHaveBeenCalledWith(topicId)
      expect(mockRepository.createTopic).toHaveBeenCalledWith(topicId)
      expect(result).toEqual(mockTopic)
    })

    it("should throw error when creating duplicate topic", async () => {
      const topicId = "existing-topic"
      const existingTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(existingTopic)

      await expect(service.createTopic(topicId)).rejects.toThrow(
        IntelligenceErrors.TOPIC_ALREADY_EXISTS
      )
      expect(mockRepository.createTopic).not.toHaveBeenCalled()
    })

    it("should get topic with relations", async () => {
      const topicId = "test-topic"
      const mockTopicWithRelations = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
        schema: [],
        inputs: [],
        conversations: [],
        notes: [],
      }

      mockRepository.getTopic.mockResolvedValue(mockTopicWithRelations)

      const result = await service.getTopic(topicId)

      expect(mockRepository.getTopic).toHaveBeenCalledWith(topicId)
      expect(result).toEqual(mockTopicWithRelations)
    })

    it("should throw error when topic not found", async () => {
      mockRepository.getTopic.mockResolvedValue(null)

      await expect(service.getTopic("non-existent")).rejects.toThrow(
        IntelligenceErrors.TOPIC_NOT_FOUND
      )
    })

    it("should delete topic", async () => {
      const topicId = "test-topic"
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.deleteTopic.mockResolvedValue(true)

      const result = await service.deleteTopic(topicId)

      expect(mockRepository.getTopic).toHaveBeenCalledWith(topicId)
      expect(mockRepository.deleteTopic).toHaveBeenCalledWith(topicId)
      expect(result).toBe(true)
    })
  })

  describe("Schema Management", () => {
    it("should define schema for topic", async () => {
      const topicId = "test-topic"
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockSchema = {
        id: "schema-123",
        topicId,
        columnName: "email",
        columnType: "string",
        columnDescription: "User email",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.createSchema.mockResolvedValue(mockSchema)

      const result = await service.defineSchema(
        topicId,
        "email",
        "string",
        "User email"
      )

      expect(mockRepository.getTopic).toHaveBeenCalledWith(topicId)
      expect(mockRepository.createSchema).toHaveBeenCalledWith(topicId, {
        columnName: "email",
        columnType: "string",
        columnDescription: "User email",
      })
      expect(result).toEqual(mockSchema)
    })

    it("should throw error when defining schema for non-existent topic", async () => {
      mockRepository.getTopic.mockResolvedValue(null)

      await expect(
        service.defineSchema("non-existent", "field", "type")
      ).rejects.toThrow(IntelligenceErrors.TOPIC_NOT_FOUND)
    })

    it("should update schema", async () => {
      const schemaId = "schema-123"
      const updates = { columnType: "number", columnDescription: "Updated" }
      const mockUpdatedSchema = {
        id: schemaId,
        topicId: "topic-123",
        columnName: "field",
        columnType: "number",
        columnDescription: "Updated",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.updateSchema.mockResolvedValue(mockUpdatedSchema)

      const result = await service.updateSchema(schemaId, updates)

      expect(mockRepository.updateSchema).toHaveBeenCalledWith(schemaId, updates)
      expect(result).toEqual(mockUpdatedSchema)
    })

    it("should throw error when updating non-existent schema", async () => {
      mockRepository.updateSchema.mockResolvedValue(null)

      await expect(
        service.updateSchema("non-existent", { columnType: "string" })
      ).rejects.toThrow(IntelligenceErrors.SCHEMA_NOT_FOUND)
    })
  })

  describe("Input Management", () => {
    it("should add input without schema validation", async () => {
      const topicId = "test-topic"
      const data = { field1: "value1", field2: "value2" }
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockInput = {
        id: "input-123",
        topicId,
        status: "active" as const,
        data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.getTopicSchema.mockResolvedValue([])
      mockRepository.createInput.mockResolvedValue(mockInput)

      const result = await service.addInput(topicId, data)

      expect(mockRepository.getTopic).toHaveBeenCalledWith(topicId)
      expect(mockRepository.getTopicSchema).toHaveBeenCalledWith(topicId)
      expect(mockRepository.createInput).toHaveBeenCalledWith(
        topicId,
        data,
        INTELLIGENCE_CONSTANTS.DEFAULT_STATUS
      )
      expect(result).toEqual(mockInput)
    })

    it("should validate input against schema", async () => {
      const topicId = "test-topic"
      const data = { email: "test@example.com" }
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockSchema = [
        {
          id: "schema-1",
          topicId,
          columnName: "email",
          columnType: "string",
          columnDescription: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "schema-2",
          topicId,
          columnName: "name",
          columnType: "string",
          columnDescription: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.getTopicSchema.mockResolvedValue(mockSchema)

      await expect(service.addInput(topicId, data)).rejects.toThrow(
        `${IntelligenceErrors.INPUT_VALIDATION_FAILED}: Missing fields: name`
      )
    })

    it("should update input status", async () => {
      const inputId = "input-123"
      const newStatus = "archived" as const
      const mockUpdatedInput = {
        id: inputId,
        topicId: "topic-123",
        status: newStatus,
        data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.updateInputStatus.mockResolvedValue(mockUpdatedInput)

      const result = await service.updateInputStatus(inputId, newStatus)

      expect(mockRepository.updateInputStatus).toHaveBeenCalledWith(inputId, newStatus)
      expect(result).toEqual(mockUpdatedInput)
    })

    it("should throw error for invalid status", async () => {
      await expect(
        service.updateInputStatus("input-123", "invalid" as any)
      ).rejects.toThrow(IntelligenceErrors.INVALID_STATUS)
    })
  })

  describe("Conversation Management", () => {
    it("should link conversation to topic", async () => {
      const topicId = "test-topic"
      const conversationId = "conv-123"
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockConversation = {
        id: "conversation-123",
        topicId,
        conversationProvider: "openai" as const,
        conversationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.createConversation.mockResolvedValue(mockConversation)

      const result = await service.linkConversation(topicId, conversationId)

      expect(mockRepository.getTopic).toHaveBeenCalledWith(topicId)
      expect(mockRepository.createConversation).toHaveBeenCalledWith(
        topicId,
        conversationId,
        INTELLIGENCE_CONSTANTS.DEFAULT_PROVIDER
      )
      expect(result).toEqual(mockConversation)
    })

    it("should throw error for invalid provider", async () => {
      const topicId = "test-topic"
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(mockTopic)

      await expect(
        service.linkConversation(topicId, "conv-123", "invalid" as any)
      ).rejects.toThrow(IntelligenceErrors.INVALID_PROVIDER)
    })
  })

  describe("Note Management", () => {
    it("should add note to topic", async () => {
      const topicId = "test-topic"
      const noteText = "Important note"
      const mockTopic = {
        id: topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockNote = {
        id: "note-123",
        topicId,
        note: noteText,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getTopic.mockResolvedValue(mockTopic)
      mockRepository.createNote.mockResolvedValue(mockNote)

      const result = await service.addNote(topicId, noteText)

      expect(mockRepository.getTopic).toHaveBeenCalledWith(topicId)
      expect(mockRepository.createNote).toHaveBeenCalledWith(topicId, noteText)
      expect(result).toEqual(mockNote)
    })

    it("should update note", async () => {
      const noteId = "note-123"
      const updatedText = "Updated note"
      const mockUpdatedNote = {
        id: noteId,
        topicId: "topic-123",
        note: updatedText,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.updateNote.mockResolvedValue(mockUpdatedNote)

      const result = await service.updateNote(noteId, updatedText)

      expect(mockRepository.updateNote).toHaveBeenCalledWith(noteId, updatedText)
      expect(result).toEqual(mockUpdatedNote)
    })

    it("should throw error when updating non-existent note", async () => {
      mockRepository.updateNote.mockResolvedValue(null)

      await expect(
        service.updateNote("non-existent", "text")
      ).rejects.toThrow(IntelligenceErrors.NOTE_NOT_FOUND)
    })

    it("should delete note", async () => {
      const noteId = "note-123"

      mockRepository.deleteNote.mockResolvedValue(true)

      const result = await service.deleteNote(noteId)

      expect(mockRepository.deleteNote).toHaveBeenCalledWith(noteId)
      expect(result).toBe(true)
    })

    it("should throw error when deleting non-existent note", async () => {
      mockRepository.deleteNote.mockResolvedValue(false)

      await expect(service.deleteNote("non-existent")).rejects.toThrow(
        IntelligenceErrors.NOTE_NOT_FOUND
      )
    })
  })
})