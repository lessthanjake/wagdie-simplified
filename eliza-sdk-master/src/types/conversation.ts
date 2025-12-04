/**
 * Conversation Types
 */

import type { ChatMessage } from './chat.js';

export interface Conversation {
  id: string;
  characterId: string;
  characterName: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface ConversationDetail extends Conversation {
  messages: ConversationMessage[];
}

/**
 * A message within a conversation (alias for ChatMessage with id)
 */
export interface ConversationMessage extends ChatMessage {
  id: string;
}
