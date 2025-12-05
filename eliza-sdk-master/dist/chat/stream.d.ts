import type { StreamCallbacks } from '../types/chat.js';
export interface StreamConfig {
    url: string;
    getAuthHeader: () => string | null;
    timeout?: number;
}
/**
 * SSE streaming implementation for chat messages
 */
export declare function createChatStream(config: StreamConfig, callbacks: StreamCallbacks): {
    abort: () => void;
};
/**
 * Fetch-based streaming for environments without EventSource
 */
export declare function fetchChatStream(config: StreamConfig, body: unknown, callbacks: StreamCallbacks): Promise<void>;
