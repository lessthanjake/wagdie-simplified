import type { HttpClient } from '../client/http.js';
import type { Conversation, ConversationDetail } from '../types/conversation.js';
import type { PaginatedResponse, PaginationParams } from '../types/index.js';

interface ConversationListParams extends PaginationParams {
  // Future: add filters
}

export class ConversationsAPI {
  constructor(private http: HttpClient) {}

  /**
   * List all conversations for the authenticated user
   */
  async list(params: ConversationListParams = {}): Promise<PaginatedResponse<Conversation>> {
    const { page = 1, pageSize = 20 } = params;

    const response = await this.http.get<{
      conversations: Array<{
        id: string;
        characterId: string;
        userId?: string;
        messageCount?: number;
        createdAt: string;
        updatedAt: string;
      }>;
      total: number;
    }>(`/conversations?page=${page}&pageSize=${pageSize}`);

    return {
      items: response.conversations.map((conv) => this.mapConversation(conv)),
      total: response.total,
      page,
      pageSize,
      hasMore: page * pageSize < response.total,
    };
  }

  /**
   * List conversations for a specific character
   */
  async listForCharacter(
    characterId: string,
    params: ConversationListParams = {}
  ): Promise<PaginatedResponse<Conversation>> {
    const { page = 1, pageSize = 20 } = params;

    const response = await this.http.get<{
      conversations: Array<{
        id: string;
        characterId: string;
        userId?: string;
        messageCount?: number;
        createdAt: string;
        updatedAt: string;
      }>;
      total: number;
    }>(`/characters/${characterId}/conversations?page=${page}&pageSize=${pageSize}`);

    return {
      items: response.conversations.map((conv) => this.mapConversation(conv)),
      total: response.total,
      page,
      pageSize,
      hasMore: page * pageSize < response.total,
    };
  }

  /**
   * Get a conversation with its message history
   */
  async get(id: string): Promise<ConversationDetail> {
    const response = await this.http.get<{
      id: string;
      characterId: string;
      userId: string;
      messages: Array<{
        id: string;
        role: 'user' | 'assistant';
        content: string;
        createdAt: string;
      }>;
      createdAt: string;
      updatedAt: string;
    }>(`/conversations/${id}`);

    return {
      id: response.id,
      characterId: response.characterId,
      characterName: '', // May not be available from this endpoint
      messageCount: response.messages.length,
      lastMessageAt: response.updatedAt,
      createdAt: response.createdAt,
      messages: response.messages,
    };
  }

  /**
   * Delete a conversation and all its messages
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/conversations/${id}`);
  }

  /**
   * Map API response to Conversation type
   */
  private mapConversation(conv: {
    id: string;
    characterId: string;
    userId?: string;
    messageCount?: number;
    createdAt: string;
    updatedAt: string;
  }): Conversation {
    return {
      id: conv.id,
      characterId: conv.characterId,
      characterName: '', // May need to be fetched separately
      messageCount: conv.messageCount ?? 0,
      lastMessageAt: conv.updatedAt,
      createdAt: conv.createdAt,
    };
  }
}
