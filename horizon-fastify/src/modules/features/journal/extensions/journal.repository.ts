import { eq } from "drizzle-orm"
import { NodePgDatabase } from "drizzle-orm/node-postgres"
import {
  JournalCard,
  JournalCardInput,
  CreateJournalCardDto,
  UpdateJournalCardDto,
  CreateJournalCardInputDto,
  UpdateJournalCardInputDto,
} from "../domain/entities"
import { JournalRepository } from "../domain/ports"
import { journalCard, journalCardInput } from "./schema"
import * as schema from "./schema"

type Database = NodePgDatabase<typeof schema>

export class DrizzleJournalRepository implements JournalRepository {
  constructor(private db: Database) {}
  // Journal Card operations
  async createCard(dto: CreateJournalCardDto): Promise<JournalCard> {
    const [card] = await this.db
      .insert(journalCard)
      .values({
        category: dto.category,
        type: dto.type,
        name: dto.name,
        order: dto.order ?? 0,
      })
      .returning()

    return {
      id: card.id,
      category: card.category,
      type: card.type,
      name: card.name,
      order: card.order,
    }
  }

  async getCardById(id: string): Promise<JournalCard | null> {
    const card = await this.db
      .select()
      .from(journalCard)
      .where(eq(journalCard.id, id))
      .limit(1)

    if (!card[0]) return null

    return {
      id: card[0].id,
      category: card[0].category,
      type: card[0].type,
      name: card[0].name,
      order: card[0].order,
    }
  }

  async getAllCards(): Promise<JournalCard[]> {
    const cards = await this.db
      .select()
      .from(journalCard)
      .orderBy(journalCard.order)

    return cards.map(card => ({
      id: card.id,
      category: card.category,
      type: card.type,
      name: card.name,
      order: card.order,
    }))
  }

  async updateCard(id: string, dto: UpdateJournalCardDto): Promise<JournalCard> {
    const [card] = await this.db
      .update(journalCard)
      .set({
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.order !== undefined && { order: dto.order }),
        updatedAt: new Date(),
      })
      .where(eq(journalCard.id, id))
      .returning()

    return {
      id: card.id,
      category: card.category,
      type: card.type,
      name: card.name,
      order: card.order,
    }
  }

  async deleteCard(id: string): Promise<void> {
    await this.db
      .delete(journalCard)
      .where(eq(journalCard.id, id))
  }

  // Journal Card Input operations
  async createCardInput(dto: CreateJournalCardInputDto): Promise<JournalCardInput> {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const defaultDate = `${year}-${month}-${day}`

    const [input] = await this.db
      .insert(journalCardInput)
      .values({
        cardId: dto.cardId,
        order: dto.order ?? 0,
        value: dto.value,
        status: dto.status ?? "active",
        date: defaultDate,
      })
      .returning()

    return {
      id: input.id,
      date: input.date,
      status: input.status as "active" | "archived" | "deleted",
      cardId: input.cardId,
      order: input.order,
      value: input.value,
    }
  }

  async getCardInputById(id: string): Promise<JournalCardInput | null> {
    const input = await this.db
      .select()
      .from(journalCardInput)
      .where(eq(journalCardInput.id, id))
      .limit(1)

    if (!input[0]) return null

    return {
      id: input[0].id,
      date: input[0].date,
      status: input[0].status as "active" | "archived" | "deleted",
      cardId: input[0].cardId,
      order: input[0].order,
      value: input[0].value,
    }
  }

  async getCardInputsByCardId(cardId: string): Promise<JournalCardInput[]> {
    const inputs = await this.db
      .select()
      .from(journalCardInput)
      .where(eq(journalCardInput.cardId, cardId))
      .orderBy(journalCardInput.order)

    return inputs.map(input => ({
      id: input.id,
      date: input.date,
      status: input.status as "active" | "archived" | "deleted",
      cardId: input.cardId,
      order: input.order,
      value: input.value,
    }))
  }

  async getCardInputsByDate(date: string): Promise<JournalCardInput[]> {
    const inputs = await this.db
      .select()
      .from(journalCardInput)
      .where(eq(journalCardInput.date, date))
      .orderBy(journalCardInput.order)

    return inputs.map(input => ({
      id: input.id,
      date: input.date,
      status: input.status as "active" | "archived" | "deleted",
      cardId: input.cardId,
      order: input.order,
      value: input.value,
    }))
  }

  async updateCardInput(id: string, dto: UpdateJournalCardInputDto): Promise<JournalCardInput> {
    const [input] = await this.db
      .update(journalCardInput)
      .set({
        ...(dto.date !== undefined && { date: dto.date }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.value !== undefined && { value: dto.value }),
        updatedAt: new Date(),
      })
      .where(eq(journalCardInput.id, id))
      .returning()

    return {
      id: input.id,
      date: input.date,
      status: input.status as "active" | "archived" | "deleted",
      cardId: input.cardId,
      order: input.order,
      value: input.value,
    }
  }

  async deleteCardInput(id: string): Promise<void> {
    await this.db
      .delete(journalCardInput)
      .where(eq(journalCardInput.id, id))
  }
}