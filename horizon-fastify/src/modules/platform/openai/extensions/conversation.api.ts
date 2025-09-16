import OpenAI from "openai"
import {
  MessageType,
  MessageRole,
  ConversationItem,
  CreateConversationParams,
  CreateResponseParams
} from "../domain"
import {
  DEFAULTS,
  ERROR_MESSAGES
} from "../constants"


export class OpenAIConversationService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI();
  }

  async create(params: CreateConversationParams) {
    try {
      const conversation = await this.client.conversations.create({
        metadata: params.metadata || {},
        items: params.items as any || [],
      });
      return conversation;
    } catch (error) {
      throw new Error(ERROR_MESSAGES.CREATE_CONVERSATION_FAILED(error))
    }
  }

  async retrieve(conversationId: string) {
    try {
      const conversation = await this.client.conversations.retrieve(
        conversationId
      );
      return conversation;
    } catch (error) {
      throw new Error(ERROR_MESSAGES.RETRIEVE_CONVERSATION_FAILED(error))
    }
  }

  async delete(conversationId: string) {
    try {
      const result = await this.client.conversations.delete(conversationId);
      return result;
    } catch (error) {
      throw new Error(ERROR_MESSAGES.DELETE_CONVERSATION_FAILED(error))
    }
  }

  async createResponse(params: CreateResponseParams) {
    try {
      const requestBody: any = {
        conversation: params.conversation,
        input: params.input,
        model: params.model || DEFAULTS.MODEL,
        max_output_tokens: params.max_output_tokens,
        stream: params.stream,
      };

      // Only add temperature if explicitly provided and not default
      // Some models don't support temperature
      if (params.temperature !== undefined && params.temperature !== null) {
        // Skip temperature for now as the model doesn't support it
        // requestBody.temperature = params.temperature;
      }

      const response = await this.client.responses.create(requestBody);
      return response;
    } catch (error) {
      throw new Error(ERROR_MESSAGES.CREATE_RESPONSE_FAILED(error))
    }
  }
}
