import type { HttpClient } from '../client/http.js';
import type { ChatResponse, StreamCallbacks } from '../types/chat.js';
import { fetchChatStream } from './stream.js';

/**
 * Input for sending a chat message
 */
export interface ChatMessageInput {
  characterId: string;
  message: string;
  conversationId?: string;
}

export class ChatAPI {
  constructor(private http: HttpClient, private getAuthHeader: () => string | null) {}

  /**
   * Send a message and get the complete response
   */
  async sendMessage(input: ChatMessageInput): Promise<ChatResponse> {
    const { characterId, message, conversationId } = input;
    const endpoint = conversationId
      ? `/characters/${characterId}/chat/${conversationId}`
      : `/characters/${characterId}/chat`;

    return this.http.post<ChatResponse>(endpoint, { message });
  }

  /**
   * Send a message and stream the response
   */
  async sendMessageStream(
    input: ChatMessageInput,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const { characterId, message, conversationId } = input;
    const baseUrl = (this.http as unknown as { baseUrl: string }).baseUrl || '';
    const endpoint = conversationId
      ? `/characters/${characterId}/chat/${conversationId}/stream`
      : `/characters/${characterId}/chat/stream`;

    const url = `${baseUrl}${endpoint}`;

    await fetchChatStream(
      {
        url,
        getAuthHeader: this.getAuthHeader,
        timeout: 60000,
      },
      { message },
      callbacks
    );
  }
}
