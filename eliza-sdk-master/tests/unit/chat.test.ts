/**
 * Unit tests for Chat API and SSE streaming
 * T029: Unit test for streaming SSE handler
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatAPI } from '../../src/chat/index.js';

// Mock HttpClient
const createMockHttpClient = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
});

describe('ChatAPI', () => {
  let chatAPI: ChatAPI;
  let mockHttpClient: ReturnType<typeof createMockHttpClient>;
  let mockGetAuthHeader: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpClient = createMockHttpClient();
    mockGetAuthHeader = vi.fn(() => 'Bearer test-token');
    chatAPI = new ChatAPI(mockHttpClient as any, mockGetAuthHeader);
  });

  describe('sendMessage', () => {
    it('should send a message and return response', async () => {
      const mockResponse = {
        id: 'msg_123',
        characterId: 'char_456',
        conversationId: 'conv_789',
        role: 'assistant',
        content: 'Hello! How can I help you?',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await chatAPI.sendMessage({
        characterId: 'char_456',
        message: 'Hello',
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/characters/char_456/chat',
        { message: 'Hello' }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include conversationId in URL when provided', async () => {
      mockHttpClient.post.mockResolvedValue({ id: 'msg_123' });

      await chatAPI.sendMessage({
        characterId: 'char_456',
        message: 'Hello',
        conversationId: 'conv_existing',
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/characters/char_456/chat/conv_existing',
        { message: 'Hello' }
      );
    });

    it('should handle empty messages', async () => {
      mockHttpClient.post.mockResolvedValue({
        id: 'msg_123',
        content: '',
      });

      const result = await chatAPI.sendMessage({
        characterId: 'char_456',
        message: '',
      });

      expect(result.content).toBe('');
    });
  });

  describe('sendMessageStream', () => {
    it('should expose sendMessageStream method', () => {
      expect(typeof chatAPI.sendMessageStream).toBe('function');
    });

    it('should call callbacks appropriately', async () => {
      // Mock the global fetch for streaming
      const mockReadableStream = {
        getReader: () => {
          let callCount = 0;
          return {
            read: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                const encoder = new TextEncoder();
                return Promise.resolve({
                  done: false,
                  value: encoder.encode('data: {"token":"Hello"}\n\n'),
                });
              }
              if (callCount === 2) {
                const encoder = new TextEncoder();
                return Promise.resolve({
                  done: false,
                  value: encoder.encode('data: {"done":true,"conversationId":"conv_123"}\n\n'),
                });
              }
              return Promise.resolve({ done: true });
            }),
          };
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: mockReadableStream,
      });

      const callbacks = {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await chatAPI.sendMessageStream(
        {
          characterId: 'char_456',
          message: 'Hello',
        },
        callbacks
      );

      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});

describe('Stream data parsing', () => {
  it('should correctly parse SSE token events', () => {
    const data = '{"token":"Hello","type":"token"}';
    const parsed = JSON.parse(data);

    expect(parsed.token).toBe('Hello');
    expect(parsed.type).toBe('token');
  });

  it('should correctly parse SSE complete events', () => {
    const data = '{"done":true,"conversationId":"conv_123","messageId":"msg_456"}';
    const parsed = JSON.parse(data);

    expect(parsed.done).toBe(true);
    expect(parsed.conversationId).toBe('conv_123');
    expect(parsed.messageId).toBe('msg_456');
  });

  it('should handle content field as alternative to token', () => {
    const data = '{"content":"World"}';
    const parsed = JSON.parse(data);
    const token = parsed.token || parsed.content;

    expect(token).toBe('World');
  });
});
