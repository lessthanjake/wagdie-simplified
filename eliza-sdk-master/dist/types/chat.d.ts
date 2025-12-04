/**
 * Chat Types
 */
import type { ElizaError } from '../errors/index.js';
export interface SendMessageInput {
    /** The message content */
    message: string;
    /** Optional conversation ID to continue */
    conversationId?: string;
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}
export interface ChatResponse {
    message: ChatMessage;
    conversationId: string;
}
/** Callback for streaming responses */
export type StreamCallback = (chunk: string) => void;
/** Callback for stream completion */
export type StreamCompleteCallback = (message: ChatMessage, conversationId: string) => void;
/** Callback for stream errors */
export type StreamErrorCallback = (error: ElizaError) => void;
export interface StreamCallbacks {
    onChunk: StreamCallback;
    onComplete: StreamCompleteCallback;
    onError: StreamErrorCallback;
}
