import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { EntriesController } from "../../modules/features/entries/application/entries.controller"
import { mockFactories } from "../utils/test-helpers"

describe("EntriesController", () => {
  let controller: EntriesController
  let mockDb: any
  let mockRepository: any

  beforeEach(() => {
    mockDb = {}

    // Mock repository methods
    mockRepository = {
      findEntryById: jest.fn(),
      createEntry: jest.fn(),
      updateEntry: jest.fn(),
      deleteEntry: jest.fn(),
      deleteAttachmentsByEntryId: jest.fn(),
      listEntries: jest.fn(),
    }

    // Mock the repository instantiation
    jest.mock("../../modules/features/entries/extensions/entries.repository.drizzle", () => ({
      EntriesRepositoryDrizzle: jest.fn().mockImplementation(() => mockRepository),
    }))

    controller = new EntriesController(mockDb)
    // Override the repository with our mock
    ;(controller as any).repository = mockRepository
    ;(controller as any).createEntryUseCase = {
      execute: jest.fn(),
    }
    ;(controller as any).listEntriesUseCase = {
      execute: jest.fn(),
    }
  })

  describe("listEntries", () => {
    it("should return paginated entries list", async () => {
      const mockResult = {
        items: [
          { toJSON: () => ({ id: "1", content: "Entry 1", type: "text" }) },
          { toJSON: () => ({ id: "2", content: "Entry 2", type: "note" }) },
        ],
        total: 2,
        limit: 20,
        offset: 0,
      }
      ;(controller as any).listEntriesUseCase.execute.mockResolvedValue(mockResult)

      const query = { limit: 20, offset: 0 }
      const result = await controller.listEntries(query)

      expect(result.statusCode).toBe(200)
      expect(result.data.items).toHaveLength(2)
      expect(result.data.total).toBe(2)
      expect(result.data.limit).toBe(20)
      expect(result.data.offset).toBe(0)
      expect((controller as any).listEntriesUseCase.execute).toHaveBeenCalledWith(query)
    })

    it("should handle empty results", async () => {
      const mockResult = {
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      }
      ;(controller as any).listEntriesUseCase.execute.mockResolvedValue(mockResult)

      const result = await controller.listEntries({ limit: 20, offset: 0 })

      expect(result.statusCode).toBe(200)
      expect(result.data.items).toHaveLength(0)
      expect(result.data.total).toBe(0)
    })
  })

  describe("getEntryById", () => {
    it("should return entry when found", async () => {
      const mockEntry = {
        toJSON: () => ({ id: "1", content: "Test entry", type: "text" }),
      }
      mockRepository.findEntryById.mockResolvedValue(mockEntry)

      const result = await controller.getEntryById("1")

      expect(result.statusCode).toBe(200)
      expect(result.data).toEqual({ id: "1", content: "Test entry", type: "text" })
      expect(mockRepository.findEntryById).toHaveBeenCalledWith("1")
    })

    it("should return 404 when entry not found", async () => {
      mockRepository.findEntryById.mockResolvedValue(null)

      const result = await controller.getEntryById("non-existent")

      expect(result.statusCode).toBe(404)
      expect(result.error).toBe("Entry not found")
    })
  })

  describe("createEntry", () => {
    it("should create and return new entry", async () => {
      const entryData = {
        content: "New entry",
        type: "text",
        metadata: { tags: ["important"] },
      }
      const mockEntry = {
        toJSON: () => ({
          id: "new-id",
          ...entryData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }
      ;(controller as any).createEntryUseCase.execute.mockResolvedValue(mockEntry)

      const result = await controller.createEntry(entryData)

      expect(result.statusCode).toBe(201)
      expect(result.data.content).toBe(entryData.content)
      expect(result.data.type).toBe(entryData.type)
      expect(result.data.metadata).toEqual(entryData.metadata)
      expect((controller as any).createEntryUseCase.execute).toHaveBeenCalledWith(entryData)
    })
  })

  describe("updateEntry", () => {
    it("should update and return entry when found", async () => {
      const updateData = { content: "Updated content", type: "note" }
      const mockEntry = {
        toJSON: () => ({
          id: "1",
          content: "Updated content",
          type: "note",
          updatedAt: new Date(),
        }),
      }
      mockRepository.updateEntry.mockResolvedValue(mockEntry)

      const result = await controller.updateEntry("1", updateData)

      expect(result.statusCode).toBe(200)
      expect(result.data.content).toBe("Updated content")
      expect(result.data.type).toBe("note")
      expect(mockRepository.updateEntry).toHaveBeenCalledWith("1", updateData)
    })

    it("should return 404 when entry not found", async () => {
      mockRepository.updateEntry.mockResolvedValue(null)

      const result = await controller.updateEntry("non-existent", { content: "Updated" })

      expect(result.statusCode).toBe(404)
      expect(result.error).toBe("Entry not found")
    })
  })

  describe("deleteEntry", () => {
    it("should delete entry and attachments when found", async () => {
      mockRepository.deleteEntry.mockResolvedValue(true)
      mockRepository.deleteAttachmentsByEntryId.mockResolvedValue(true)

      const result = await controller.deleteEntry("1")

      expect(result.statusCode).toBe(204)
      expect(mockRepository.deleteEntry).toHaveBeenCalledWith("1")
      expect(mockRepository.deleteAttachmentsByEntryId).toHaveBeenCalledWith("1")
    })

    it("should return 404 when entry not found", async () => {
      mockRepository.deleteEntry.mockResolvedValue(false)

      const result = await controller.deleteEntry("non-existent")

      expect(result.statusCode).toBe(404)
      expect(result.error).toBe("Entry not found")
    })
  })
})