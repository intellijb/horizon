import { CreateAttachmentUseCase } from "./create-attachment.usecase"
import { EntriesRepositoryDrizzle } from "../extensions/entries.repository.drizzle"
import { EntriesError } from "../constants/error.codes"
import {
  CreateAttachmentBody,
  AttachmentParams,
  ListAttachmentsQuery,
} from "./entries.types"

export class AttachmentsController {
  private repository: EntriesRepositoryDrizzle
  private createAttachmentUseCase: CreateAttachmentUseCase

  constructor(db: any) {
    this.repository = new EntriesRepositoryDrizzle(db)
    this.createAttachmentUseCase = new CreateAttachmentUseCase(this.repository)
  }

  async listAttachments(query: ListAttachmentsQuery) {
    const result = await this.repository.listAttachments(query)

    return {
      data: {
        items: result.items.map(attachment => attachment.toJSON()),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
      statusCode: 200,
    }
  }

  async getAttachmentById(id: string) {
    const attachment = await this.repository.findAttachmentById(id)

    if (!attachment) {
      return { error: "Attachment not found", statusCode: 404 }
    }

    return {
      data: attachment.toJSON(),
      statusCode: 200,
    }
  }

  async createAttachment(data: CreateAttachmentBody) {
    const attachment = await this.createAttachmentUseCase.execute(data)

    return {
      data: attachment.toJSON(),
      statusCode: 201,
    }
  }

  async deleteAttachment(id: string) {
    const deleted = await this.repository.deleteAttachment(id)

    if (!deleted) {
      return { error: "Attachment not found", statusCode: 404 }
    }

    return { statusCode: 204 }
  }
}