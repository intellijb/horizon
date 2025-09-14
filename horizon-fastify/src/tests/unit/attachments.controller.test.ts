import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { AttachmentsController } from "../../modules/features/entries/application/attachments.controller"

describe("AttachmentsController", () => {
  let controller: AttachmentsController
  let mockDb: any
  let mockRepository: any

  beforeEach(() => {
    mockDb = {}

    // Mock repository methods
    mockRepository = {
      findAttachmentById: jest.fn(),
      createAttachment: jest.fn(),
      deleteAttachment: jest.fn(),
      listAttachments: jest.fn(),
    }

    // Mock the repository instantiation
    jest.mock("../../modules/features/entries/extensions/entries.repository.drizzle", () => ({
      EntriesRepositoryDrizzle: jest.fn().mockImplementation(() => mockRepository),
    }))

    controller = new AttachmentsController(mockDb)
    // Override the repository with our mock
    ;(controller as any).repository = mockRepository
    ;(controller as any).createAttachmentUseCase = {
      execute: jest.fn(),
    }
  })

  describe("listAttachments", () => {
    it("should return paginated attachments list", async () => {
      const mockResult = {
        items: [
          {
            toJSON: () => ({
              id: "1",
              entryId: "entry-1",
              data: "attachment-data-1",
              mimeType: "text/plain",
            }),
          },
          {
            toJSON: () => ({
              id: "2",
              entryId: "entry-1",
              data: "attachment-data-2",
              mimeType: "image/png",
            }),
          },
        ],
        total: 2,
        limit: 20,
        offset: 0,
      }
      mockRepository.listAttachments.mockResolvedValue(mockResult)

      const query = { limit: 20, offset: 0, entryId: "entry-1" }
      const result = await controller.listAttachments(query)

      expect(result.statusCode).toBe(200)
      expect(result.data.items).toHaveLength(2)
      expect(result.data.total).toBe(2)
      expect(result.data.limit).toBe(20)
      expect(result.data.offset).toBe(0)
      expect(mockRepository.listAttachments).toHaveBeenCalledWith(query)
    })

    it("should handle empty results", async () => {
      const mockResult = {
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      }
      mockRepository.listAttachments.mockResolvedValue(mockResult)

      const result = await controller.listAttachments({ limit: 20, offset: 0 })

      expect(result.statusCode).toBe(200)
      expect(result.data.items).toHaveLength(0)
      expect(result.data.total).toBe(0)
    })
  })

  describe("getAttachmentById", () => {
    it("should return attachment when found", async () => {
      const mockAttachment = {
        toJSON: () => ({
          id: "1",
          entryId: "entry-1",
          data: "base64-data",
          mimeType: "application/json",
        }),
      }
      mockRepository.findAttachmentById.mockResolvedValue(mockAttachment)

      const result = await controller.getAttachmentById("1")

      expect(result.statusCode).toBe(200)
      expect(result.data).toEqual({
        id: "1",
        entryId: "entry-1",
        data: "base64-data",
        mimeType: "application/json",
      })
      expect(mockRepository.findAttachmentById).toHaveBeenCalledWith("1")
    })

    it("should return 404 when attachment not found", async () => {
      mockRepository.findAttachmentById.mockResolvedValue(null)

      const result = await controller.getAttachmentById("non-existent")

      expect(result.statusCode).toBe(404)
      expect(result.error).toBe("Attachment not found")
    })
  })

  describe("createAttachment", () => {
    it("should create and return new attachment", async () => {
      const attachmentData = {
        entryId: "entry-1",
        data: "base64-attachment-data",
        mimeType: "text/plain",
      }
      const mockAttachment = {
        toJSON: () => ({
          id: "new-attachment-id",
          ...attachmentData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }
      ;(controller as any).createAttachmentUseCase.execute.mockResolvedValue(mockAttachment)

      const result = await controller.createAttachment(attachmentData)

      expect(result.statusCode).toBe(201)
      expect(result.data.entryId).toBe(attachmentData.entryId)
      expect(result.data.data).toBe(attachmentData.data)
      expect(result.data.mimeType).toBe(attachmentData.mimeType)
      expect((controller as any).createAttachmentUseCase.execute).toHaveBeenCalledWith(
        attachmentData
      )
    })

    it("should create attachment without mimeType", async () => {
      const attachmentData = {
        entryId: "entry-1",
        data: "base64-attachment-data",
      }
      const mockAttachment = {
        toJSON: () => ({
          id: "new-attachment-id",
          entryId: attachmentData.entryId,
          data: attachmentData.data,
          mimeType: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }
      ;(controller as any).createAttachmentUseCase.execute.mockResolvedValue(mockAttachment)

      const result = await controller.createAttachment(attachmentData)

      expect(result.statusCode).toBe(201)
      expect(result.data.mimeType).toBeNull()
    })
  })

  describe("deleteAttachment", () => {
    it("should delete attachment when found", async () => {
      mockRepository.deleteAttachment.mockResolvedValue(true)

      const result = await controller.deleteAttachment("1")

      expect(result.statusCode).toBe(204)
      expect(mockRepository.deleteAttachment).toHaveBeenCalledWith("1")
    })

    it("should return 404 when attachment not found", async () => {
      mockRepository.deleteAttachment.mockResolvedValue(false)

      const result = await controller.deleteAttachment("non-existent")

      expect(result.statusCode).toBe(404)
      expect(result.error).toBe("Attachment not found")
    })
  })
})