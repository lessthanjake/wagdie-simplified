import type { HttpClient } from '../client/http.js';
import type { Conversation, ConversationDetail } from '../types/conversation.js';
import type { PaginatedResponse, PaginationParams } from '../types/index.js';
interface ConversationListParams extends PaginationParams {
}
export declare class ConversationsAPI {
    private http;
    constructor(http: HttpClient);
    /**
     * List all conversations for the authenticated user
     */
    list(params?: ConversationListParams): Promise<PaginatedResponse<Conversation>>;
    /**
     * List conversations for a specific character
     */
    listForCharacter(characterId: string, params?: ConversationListParams): Promise<PaginatedResponse<Conversation>>;
    /**
     * Get a conversation with its message history
     */
    get(id: string): Promise<ConversationDetail>;
    /**
     * Delete a conversation and all its messages
     */
    delete(id: string): Promise<void>;
    /**
     * Map API response to Conversation type
     */
    private mapConversation;
}
export {};
