import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { CreateEntryUseCase } from "../../modules/features/entries/application/create-entry.usecase"
import { EntriesRepositoryPort } from "../../modules/features/entries/domain/ports/entries-repository.port"
import { Entry } from "../../modules/features/entries/domain/entities/entry.entity"
import { EntriesConstants } from "../../modules/features/entries/constants/entries.constants"

describe("CreateEntryUseCase", () => {
  let useCase: CreateEntryUseCase
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

    useCase = new CreateEntryUseCase(mockRepository)

    // Mock the validation service
    mockValidationService = {
      validateEntryType: jest.fn(),
      sanitizeMetadata: jest.fn(),
    }
    ;(useCase as any).validationService = mockValidationService
  })

  describe("execute", () => {
    it("should create entry with provided content and type", async () => {
      const request = {
        content: "Test entry content",
        type: "note",
        metadata: { tags: ["important"] },
      }

      const mockEntry = new Entry({
        id: "entry-123",
        content: request.content,
        type: request.type,
        metadata: request.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockValidationService.validateEntryType.mockReturnValue(undefined)
      mockValidationService.sanitizeMetadata.mockReturnValue(request.metadata)
      mockRepository.createEntry.mockResolvedValue(mockEntry)

      const result = await useCase.execute(request)

      expect(mockValidationService.validateEntryType).toHaveBeenCalledWith("note")
      expect(mockValidationService.sanitizeMetadata).toHaveBeenCalledWith(request.metadata)
      expect(mockRepository.createEntry).toHaveBeenCalledWith({
        content: request.content,
        type: request.type,
        metadata: request.metadata,
      })
      expect(result).toBe(mockEntry)
    })

    it("should use default type when type is not provided", async () => {
      const request = {
        content: "Test entry without type",
      }

      const mockEntry = new Entry({
        id: "entry-123",
        content: request.content,
        type: EntriesConstants.DEFAULT_ENTRY_TYPE,
        metadata: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockValidationService.sanitizeMetadata.mockReturnValue(undefined)
      mockRepository.createEntry.mockResolvedValue(mockEntry)

      const result = await useCase.execute(request)

      expect(mockValidationService.validateEntryType).not.toHaveBeenCalled()
      expect(mockRepository.createEntry).toHaveBeenCalledWith({
        content: request.content,
        type: EntriesConstants.DEFAULT_ENTRY_TYPE,
        metadata: undefined,
      })
      expect(result).toBe(mockEntry)
    })

    it("should sanitize metadata when provided", async () => {
      const request = {
        content: "Test entry",
        metadata: { malicious: "<script>alert('xss')</script>", safe: "value" },
      }

      const sanitizedMetadata = { safe: "value" }
      mockValidationService.sanitizeMetadata.mockReturnValue(sanitizedMetadata)

      const mockEntry = new Entry({
        id: "entry-123",
        content: request.content,
        type: EntriesConstants.DEFAULT_ENTRY_TYPE,
        metadata: sanitizedMetadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockRepository.createEntry.mockResolvedValue(mockEntry)

      const result = await useCase.execute(request)

      expect(mockValidationService.sanitizeMetadata).toHaveBeenCalledWith(request.metadata)
      expect(mockRepository.createEntry).toHaveBeenCalledWith({
        content: request.content,
        type: EntriesConstants.DEFAULT_ENTRY_TYPE,
        metadata: sanitizedMetadata,
      })
    })

    it("should handle null metadata", async () => {
      const request = {
        content: "Test entry",
        metadata: null,
      }

      mockValidationService.sanitizeMetadata.mockReturnValue(null)

      const mockEntry = new Entry({
        id: "entry-123",
        content: request.content,
        type: EntriesConstants.DEFAULT_ENTRY_TYPE,
        metadata: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockRepository.createEntry.mockResolvedValue(mockEntry)

      await useCase.execute(request)

      expect(mockRepository.createEntry).toHaveBeenCalledWith({
        content: request.content,
        type: EntriesConstants.DEFAULT_ENTRY_TYPE,
        metadata: undefined,
      })
    })

    it("should validate entry type when provided", async () => {
      const request = {
        content: "Test entry",
        type: "custom-type",
      }

      const mockEntry = new Entry({
        id: "entry-123",
        content: request.content,
        type: request.type,
        metadata: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockValidationService.validateEntryType.mockReturnValue(undefined)
      mockValidationService.sanitizeMetadata.mockReturnValue(undefined)
      mockRepository.createEntry.mockResolvedValue(mockEntry)

      await useCase.execute(request)

      expect(mockValidationService.validateEntryType).toHaveBeenCalledWith("custom-type")
    })

    it("should throw error when validation fails", async () => {
      const request = {
        content: "Test entry",
        type: "invalid-type",
      }

      mockValidationService.validateEntryType.mockImplementation(() => {
        throw new Error("Invalid entry type")
      })

      await expect(useCase.execute(request)).rejects.toThrow("Invalid entry type")
    })
  })
})