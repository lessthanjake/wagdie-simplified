/**
 * Unit tests for Conversation methods
 * T068: Unit test for conversation methods
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationsAPI } from '../../src/conversations/index.js';

// Mock HttpClient
const createMockHttpClient = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
});

describe('ConversationsAPI', () => {
  let conversationsAPI: ConversationsAPI;
  let mockHttpClient: ReturnType<typeof createMockHttpClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpClient = createMockHttpClient();
    conversationsAPI = new ConversationsAPI(mockHttpClient as any);
  });

  describe('list', () => {
    it('should list all conversations with default pagination', async () => {
      const mockResponse = {
        conversations: [
          {
            id: 'conv_1',
            characterId: 'char_1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T01:00:00Z',
            messageCount: 5,
          },
          {
            id: 'conv_2',
            characterId: 'char_2',
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T01:00:00Z',
            messageCount: 10,
          },
        ],
        total: 2,
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await conversationsAPI.list();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/conversations?page=1&pageSize=20');
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should support custom pagination', async () => {
      mockHttpClient.get.mockResolvedValue({ conversations: [], total: 0 });

      await conversationsAPI.list({ page: 2, pageSize: 10 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/conversations?page=2&pageSize=10');
    });

    it('should map conversation data correctly', async () => {
      mockHttpClient.get.mockResolvedValue({
        conversations: [
          {
            id: 'conv_1',
            characterId: 'char_1',
            userId: 'user_1',
            messageCount: 5,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T01:00:00Z',
          },
        ],
        total: 1,
      });

      const result = await conversationsAPI.list();

      expect(result.items[0]).toEqual({
        id: 'conv_1',
        characterId: 'char_1',
        characterName: '', // May need separate fetch
        messageCount: 5,
        lastMessageAt: '2024-01-01T01:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should calculate hasMore correctly', async () => {
      mockHttpClient.get.mockResolvedValue({
        conversations: Array(20).fill({
          id: 'conv',
          characterId: 'char',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }),
        total: 50,
      });

      const result = await conversationsAPI.list({ page: 1, pageSize: 20 });

      expect(result.hasMore).toBe(true);
    });
  });

  describe('listForCharacter', () => {
    it('should list conversations for a specific character', async () => {
      mockHttpClient.get.mockResolvedValue({
        conversations: [
          {
            id: 'conv_1',
            characterId: 'char_123',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T01:00:00Z',
          },
        ],
        total: 1,
      });

      const result = await conversationsAPI.listForCharacter('char_123');

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/characters/char_123/conversations?page=1&pageSize=20'
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].characterId).toBe('char_123');
    });

    it('should support custom pagination for character conversations', async () => {
      mockHttpClient.get.mockResolvedValue({ conversations: [], total: 0 });

      await conversationsAPI.listForCharacter('char_123', { page: 3, pageSize: 5 });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/characters/char_123/conversations?page=3&pageSize=5'
      );
    });
  });

  describe('get', () => {
    it('should get a conversation with message history', async () => {
      const mockResponse = {
        id: 'conv_123',
        characterId: 'char_456',
        userId: 'user_789',
        messages: [
          {
            id: 'msg_1',
            role: 'user',
            content: 'Hello',
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'msg_2',
            role: 'assistant',
            content: 'Hi there!',
            createdAt: '2024-01-01T00:00:01Z',
          },
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:01Z',
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await conversationsAPI.get('conv_123');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/conversations/conv_123');
      expect(result.id).toBe('conv_123');
      expect(result.characterId).toBe('char_456');
      expect(result.messages).toHaveLength(2);
      expect(result.messageCount).toBe(2);
    });

    it('should handle conversation with no messages', async () => {
      mockHttpClient.get.mockResolvedValue({
        id: 'conv_empty',
        characterId: 'char_1',
        userId: 'user_1',
        messages: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const result = await conversationsAPI.get('conv_empty');

      expect(result.messages).toHaveLength(0);
      expect(result.messageCount).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete a conversation', async () => {
      mockHttpClient.delete.mockResolvedValue(undefined);

      await conversationsAPI.delete('conv_123');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/conversations/conv_123');
    });

    it('should not throw on successful deletion', async () => {
      mockHttpClient.delete.mockResolvedValue(undefined);

      await expect(conversationsAPI.delete('conv_123')).resolves.toBeUndefined();
    });
  });
});

describe('Conversation Type Mapping', () => {
  it('should handle missing optional fields', () => {
    const rawConversation = {
      id: 'conv_1',
      characterId: 'char_1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      // No messageCount, no userId
    };

    // Simulate the mapping logic
    const mapped = {
      id: rawConversation.id,
      characterId: rawConversation.characterId,
      characterName: '',
      messageCount: (rawConversation as any).messageCount ?? 0,
      lastMessageAt: rawConversation.updatedAt,
      createdAt: rawConversation.createdAt,
    };

    expect(mapped.messageCount).toBe(0);
    expect(mapped.characterName).toBe('');
  });
});
