export interface IntelligenceTopic {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface IntelligenceTopicSchema {
  id: string
  topicId: string
  columnName: string
  columnType: string
  columnDescription: string | null
  createdAt: Date
  updatedAt: Date
}

export interface IntelligenceTopicInput {
  id: string
  topicId: string
  status: "active" | "archived" | "deleted"
  data: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface IntelligenceTopicConversation {
  id: string
  topicId: string
  conversationProvider: "openai"
  conversationId: string
  createdAt: Date
  updatedAt: Date
}

export interface IntelligenceTopicNote {
  id: string
  topicId: string
  note: string
  createdAt: Date
  updatedAt: Date
}

export interface TopicWithRelations extends IntelligenceTopic {
  schema?: IntelligenceTopicSchema[]
  inputs?: IntelligenceTopicInput[]
  conversations?: IntelligenceTopicConversation[]
  notes?: IntelligenceTopicNote[]
}