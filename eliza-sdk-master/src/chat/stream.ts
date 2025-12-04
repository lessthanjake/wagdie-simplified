import type { ChatMessage, StreamCallbacks } from '../types/chat.js';
import { ElizaNetworkError } from '../errors/ElizaNetworkError.js';
import { ElizaAPIError } from '../errors/ElizaAPIError.js';

export interface StreamConfig {
  url: string;
  getAuthHeader: () => string | null;
  timeout?: number;
}

/**
 * SSE streaming implementation for chat messages
 */
export function createChatStream(
  config: StreamConfig,
  callbacks: StreamCallbacks
): { abort: () => void } {
  const { url, getAuthHeader, timeout = 60000 } = config;

  let aborted = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let eventSource: EventSource | null = null;

  const abort = () => {
    aborted = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (eventSource) {
      eventSource.close();
    }
  };

  // Set timeout
  timeoutId = setTimeout(() => {
    abort();
    callbacks.onError(new ElizaNetworkError('Stream timed out'));
  }, timeout);

  try {
    // Build URL with auth if needed
    const streamUrl = new URL(url);
    const authHeader = getAuthHeader();

    // EventSource doesn't support custom headers, so we need to use query params or cookies
    // For API keys, we'll use a query parameter
    if (authHeader?.startsWith('Bearer elk_')) {
      streamUrl.searchParams.set('apiKey', authHeader.replace('Bearer ', ''));
    }

    eventSource = new EventSource(streamUrl.toString(), {
      withCredentials: true, // For cookie-based auth
    });

    let fullContent = '';
    let messageId = '';
    let conversationId = '';

    eventSource.onopen = () => {
      if (aborted) return;
      // Clear timeout on successful connection, set new one for message timeout
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        abort();
        callbacks.onError(new ElizaNetworkError('Stream message timed out'));
      }, timeout);
    };

    eventSource.onmessage = (event) => {
      if (aborted) return;

      try {
        const data = JSON.parse(event.data);

        // Handle different event types
        if (data.type === 'token' || data.token) {
          const token = data.token || data.content || '';
          fullContent += token;
          callbacks.onChunk(token);
        } else if (data.type === 'complete' || data.done) {
          // Stream complete
          messageId = data.messageId || data.id || messageId;
          conversationId = data.conversationId || conversationId;

          if (timeoutId) clearTimeout(timeoutId);

          const message: ChatMessage = {
            id: messageId,
            role: 'assistant',
            content: fullContent,
            createdAt: new Date().toISOString(),
          };

          callbacks.onComplete(message, conversationId);
          eventSource?.close();
        } else if (data.type === 'error' || data.error) {
          throw new ElizaAPIError(data.message || data.error || 'Stream error', 500);
        } else if (data.conversationId) {
          // Metadata update
          conversationId = data.conversationId;
          if (data.messageId) messageId = data.messageId;
        }
      } catch (parseError) {
        // If it's just text content, treat it as a token
        if (typeof event.data === 'string' && !event.data.startsWith('{')) {
          fullContent += event.data;
          callbacks.onChunk(event.data);
        } else if (parseError instanceof ElizaAPIError) {
          callbacks.onError(parseError);
          abort();
        }
      }
    };

    eventSource.onerror = (error) => {
      if (aborted) return;
      abort();

      // EventSource error doesn't have much info
      callbacks.onError(
        new ElizaNetworkError('Stream connection error', error as unknown as Error)
      );
    };
  } catch (error) {
    abort();
    callbacks.onError(
      error instanceof Error
        ? new ElizaNetworkError('Failed to create stream', error)
        : new ElizaNetworkError('Failed to create stream')
    );
  }

  return { abort };
}

/**
 * Fetch-based streaming for environments without EventSource
 */
export async function fetchChatStream(
  config: StreamConfig,
  body: unknown,
  callbacks: StreamCallbacks
): Promise<void> {
  const { url, getAuthHeader, timeout = 60000 } = config;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };

    const authHeader = getAuthHeader();
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw ElizaAPIError.fromResponse(response.status);
    }

    if (!response.body) {
      throw new ElizaNetworkError('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let messageId = '';
    let conversationId = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.token || parsed.content) {
              const token = parsed.token || parsed.content;
              fullContent += token;
              callbacks.onChunk(token);
            }

            if (parsed.conversationId) conversationId = parsed.conversationId;
            if (parsed.messageId || parsed.id) messageId = parsed.messageId || parsed.id;

            if (parsed.done || parsed.type === 'complete') {
              const message: ChatMessage = {
                id: messageId,
                role: 'assistant',
                content: fullContent,
                createdAt: new Date().toISOString(),
              };
              callbacks.onComplete(message, conversationId);
            }
          } catch {
            // Non-JSON data, treat as token
            if (data.trim()) {
              fullContent += data;
              callbacks.onChunk(data);
            }
          }
        }
      }
    }

    // If we haven't completed yet, send completion
    if (fullContent && !messageId) {
      const message: ChatMessage = {
        id: crypto.randomUUID?.() || Date.now().toString(),
        role: 'assistant',
        content: fullContent,
        createdAt: new Date().toISOString(),
      };
      callbacks.onComplete(message, conversationId);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      callbacks.onError(new ElizaNetworkError('Stream timed out'));
    } else if (error instanceof ElizaAPIError) {
      callbacks.onError(error);
    } else {
      callbacks.onError(
        new ElizaNetworkError(
          'Stream failed',
          error instanceof Error ? error : undefined
        )
      );
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
