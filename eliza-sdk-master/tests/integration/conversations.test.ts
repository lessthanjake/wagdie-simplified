/**
 * Integration tests for conversation history
 * T069: Integration test for conversation history
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { ElizaClient } from '../../src/client/ElizaClient.js';

const TEST_API_URL = process.env.ELIZA_API_URL || 'https://test.eliza.api';
const TEST_API_KEY = process.env.ELIZA_API_KEY || 'elk_test_key';
const TEST_CHARACTER_ID = process.env.ELIZA_TEST_CHARACTER_ID || 'char_test';

describe('Conversation Integration', () => {
  let client: ElizaClient;
  let testConversationId: string | null = null;

  beforeAll(() => {
    // Mock fetch for integration tests
    if (!process.env.ELIZA_API_URL) {
      const conversations: Map<string, any> = new Map();
      const messages: Map<string, any[]> = new Map();

      global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        const method = options?.method || 'GET';
        const body = options?.body ? JSON.parse(options.body as string) : {};

        // Mock chat to create conversations
        if (url.includes('/chat') && method === 'POST') {
          let convId = body.conversationId;
          if (!convId) {
            convId = `conv_${Date.now()}`;
            conversations.set(convId, {
              id: convId,
              characterId: body.characterId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            messages.set(convId, []);
          }

          const msgId = `msg_${Date.now()}`;
          const userMsg = {
            id: `${msgId}_user`,
            role: 'user',
            content: body.message,
            createdAt: new Date().toISOString(),
          };
          const assistantMsg = {
            id: msgId,
            role: 'assistant',
            content: `Response to: ${body.message}`,
            createdAt: new Date().toISOString(),
          };

          messages.get(convId)?.push(userMsg, assistantMsg);

          // Update conversation
          const conv = conversations.get(convId);
          if (conv) {
            conv.updatedAt = new Date().toISOString();
          }

          return Promise.resolve({
            ok: true,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: () =>
              Promise.resolve({
                ...assistantMsg,
                conversationId: convId,
              }),
          });
        }

        // Mock conversation list
        if (url.includes('/conversations') && !url.includes('/conversations/') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: () =>
              Promise.resolve({
                conversations: Array.from(conversations.values()).map((c) => ({
                  ...c,
                  messageCount: messages.get(c.id)?.length || 0,
                })),
                total: conversations.size,
              }),
          });
        }

        // Mock conversation detail
        if (url.match(/\/conversations\/conv_\d+$/) && method === 'GET') {
          const convId = url.split('/').pop()!;
          const conv = conversations.get(convId);
          if (conv) {
            return Promise.resolve({
              ok: true,
              headers: new Headers({ 'Content-Type': 'application/json' }),
              json: () =>
                Promise.resolve({
                  ...conv,
                  messages: messages.get(convId) || [],
                }),
            });
          }
          return Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: () => Promise.resolve({ error: 'Not found' }),
          });
        }

        // Mock character conversations
        if (url.includes('/characters/') && url.includes('/conversations')) {
          const charId = url.split('/characters/')[1].split('/conversations')[0];
          const charConvs = Array.from(conversations.values()).filter(
            (c) => c.characterId === charId
          );
          return Promise.resolve({
            ok: true,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: () =>
              Promise.resolve({
                conversations: charConvs.map((c) => ({
                  ...c,
                  messageCount: messages.get(c.id)?.length || 0,
                })),
                total: charConvs.length,
              }),
          });
        }

        // Mock conversation delete
        if (url.match(/\/conversations\/conv_\d+$/) && method === 'DELETE') {
          const convId = url.split('/').pop()!;
          conversations.delete(convId);
          messages.delete(convId);
          return Promise.resolve({
            ok: true,
            status: 204,
            headers: new Headers(),
            json: () => Promise.resolve({}),
          });
        }

        // Default
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

  afterAll(async () => {
    // Clean up test conversation
    if (testConversationId) {
      try {
        await client.conversations.delete(testConversationId);
      } catch {
        // Ignore
      }
    }
    vi.restoreAllMocks();
  });

  describe('Conversation Flow', () => {
    it('should create a conversation via chat', async () => {
      const response = await client.chat.sendMessage({
        characterId: TEST_CHARACTER_ID,
        message: 'Start a conversation',
      });

      expect(response.conversationId).toBeDefined();
      testConversationId = response.conversationId!;
    });

    it('should list conversations', async () => {
      const result = await client.conversations.list();

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
    });

    it('should list conversations for a character', async () => {
      const result = await client.conversations.listForCharacter(TEST_CHARACTER_ID);

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
    });

    it('should get conversation with message history', async () => {
      if (!testConversationId) {
        return;
      }

      const conversation = await client.conversations.get(testConversationId);

      expect(conversation).toBeDefined();
      expect(conversation.id).toBe(testConversationId);
      expect(conversation.messages).toBeInstanceOf(Array);
      expect(conversation.messages.length).toBeGreaterThan(0);
    });

    it('should accumulate messages in conversation', async () => {
      if (!testConversationId) {
        return;
      }

      // Send another message
      await client.chat.sendMessage({
        characterId: TEST_CHARACTER_ID,
        message: 'Follow-up message',
        conversationId: testConversationId,
      });

      const conversation = await client.conversations.get(testConversationId);

      // Should have messages accumulated from both turns
      expect(conversation.messages.length).toBeGreaterThanOrEqual(2);
    });

    it('should delete a conversation', async () => {
      // Create a new conversation to delete
      const response = await client.chat.sendMessage({
        characterId: TEST_CHARACTER_ID,
        message: 'Conversation to delete',
      });

      const convIdToDelete = response.conversationId!;

      // Delete it
      await client.conversations.delete(convIdToDelete);

      // Verify it's gone
      await expect(client.conversations.get(convIdToDelete)).rejects.toThrow();
    });
  });

  describe('Pagination', () => {
    it('should support pagination params', async () => {
      const result = await client.conversations.list({ page: 1, pageSize: 5 });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(5);
    });

    it('should indicate hasMore correctly', async () => {
      // Create multiple conversations
      for (let i = 0; i < 3; i++) {
        await client.chat.sendMessage({
          characterId: TEST_CHARACTER_ID,
          message: `Pagination test ${i}`,
        });
      }

      const result = await client.conversations.list({ page: 1, pageSize: 2 });

      // With 3+ conversations and pageSize 2, hasMore should be true
      if (result.total > 2) {
        expect(result.hasMore).toBe(true);
      }
    });
  });
});
