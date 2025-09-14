import { EntryType } from "../../constants/entries.constants"

export interface EntryEntity {
  id: string
  content: string
  type: EntryType | string
  metadata?: Record<string, any> | null
  attachments?: AttachmentEntity[]
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export interface AttachmentEntity {
  id: string
  entryId: string
  data: string
  mimeType?: string | null
  size?: number | null
  createdAt: Date
}

export class Entry implements EntryEntity {
  constructor(
    public id: string,
    public content: string,
    public type: EntryType | string,
    public metadata: Record<string, any> | null,
    public createdAt: Date,
    public updatedAt: Date,
    public deletedAt: Date | null = null,
    public attachments: AttachmentEntity[] = []
  ) {}

  static create(data: EntryEntity): Entry {
    return new Entry(
      data.id,
      data.content,
      data.type,
      data.metadata || null,
      data.createdAt,
      data.updatedAt,
      data.deletedAt || null,
      data.attachments || []
    )
  }

  isDeleted(): boolean {
    return this.deletedAt !== null
  }

  hasAttachments(): boolean {
    return this.attachments.length > 0
  }

  getAttachmentCount(): number {
    return this.attachments.length
  }

  toJSON() {
    return {
      id: this.id,
      content: this.content,
      type: this.type,
      metadata: this.metadata,
      attachments: this.attachments,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      deletedAt: this.deletedAt?.toISOString() || null,
    }
  }
}

export class Attachment implements AttachmentEntity {
  constructor(
    public id: string,
    public entryId: string,
    public data: string,
    public mimeType: string | null,
    public size: number | null,
    public createdAt: Date
  ) {}

  static create(data: AttachmentEntity): Attachment {
    return new Attachment(
      data.id,
      data.entryId,
      data.data,
      data.mimeType || null,
      data.size || null,
      data.createdAt
    )
  }

  toJSON() {
    return {
      id: this.id,
      entryId: this.entryId,
      data: this.data,
      mimeType: this.mimeType,
      size: this.size,
      createdAt: this.createdAt.toISOString(),
    }
  }
}