/**
 * Unit tests for Character CRUD operations
 * T058: Unit test for character CRUD operations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CharactersAPI } from '../../src/characters/index.js';
import {
  validateCreateCharacter,
  validateUpdateCharacter,
} from '../../src/characters/validation.js';
import { ElizaValidationError } from '../../src/errors/ElizaValidationError.js';

// Mock HttpClient
const createMockHttpClient = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
});

describe('CharactersAPI', () => {
  let charactersAPI: CharactersAPI;
  let mockHttpClient: ReturnType<typeof createMockHttpClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpClient = createMockHttpClient();
    charactersAPI = new CharactersAPI(mockHttpClient as any);
  });

  describe('list', () => {
    it('should list characters with default pagination', async () => {
      const mockResponse = {
        characters: [
          { id: 'char_1', name: 'Character 1' },
          { id: 'char_2', name: 'Character 2' },
        ],
        total: 2,
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await charactersAPI.list();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/characters?page=1&pageSize=20');
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should support custom pagination', async () => {
      mockHttpClient.get.mockResolvedValue({ characters: [], total: 0 });

      await charactersAPI.list({ page: 3, pageSize: 50 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/characters?page=3&pageSize=50');
    });

    it('should calculate hasMore correctly', async () => {
      mockHttpClient.get.mockResolvedValue({
        characters: Array(20).fill({ id: 'char' }),
        total: 50,
      });

      const result = await charactersAPI.list({ page: 1, pageSize: 20 });

      expect(result.hasMore).toBe(true);
    });

    it('should return hasMore=false on last page', async () => {
      mockHttpClient.get.mockResolvedValue({
        characters: Array(10).fill({ id: 'char' }),
        total: 50,
      });

      const result = await charactersAPI.list({ page: 3, pageSize: 20 });

      expect(result.hasMore).toBe(false);
    });
  });

  describe('get', () => {
    it('should get a character by ID', async () => {
      const mockCharacter = {
        id: 'char_123',
        name: 'Test Character',
        config: { bio: 'Test bio' },
      };

      mockHttpClient.get.mockResolvedValue(mockCharacter);

      const result = await charactersAPI.get('char_123');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/characters/char_123');
      expect(result).toEqual(mockCharacter);
    });
  });

  describe('create', () => {
    it('should create a character with valid input', async () => {
      const mockCreated = { id: 'char_new', name: 'New Character' };
      mockHttpClient.post.mockResolvedValue(mockCreated);

      const result = await charactersAPI.create({
        name: 'New Character',
        personality: 'Friendly and helpful AI assistant',
        backstory: 'Created to assist users with various tasks',
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/characters',
        expect.objectContaining({
          name: 'New Character',
        })
      );
      expect(result).toEqual(mockCreated);
    });

    it('should include externalId when provided', async () => {
      mockHttpClient.post.mockResolvedValue({ id: 'char_new' });

      await charactersAPI.create({
        name: 'New Character',
        personality: 'A helpful character',
        backstory: 'Created for testing purposes',
        externalId: 'ext_123',
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/characters',
        expect.objectContaining({
          externalId: 'ext_123',
        })
      );
    });

    it('should throw validation error for invalid input', async () => {
      await expect(
        charactersAPI.create({
          name: '', // Empty name
          personality: 'short', // Too short
          backstory: 'short', // Too short
        })
      ).rejects.toThrow(ElizaValidationError);
    });
  });

  describe('update', () => {
    it('should update a character', async () => {
      const mockUpdated = { id: 'char_123', name: 'Updated Name' };
      mockHttpClient.put.mockResolvedValue(mockUpdated);

      const result = await charactersAPI.update('char_123', {
        name: 'Updated Name',
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/characters/char_123',
        expect.objectContaining({ name: 'Updated Name' })
      );
      expect(result).toEqual(mockUpdated);
    });

    it('should handle partial updates', async () => {
      mockHttpClient.put.mockResolvedValue({ id: 'char_123' });

      await charactersAPI.update('char_123', {
        personality: 'A new personality description for the character',
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/characters/char_123',
        expect.objectContaining({
          config: expect.objectContaining({
            personality: 'A new personality description for the character',
          }),
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete a character', async () => {
      mockHttpClient.delete.mockResolvedValue(undefined);

      await charactersAPI.delete('char_123');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/characters/char_123');
    });
  });

  describe('getByExternalId', () => {
    it('should get a character by external ID', async () => {
      const mockCharacter = { id: 'char_123', externalId: 'ext_456' };
      mockHttpClient.get.mockResolvedValue(mockCharacter);

      const result = await charactersAPI.getByExternalId('ext_456');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/characters/external/ext_456');
      expect(result).toEqual(mockCharacter);
    });

    it('should return null for 404 errors', async () => {
      mockHttpClient.get.mockRejectedValue({ statusCode: 404 });

      const result = await charactersAPI.getByExternalId('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw non-404 errors', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Server error'));

      await expect(charactersAPI.getByExternalId('ext_456')).rejects.toThrow();
    });

    it('should URL-encode special characters in externalId', async () => {
      mockHttpClient.get.mockResolvedValue({ id: 'char_123' });

      await charactersAPI.getByExternalId('ext/with/slashes');

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/characters/external/ext%2Fwith%2Fslashes'
      );
    });
  });
});

describe('Character Validation', () => {
  describe('validateCreateCharacter', () => {
    it('should validate valid input', () => {
      const input = {
        name: 'Test Character',
        personality: 'A friendly and helpful AI character',
        backstory: 'Created to assist users with tasks',
      };

      const result = validateCreateCharacter(input);

      expect(result.name).toBe('Test Character');
      expect(result.personality).toBe('A friendly and helpful AI character');
    });

    it('should throw for missing name', () => {
      const input = {
        name: '',
        personality: 'Valid personality text here',
        backstory: 'Valid backstory text here',
      };

      expect(() => validateCreateCharacter(input)).toThrow(ElizaValidationError);
    });

    it('should throw for personality too short', () => {
      const input = {
        name: 'Valid Name',
        personality: 'Short',
        backstory: 'Valid backstory text here',
      };

      expect(() => validateCreateCharacter(input)).toThrow(ElizaValidationError);
    });

    it('should throw for backstory too short', () => {
      const input = {
        name: 'Valid Name',
        personality: 'Valid personality text here',
        backstory: 'Short',
      };

      expect(() => validateCreateCharacter(input)).toThrow(ElizaValidationError);
    });

    it('should validate example messages', () => {
      const input = {
        name: 'Test Character',
        personality: 'A friendly and helpful AI character',
        backstory: 'Created to assist users with tasks',
        exampleMessages: [
          { role: 'user' as const, content: 'Hello' },
          { role: 'assistant' as const, content: 'Hi there!' },
        ],
      };

      const result = validateCreateCharacter(input);

      expect(result.exampleMessages).toHaveLength(2);
    });

    it('should reject invalid message roles', () => {
      const input = {
        name: 'Test Character',
        personality: 'A friendly and helpful AI character',
        backstory: 'Created to assist users with tasks',
        exampleMessages: [{ role: 'invalid' as any, content: 'Hello' }],
      };

      expect(() => validateCreateCharacter(input)).toThrow(ElizaValidationError);
    });
  });

  describe('validateUpdateCharacter', () => {
    it('should validate partial updates', () => {
      const input = { name: 'New Name' };
      const result = validateUpdateCharacter(input);

      expect(result.name).toBe('New Name');
    });

    it('should allow empty input for no-op updates', () => {
      const result = validateUpdateCharacter({});
      expect(result).toEqual({});
    });

    it('should validate updated fields', () => {
      const input = { personality: 'X' }; // Too short

      expect(() => validateUpdateCharacter(input)).toThrow(ElizaValidationError);
    });
  });
});
