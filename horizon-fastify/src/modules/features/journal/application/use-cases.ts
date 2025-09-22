import { JournalRepository } from "../domain/ports"
import {
  JournalCard,
  JournalCardInput,
  CreateJournalCardDto,
  UpdateJournalCardDto,
  CreateJournalCardInputDto,
  UpdateJournalCardInputDto,
} from "../domain/entities"

export class JournalUseCases {
  constructor(private readonly repository: JournalRepository) {}

  // Journal Card Use Cases
  async createCard(dto: CreateJournalCardDto): Promise<JournalCard> {
    return this.repository.createCard(dto)
  }

  async getCardById(id: string): Promise<JournalCard | null> {
    return this.repository.getCardById(id)
  }

  async getAllCards(): Promise<JournalCard[]> {
    return this.repository.getAllCards()
  }

  async updateCard(id: string, dto: UpdateJournalCardDto): Promise<JournalCard> {
    const card = await this.repository.getCardById(id)
    if (!card) {
      throw new Error("Journal card not found")
    }
    return this.repository.updateCard(id, dto)
  }

  async deleteCard(id: string): Promise<void> {
    const card = await this.repository.getCardById(id)
    if (!card) {
      throw new Error("Journal card not found")
    }
    return this.repository.deleteCard(id)
  }

  // Journal Card Input Use Cases
  async createCardInput(dto: CreateJournalCardInputDto): Promise<JournalCardInput> {
    const card = await this.repository.getCardById(dto.cardId)
    if (!card) {
      throw new Error("Journal card not found")
    }
    return this.repository.createCardInput(dto)
  }

  async getCardInputById(id: string): Promise<JournalCardInput | null> {
    return this.repository.getCardInputById(id)
  }

  async getCardInputsByCardId(cardId: string): Promise<JournalCardInput[]> {
    return this.repository.getCardInputsByCardId(cardId)
  }

  async getCardInputsByDate(date: string): Promise<JournalCardInput[]> {
    return this.repository.getCardInputsByDate(date)
  }

  async getTodayInputs(): Promise<JournalCardInput[]> {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const today = `${year}-${month}-${day}`

    return this.repository.getCardInputsByDate(today)
  }

  async updateCardInput(id: string, dto: UpdateJournalCardInputDto): Promise<JournalCardInput> {
    const input = await this.repository.getCardInputById(id)
    if (!input) {
      throw new Error("Journal card input not found")
    }
    return this.repository.updateCardInput(id, dto)
  }

  async deleteCardInput(id: string): Promise<void> {
    const input = await this.repository.getCardInputById(id)
    if (!input) {
      throw new Error("Journal card input not found")
    }
    return this.repository.deleteCardInput(id)
  }

  async archiveCardInput(id: string): Promise<JournalCardInput> {
    return this.updateCardInput(id, { status: "archived" })
  }

  async activateCardInput(id: string): Promise<JournalCardInput> {
    return this.updateCardInput(id, { status: "active" })
  }
}