import { Entry, Attachment } from "../entities/entry.entity"

export interface CreateEntryData {
  content: string
  type?: string
  metadata?: Record<string, any>
}

export interface UpdateEntryData {
  content?: string
  type?: string
  metadata?: Record<string, any>
}

export interface CreateAttachmentData {
  entryId: string
  data: string
  mimeType?: string
  size?: number
}

export interface ListEntriesFilter {
  type?: string
  limit?: number
  offset?: number
  includeDeleted?: boolean
}

export interface ListAttachmentsFilter {
  entryId?: string
  limit?: number
  offset?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface EntriesRepositoryPort {
  // Entry operations
  createEntry(data: CreateEntryData): Promise<Entry>
  findEntryById(id: string): Promise<Entry | null>
  updateEntry(id: string, data: UpdateEntryData): Promise<Entry | null>
  deleteEntry(id: string): Promise<boolean>
  listEntries(filter: ListEntriesFilter): Promise<PaginatedResult<Entry>>

  // Attachment operations
  createAttachment(data: CreateAttachmentData): Promise<Attachment>
  findAttachmentById(id: string): Promise<Attachment | null>
  deleteAttachment(id: string): Promise<boolean>
  listAttachments(filter: ListAttachmentsFilter): Promise<PaginatedResult<Attachment>>
  getAttachmentsByEntryId(entryId: string): Promise<Attachment[]>

  // Bulk operations
  deleteAttachmentsByEntryId(entryId: string): Promise<number>
  countAttachmentsByEntryId(entryId: string): Promise<number>
}