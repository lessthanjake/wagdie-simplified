/**
 * Integration tests for chat flow
 * T031: Integration test for chat flow
 *
 * Note: These tests are designed to run against a real or mock API server.
 * They verify the full flow from SDK to API and back.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { ElizaClient } from '../../src/client/ElizaClient.js';

// These tests use mocked fetch for CI environments
// For real integration testing, set ELIZA_API_URL environment variable

const TEST_API_URL = process.env.ELIZA_API_URL || 'https://test.eliza.api';
const TEST_API_KEY = process.env.ELIZA_API_KEY || 'elk_test_key';
const TEST_CHARACTER_ID = process.env.ELIZA_TEST_CHARACTER_ID || 'char_test';

describe('Chat Integration', () => {
  let client: ElizaClient;

  beforeAll(() => {
    // Mock fetch for integration tests when not running against real server
    if (!process.env.ELIZA_API_URL) {
      global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        const body = options?.body ? JSON.parse(options.body as string) : {};

        // Mock chat endpoint
        if (url.includes('/chat') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: () =>
              Promise.resolve({
                id: 'msg_integration_test',
                role: 'assistant',
                content: `Mock response to: ${body.message}`,
                conversationId: 'conv_integration_test',
                createdAt: new Date().toISOString(),
              }),
          });
        }

        // Mock verify endpoint
        if (url.includes('/integration/verify')) {
          return Promise.resolve({
            ok: true,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: () => Promise.resolve({ valid: true, clientName: 'Test Client' }),
          });
        }

        // Default mock
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not found' }),
        });
      });
    }

    client = new ElizaClient({
      baseUrl: TEST_API_URL,
      apiKey: TEST_API_KEY,
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Full Chat Flow', () => {
    it('should verify credentials successfully', async () => {
      const result = await client.verifyCredentials();
      expect(result.valid).toBe(true);
    });

    it('should send a message and receive a response', async () => {
      const response = await client.chat.sendMessage({
        characterId: TEST_CHARACTER_ID,
        message: 'Hello, this is an integration test',
      });

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.content).toBeDefined();
      expect(typeof response.content).toBe('string');
    });

    it('should continue a conversation with conversationId', async () => {
      // First message
      const firstResponse = await client.chat.sendMessage({
        characterId: TEST_CHARACTER_ID,
        message: 'First message',
      });

      expect(firstResponse.conversationId).toBeDefined();

      // Second message in same conversation
      const secondResponse = await client.chat.sendMessage({
        characterId: TEST_CHARACTER_ID,
        message: 'Second message',
        conversationId: firstResponse.conversationId,
      });

      expect(secondResponse.conversationId).toBe(firstResponse.conversationId);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid character ID gracefully', async () => {
      // Override mock for this test
      if (!process.env.ELIZA_API_URL) {
        (global.fetch as any).mockImplementationOnce(() =>
          Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: () => Promise.resolve({ error: 'Character not found' }),
          })
        );
      }

      await expect(
        client.chat.sendMessage({
          characterId: 'invalid_character_id',
          message: 'Test',
        })
      ).rejects.toThrow();
    });
  });
});

describe('Streaming Chat Integration', () => {
  let client: ElizaClient;

  beforeAll(() => {
    if (!process.env.ELIZA_API_URL) {
      // Mock streaming response
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/chat/stream')) {
          const encoder = new TextEncoder();
          const chunks = [
            'data: {"token":"Hello"}\n\n',
            'data: {"token":" there"}\n\n',
            'data: {"token":"!"}\n\n',
            'data: {"done":true,"conversationId":"conv_stream_test"}\n\n',
          ];

          let index = 0;
          const stream = new ReadableStream({
            pull(controller) {
              if (index < chunks.length) {
                controller.enqueue(encoder.encode(chunks[index]));
                index++;
              } else {
                controller.close();
              }
            },
          });

          return Promise.resolve({
            ok: true,
            body: stream,
          });
        }

        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          json: () => Promise.resolve({ valid: true }),
        });
      });
    }

    client = new ElizaClient({
      baseUrl: TEST_API_URL,
      apiKey: TEST_API_KEY,
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should receive streamed tokens', async () => {
    const chunks: string[] = [];
    let completedMessage: any = null;
    let completedConvId: string | null = null;

    await client.chat.sendMessageStream(
      {
        characterId: TEST_CHARACTER_ID,
        message: 'Stream test',
      },
      {
        onChunk: (chunk) => chunks.push(chunk),
        onComplete: (msg, convId) => {
          completedMessage = msg;
          completedConvId = convId;
        },
        onError: (error) => {
          throw error;
        },
      }
    );

    // Verify chunks were received
    expect(chunks.length).toBeGreaterThan(0);
  });
});
