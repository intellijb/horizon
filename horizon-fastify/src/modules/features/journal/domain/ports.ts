import {
  JournalCard,
  JournalCardInput,
  CreateJournalCardDto,
  UpdateJournalCardDto,
  CreateJournalCardInputDto,
  UpdateJournalCardInputDto,
} from "./entities"

export interface JournalRepository {
  // Journal Card operations
  createCard(dto: CreateJournalCardDto): Promise<JournalCard>
  getCardById(id: string): Promise<JournalCard | null>
  getAllCards(): Promise<JournalCard[]>
  updateCard(id: string, dto: UpdateJournalCardDto): Promise<JournalCard>
  deleteCard(id: string): Promise<void>

  // Journal Card Input operations
  createCardInput(dto: CreateJournalCardInputDto): Promise<JournalCardInput>
  getCardInputById(id: string): Promise<JournalCardInput | null>
  getCardInputsByCardId(cardId: string): Promise<JournalCardInput[]>
  getCardInputsByDate(date: string): Promise<JournalCardInput[]>
  updateCardInput(id: string, dto: UpdateJournalCardInputDto): Promise<JournalCardInput>
  deleteCardInput(id: string): Promise<void>
}