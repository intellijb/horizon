export interface JournalCard {
  id: string
  category: string
  type: string
  name: string
  order: number
}

export interface JournalCardInput {
  id: string
  date: string
  status: "active" | "archived" | "deleted"
  cardId: string
  order: number
  value: string
}

export interface CreateJournalCardDto {
  category: string
  type: string
  name: string
  order?: number
}

export interface UpdateJournalCardDto {
  category?: string
  type?: string
  name?: string
  order?: number
}

export interface CreateJournalCardInputDto {
  cardId: string
  order?: number
  value: string
  status?: "active" | "archived" | "deleted"
}

export interface UpdateJournalCardInputDto {
  date?: string
  status?: "active" | "archived" | "deleted"
  order?: number
  value?: string
}