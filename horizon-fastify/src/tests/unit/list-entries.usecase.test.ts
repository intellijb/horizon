import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { ListEntriesUseCase } from "../../modules/features/entries/application/list-entries.usecase"
import { EntriesRepositoryPort } from "../../modules/features/entries/domain/ports/entries-repository.port"
import { Entry } from "../../modules/features/entries/domain/entities/entry.entity"
import { EntriesConstants } from "../../modules/features/entries/constants/entries.constants"

describe("ListEntriesUseCase", () => {
  let useCase: ListEntriesUseCase
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

    useCase = new ListEntriesUseCase(mockRepository)

    mockValidationService = {
      validatePagination: jest.fn(),
      validateEntryType: jest.fn(),
    }
    ;(useCase as any).validationService = mockValidationService
  })

  describe("execute", () => {
    it("should list entries with default parameters", async () => {
      const mockEntries = [
        new Entry({
          id: "1",
          content: "Entry 1",
          type: "text",
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        new Entry({
          id: "2",
          content: "Entry 2",
          type: "note",
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ]

      const mockResult = {
        items: mockEntries,
        total: 2,
        limit: EntriesConstants.DEFAULT_LIMIT,
        offset: 0,
      }

      mockValidationService.validatePagination.mockReturnValue(undefined)
      mockRepository.listEntries.mockResolvedValue(mockResult)

      const result = await useCase.execute({})

      expect(mockValidationService.validatePagination).toHaveBeenCalledWith(
        EntriesConstants.DEFAULT_LIMIT,
        0
      )
      expect(mockRepository.listEntries).toHaveBeenCalledWith({
        type: undefined,
        limit: EntriesConstants.DEFAULT_LIMIT,
        offset: 0,
        includeDeleted: false,
      })
      expect(result).toBe(mockResult)
    })

    it("should list entries with custom pagination", async () => {
      const request = {
        limit: 10,
        offset: 5,
      }

      const mockResult = {
        items: [],
        total: 0,
        limit: 10,
        offset: 5,
      }

      mockValidationService.validatePagination.mockReturnValue(undefined)
      mockRepository.listEntries.mockResolvedValue(mockResult)

      const result = await useCase.execute(request)

      expect(mockValidationService.validatePagination).toHaveBeenCalledWith(10, 5)
      expect(mockRepository.listEntries).toHaveBeenCalledWith({
        type: undefined,
        limit: 10,
        offset: 5,
        includeDeleted: false,
      })
      expect(result).toBe(mockResult)
    })

    it("should filter by entry type", async () => {
      const request = {
        type: "note",
        limit: 20,
        offset: 0,
      }

      const mockResult = {
        items: [
          new Entry({
            id: "1",
            content: "Note entry",
            type: "note",
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ],
        total: 1,
        limit: 20,
        offset: 0,
      }

      mockValidationService.validatePagination.mockReturnValue(undefined)
      mockValidationService.validateEntryType.mockReturnValue(undefined)
      mockRepository.listEntries.mockResolvedValue(mockResult)

      const result = await useCase.execute(request)

      expect(mockValidationService.validateEntryType).toHaveBeenCalledWith("note")
      expect(mockRepository.listEntries).toHaveBeenCalledWith({
        type: "note",
        limit: 20,
        offset: 0,
        includeDeleted: false,
      })
      expect(result).toBe(mockResult)
    })

    it("should not validate entry type when not provided", async () => {
      const request = {
        limit: 15,
        offset: 10,
      }

      mockValidationService.validatePagination.mockReturnValue(undefined)
      mockRepository.listEntries.mockResolvedValue({
        items: [],
        total: 0,
        limit: 15,
        offset: 10,
      })

      await useCase.execute(request)

      expect(mockValidationService.validateEntryType).not.toHaveBeenCalled()
    })

    it("should handle empty results", async () => {
      const mockResult = {
        items: [],
        total: 0,
        limit: EntriesConstants.DEFAULT_LIMIT,
        offset: 0,
      }

      mockValidationService.validatePagination.mockReturnValue(undefined)
      mockRepository.listEntries.mockResolvedValue(mockResult)

      const result = await useCase.execute({})

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })

    it("should throw error when pagination validation fails", async () => {
      const request = {
        limit: -1,
        offset: 0,
      }

      mockValidationService.validatePagination.mockImplementation(() => {
        throw new Error("Invalid pagination parameters")
      })

      await expect(useCase.execute(request)).rejects.toThrow("Invalid pagination parameters")
    })

    it("should throw error when entry type validation fails", async () => {
      const request = {
        type: "invalid-type",
      }

      mockValidationService.validateEntryType.mockImplementation(() => {
        throw new Error("Invalid entry type")
      })

      await expect(useCase.execute(request)).rejects.toThrow("Invalid entry type")
    })

    it("should always exclude deleted entries", async () => {
      const request = {
        type: "text",
        limit: 25,
        offset: 5,
      }

      mockValidationService.validatePagination.mockReturnValue(undefined)
      mockValidationService.validateEntryType.mockReturnValue(undefined)
      mockRepository.listEntries.mockResolvedValue({
        items: [],
        total: 0,
        limit: 25,
        offset: 5,
      })

      await useCase.execute(request)

      expect(mockRepository.listEntries).toHaveBeenCalledWith({
        type: "text",
        limit: 25,
        offset: 5,
        includeDeleted: false,
      })
    })
  })
})