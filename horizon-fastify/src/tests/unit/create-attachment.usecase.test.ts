import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { CreateAttachmentUseCase } from "../../modules/features/entries/application/create-attachment.usecase"
import { EntriesRepositoryPort } from "../../modules/features/entries/domain/ports/entries-repository.port"
import { Entry, Attachment } from "../../modules/features/entries/domain/entities/entry.entity"
import { EntriesError, EntriesErrorCodes } from "../../modules/features/entries/constants/error.codes"

describe("CreateAttachmentUseCase", () => {
  let useCase: CreateAttachmentUseCase
  let mockRepository: jest.Mocked<EntriesRepositoryPort>
  let mockValidationService: any

  beforeEach(() => {
    mockRepository = {
      createEntry: jest.fn(),
      findEntryById: jest.fn(),
      updateEntry: jest.fn(),
      deleteEntry: jest.fn(),
      listEntries: jest.fn(),
      deleteAttachmentsByEntryId: jest.fn(),
      createAttachment: jest.fn(),
      findAttachmentById: jest.fn(),
      deleteAttachment: jest.fn(),
      listAttachments: jest.fn(),
      countAttachmentsByEntryId: jest.fn(),
    }

    useCase = new CreateAttachmentUseCase(mockRepository)

    mockValidationService = {
      validateMimeType: jest.fn(),
      validateAttachmentSize: jest.fn(),
      validateAttachmentCount: jest.fn(),
    }
    ;(useCase as any).validationService = mockValidationService
  })

  describe("execute", () => {
    const mockEntry = new Entry({
      id: "entry-123",
      content: "Test entry",
      type: "text",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    it("should create attachment for existing entry", async () => {
      const request = {
        entryId: "entry-123",
        data: "base64-attachment-data",
        mimeType: "text/plain",
      }

      const mockAttachment = new Attachment({
        id: "attachment-456",
        entryId: request.entryId,
        data: request.data,
        mimeType: request.mimeType,
        size: 21, // Buffer.byteLength("base64-attachment-data", "base64")
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockRepository.findEntryById.mockResolvedValue(mockEntry)
      mockRepository.countAttachmentsByEntryId.mockResolvedValue(2)
      mockValidationService.validateMimeType.mockReturnValue(undefined)
      mockValidationService.validateAttachmentSize.mockReturnValue(undefined)
      mockValidationService.validateAttachmentCount.mockReturnValue(undefined)
      mockRepository.createAttachment.mockResolvedValue(mockAttachment)

      // Mock isDeleted method
      jest.spyOn(mockEntry, 'isDeleted').mockReturnValue(false)

      const result = await useCase.execute(request)

      expect(mockRepository.findEntryById).toHaveBeenCalledWith("entry-123")
      expect(mockValidationService.validateMimeType).toHaveBeenCalledWith("text/plain")
      expect(mockValidationService.validateAttachmentSize).toHaveBeenCalledWith(21)
      expect(mockRepository.countAttachmentsByEntryId).toHaveBeenCalledWith("entry-123")
      expect(mockValidationService.validateAttachmentCount).toHaveBeenCalledWith(2)
      expect(mockRepository.createAttachment).toHaveBeenCalledWith({
        entryId: request.entryId,
        data: request.data,
        mimeType: request.mimeType,
        size: 21,
      })
      expect(result).toBe(mockAttachment)
    })

    it("should create attachment without mimeType", async () => {
      const request = {
        entryId: "entry-123",
        data: "base64-data",
      }

      const mockAttachment = new Attachment({
        id: "attachment-456",
        entryId: request.entryId,
        data: request.data,
        mimeType: undefined,
        size: 11,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockRepository.findEntryById.mockResolvedValue(mockEntry)
      mockRepository.countAttachmentsByEntryId.mockResolvedValue(1)
      mockValidationService.validateAttachmentSize.mockReturnValue(undefined)
      mockValidationService.validateAttachmentCount.mockReturnValue(undefined)
      mockRepository.createAttachment.mockResolvedValue(mockAttachment)

      jest.spyOn(mockEntry, 'isDeleted').mockReturnValue(false)

      const result = await useCase.execute(request)

      expect(mockValidationService.validateMimeType).not.toHaveBeenCalled()
      expect(mockRepository.createAttachment).toHaveBeenCalledWith({
        entryId: request.entryId,
        data: request.data,
        mimeType: undefined,
        size: 11,
      })
      expect(result).toBe(mockAttachment)
    })

    it("should throw error when entry not found", async () => {
      const request = {
        entryId: "non-existent-entry",
        data: "base64-data",
      }

      mockRepository.findEntryById.mockResolvedValue(null)

      await expect(useCase.execute(request)).rejects.toThrow(
        new EntriesError(
          EntriesErrorCodes.ENTRY_NOT_FOUND,
          "Entry with id non-existent-entry not found",
          404
        )
      )
    })

    it("should throw error when entry is deleted", async () => {
      const request = {
        entryId: "deleted-entry",
        data: "base64-data",
      }

      const deletedEntry = new Entry({
        id: "deleted-entry",
        content: "Deleted entry",
        type: "text",
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockRepository.findEntryById.mockResolvedValue(deletedEntry)
      jest.spyOn(deletedEntry, 'isDeleted').mockReturnValue(true)

      await expect(useCase.execute(request)).rejects.toThrow(
        new EntriesError(
          EntriesErrorCodes.ENTRY_ALREADY_DELETED,
          "Cannot add attachment to deleted entry",
          400
        )
      )
    })

    it("should validate mime type when provided", async () => {
      const request = {
        entryId: "entry-123",
        data: "base64-data",
        mimeType: "application/json",
      }

      mockRepository.findEntryById.mockResolvedValue(mockEntry)
      mockRepository.countAttachmentsByEntryId.mockResolvedValue(0)
      mockValidationService.validateMimeType.mockImplementation(() => {
        throw new Error("Invalid mime type")
      })

      jest.spyOn(mockEntry, 'isDeleted').mockReturnValue(false)

      await expect(useCase.execute(request)).rejects.toThrow("Invalid mime type")
      expect(mockValidationService.validateMimeType).toHaveBeenCalledWith("application/json")
    })

    it("should validate attachment size", async () => {
      const request = {
        entryId: "entry-123",
        data: "very-large-base64-data",
      }

      mockRepository.findEntryById.mockResolvedValue(mockEntry)
      mockRepository.countAttachmentsByEntryId.mockResolvedValue(1)
      mockValidationService.validateAttachmentSize.mockImplementation(() => {
        throw new Error("Attachment too large")
      })

      jest.spyOn(mockEntry, 'isDeleted').mockReturnValue(false)

      await expect(useCase.execute(request)).rejects.toThrow("Attachment too large")
      expect(mockValidationService.validateAttachmentSize).toHaveBeenCalledWith(22)
    })

    it("should validate attachment count limit", async () => {
      const request = {
        entryId: "entry-123",
        data: "base64-data",
      }

      mockRepository.findEntryById.mockResolvedValue(mockEntry)
      mockRepository.countAttachmentsByEntryId.mockResolvedValue(10) // Max limit reached
      mockValidationService.validateAttachmentSize.mockReturnValue(undefined)
      mockValidationService.validateAttachmentCount.mockImplementation(() => {
        throw new Error("Too many attachments")
      })

      jest.spyOn(mockEntry, 'isDeleted').mockReturnValue(false)

      await expect(useCase.execute(request)).rejects.toThrow("Too many attachments")
      expect(mockValidationService.validateAttachmentCount).toHaveBeenCalledWith(10)
    })

    it("should calculate attachment size correctly", async () => {
      const request = {
        entryId: "entry-123",
        data: "SGVsbG8gV29ybGQ=", // "Hello World" in base64
      }

      const mockAttachment = new Attachment({
        id: "attachment-456",
        entryId: request.entryId,
        data: request.data,
        mimeType: undefined,
        size: 11, // "Hello World" is 11 bytes
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockRepository.findEntryById.mockResolvedValue(mockEntry)
      mockRepository.countAttachmentsByEntryId.mockResolvedValue(0)
      mockValidationService.validateAttachmentSize.mockReturnValue(undefined)
      mockValidationService.validateAttachmentCount.mockReturnValue(undefined)
      mockRepository.createAttachment.mockResolvedValue(mockAttachment)

      jest.spyOn(mockEntry, 'isDeleted').mockReturnValue(false)

      await useCase.execute(request)

      expect(mockValidationService.validateAttachmentSize).toHaveBeenCalledWith(11)
      expect(mockRepository.createAttachment).toHaveBeenCalledWith({
        entryId: request.entryId,
        data: request.data,
        mimeType: undefined,
        size: 11,
      })
    })
  })
})