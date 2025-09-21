import type {
  IntelligenceTopic,
  IntelligenceTopicSchema,
  IntelligenceTopicInput,
  IntelligenceTopicConversation,
  IntelligenceTopicNote,
  TopicWithRelations,
} from "./entities"

export interface IntelligenceRepository {
  // Topics
  createTopic(id: string): Promise<IntelligenceTopic>
  getTopic(id: string): Promise<TopicWithRelations | null>
  getAllTopics(): Promise<IntelligenceTopic[]>
  deleteTopic(id: string): Promise<boolean>

  // Schema
  createSchema(topicId: string, schema: Omit<IntelligenceTopicSchema, "id" | "topicId" | "createdAt" | "updatedAt">): Promise<IntelligenceTopicSchema>
  getTopicSchema(topicId: string): Promise<IntelligenceTopicSchema[]>
  updateSchema(id: string, updates: Partial<Omit<IntelligenceTopicSchema, "id" | "topicId" | "createdAt" | "updatedAt">>): Promise<IntelligenceTopicSchema | null>
  deleteSchema(id: string): Promise<boolean>

  // Inputs
  createInput(topicId: string, data: Record<string, any>, status?: "active" | "archived" | "deleted"): Promise<IntelligenceTopicInput>
  getTopicInputs(topicId: string, status?: "active" | "archived" | "deleted"): Promise<IntelligenceTopicInput[]>
  updateInput(id: string, data: Record<string, any>): Promise<IntelligenceTopicInput | null>
  updateInputStatus(id: string, status: "active" | "archived" | "deleted"): Promise<IntelligenceTopicInput | null>
  deleteInput(id: string): Promise<boolean>

  // Conversations
  createConversation(topicId: string, conversationId: string, provider?: "openai"): Promise<IntelligenceTopicConversation>
  getTopicConversations(topicId: string): Promise<IntelligenceTopicConversation[]>
  deleteConversation(id: string): Promise<boolean>

  // Notes
  createNote(topicId: string, note: string): Promise<IntelligenceTopicNote>
  getTopicNotes(topicId: string): Promise<IntelligenceTopicNote[]>
  updateNote(id: string, note: string): Promise<IntelligenceTopicNote | null>
  deleteNote(id: string): Promise<boolean>
}