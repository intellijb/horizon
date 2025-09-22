import { JournalUseCases } from "../application/use-cases"
import { DrizzleJournalRepository } from "../extensions/journal.repository"
import {
  JournalCard,
  JournalCardInput,
  CreateJournalCardDto,
  UpdateJournalCardDto,
  CreateJournalCardInputDto,
  UpdateJournalCardInputDto,
} from "../domain/entities"

export class JournalService {
  private useCases: JournalUseCases

  constructor(db: any) {
    const repository = new DrizzleJournalRepository(db)
    this.useCases = new JournalUseCases(repository)
  }

  // Journal Card Methods
  async createCard(dto: CreateJournalCardDto): Promise<JournalCard> {
    return this.useCases.createCard(dto)
  }

  async getCard(id: string): Promise<JournalCard | null> {
    return this.useCases.getCardById(id)
  }

  async getAllCards(): Promise<JournalCard[]> {
    return this.useCases.getAllCards()
  }

  async updateCard(id: string, dto: UpdateJournalCardDto): Promise<JournalCard> {
    return this.useCases.updateCard(id, dto)
  }

  async deleteCard(id: string): Promise<void> {
    return this.useCases.deleteCard(id)
  }

  // Journal Card Input Methods
  async createCardInput(dto: CreateJournalCardInputDto): Promise<JournalCardInput> {
    return this.useCases.createCardInput(dto)
  }

  async getCardInput(id: string): Promise<JournalCardInput | null> {
    return this.useCases.getCardInputById(id)
  }

  async getInputsByCard(cardId: string): Promise<JournalCardInput[]> {
    return this.useCases.getCardInputsByCardId(cardId)
  }

  async getInputsByDate(date: string): Promise<JournalCardInput[]> {
    return this.useCases.getCardInputsByDate(date)
  }

  async getTodayInputs(): Promise<JournalCardInput[]> {
    return this.useCases.getTodayInputs()
  }

  async updateCardInput(id: string, dto: UpdateJournalCardInputDto): Promise<JournalCardInput> {
    return this.useCases.updateCardInput(id, dto)
  }

  async deleteCardInput(id: string): Promise<void> {
    return this.useCases.deleteCardInput(id)
  }

  async archiveCardInput(id: string): Promise<JournalCardInput> {
    return this.useCases.archiveCardInput(id)
  }

  async activateCardInput(id: string): Promise<JournalCardInput> {
    return this.useCases.activateCardInput(id)
  }

  // Batch operations
  async getJournalDataForDate(date: string): Promise<{
    cards: JournalCard[]
    inputs: JournalCardInput[]
  }> {
    const [cards, inputs] = await Promise.all([
      this.useCases.getAllCards(),
      this.useCases.getCardInputsByDate(date),
    ])

    return { cards, inputs }
  }

  async getTodayJournalData(): Promise<{
    cards: JournalCard[]
    inputs: JournalCardInput[]
  }> {
    const [cards, inputs] = await Promise.all([
      this.useCases.getAllCards(),
      this.useCases.getTodayInputs(),
    ])

    return { cards, inputs }
  }
}