/**
 * Integration tests for character creation with externalId
 * T059: Integration test for character creation with externalId
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { ElizaClient } from '../../src/client/ElizaClient.js';

const TEST_API_URL = process.env.ELIZA_API_URL || 'https://test.eliza.api';
const TEST_API_KEY = process.env.ELIZA_API_KEY || 'elk_test_key';

describe('Character Integration', () => {
  let client: ElizaClient;
  let createdCharacterId: string | null = null;

  beforeAll(() => {
    // Mock fetch for integration tests when not running against real server
    if (!process.env.ELIZA_API_URL) {
      const characters: Map<string, any> = new Map();
      let idCounter = 1;

      global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        const method = options?.method || 'GET';

        // Mock character list
        if (url.includes('/characters') && method === 'GET' && !url.includes('/characters/')) {
          return Promise.resolve({
            ok: true,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: () =>
              Promise.resolve({
                characters: Array.from(characters.values()),
                total: characters.size,
              }),
          });
        }

        // Mock character create
        if (url.includes('/characters') && method === 'POST') {
          const newChar = {
            id: `char_${idCounter++}`,
            name: body.name,
            config: body.config,
            externalId: body.externalId,
            createdAt: new Date().toISOString(),
          };

          // Check for existing externalId (upsert)
          if (body.externalId) {
            for (const [id, char] of characters) {
              if (char.externalId === body.externalId) {
                // Update existing
                const updated = { ...char, ...newChar, id };
                characters.set(id, updated);
                return Promise.resolve({
                  ok: true,
                  headers: new Headers({ 'Content-Type': 'application/json' }),
                  json: () => Promise.resolve(updated),
                });
              }
            }
          }

          characters.set(newChar.id, newChar);
          return Promise.resolve({
            ok: true,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: () => Promise.resolve(newChar),
          });
        }

        // Mock character get
        if (url.match(/\/characters\/char_\d+$/) && method === 'GET') {
          const id = url.split('/').pop()!;
          const char = characters.get(id);
          if (char) {
            return Promise.resolve({
              ok: true,
              headers: new Headers({ 'Content-Type': 'application/json' }),
              json: () => Promise.resolve(char),
            });
          }
          return Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: () => Promise.resolve({ error: 'Not found' }),
          });
        }

        // Mock external ID lookup
        if (url.includes('/characters/external/') && method === 'GET') {
          const externalId = decodeURIComponent(url.split('/external/')[1]);
          for (const char of characters.values()) {
            if (char.externalId === externalId) {
              return Promise.resolve({
                ok: true,
                headers: new Headers({ 'Content-Type': 'application/json' }),
                json: () => Promise.resolve(char),
              });
            }
          }
          return Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: () => Promise.resolve({ error: 'Not found' }),
          });
        }

        // Mock character delete
        if (url.match(/\/characters\/char_\d+$/) && method === 'DELETE') {
          const id = url.split('/').pop()!;
          characters.delete(id);
          return Promise.resolve({
            ok: true,
            status: 204,
            headers: new Headers(),
            json: () => Promise.resolve({}),
          });
        }

        // Mock character update
        if (url.match(/\/characters\/char_\d+$/) && method === 'PUT') {
          const id = url.split('/').pop()!;
          const char = characters.get(id);
          if (char) {
            const updated = { ...char, ...body };
            characters.set(id, updated);
            return Promise.resolve({
              ok: true,
              headers: new Headers({ 'Content-Type': 'application/json' }),
              json: () => Promise.resolve(updated),
            });
          }
          return Promise.resolve({
            ok: false,
            status: 404,
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
    // Clean up created character
    if (createdCharacterId) {
      try {
        await client.characters.delete(createdCharacterId);
      } catch {
        // Ignore cleanup errors
      }
    }
    vi.restoreAllMocks();
  });

  describe('Character CRUD Flow', () => {
    it('should create a character', async () => {
      const character = await client.characters.create({
        name: 'Integration Test Character',
        personality: 'A helpful test character for integration testing',
        backstory: 'Created during automated integration tests',
      });

      expect(character).toBeDefined();
      expect(character.id).toBeDefined();
      expect(character.name).toBe('Integration Test Character');

      createdCharacterId = character.id;
    });

    it('should list characters', async () => {
      const result = await client.characters.list();

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should get a character by ID', async () => {
      if (!createdCharacterId) {
        return; // Skip if no character was created
      }

      const character = await client.characters.get(createdCharacterId);

      expect(character).toBeDefined();
      expect(character.id).toBe(createdCharacterId);
    });

    it('should update a character', async () => {
      if (!createdCharacterId) {
        return;
      }

      const updated = await client.characters.update(createdCharacterId, {
        name: 'Updated Test Character',
      });

      expect(updated.name).toBe('Updated Test Character');
    });
  });

  describe('ExternalId Upsert Flow', () => {
    const testExternalId = `test_ext_${Date.now()}`;
    let characterWithExternalId: string | null = null;

    it('should create a character with externalId', async () => {
      const character = await client.characters.create({
        name: 'External ID Test',
        personality: 'A character with external ID for testing',
        backstory: 'Created with external ID for upsert testing',
        externalId: testExternalId,
      });

      expect(character).toBeDefined();
      expect(character.id).toBeDefined();
      expect(character.externalId).toBe(testExternalId);

      characterWithExternalId = character.id;
    });

    it('should find character by externalId', async () => {
      const character = await client.characters.getByExternalId(testExternalId);

      expect(character).not.toBeNull();
      expect(character?.externalId).toBe(testExternalId);
    });

    it('should upsert (update) when creating with existing externalId', async () => {
      const updatedCharacter = await client.characters.create({
        name: 'Updated External ID Test',
        personality: 'Updated personality for upsert test',
        backstory: 'Backstory updated via upsert behavior',
        externalId: testExternalId,
      });

      expect(updatedCharacter.name).toBe('Updated External ID Test');
      // The ID might be the same or different depending on implementation
    });

    it('should return null for non-existent externalId', async () => {
      const result = await client.characters.getByExternalId('nonexistent_external_id');
      expect(result).toBeNull();
    });

    afterAll(async () => {
      if (characterWithExternalId) {
        try {
          await client.characters.delete(characterWithExternalId);
        } catch {
          // Ignore
        }
      }
    });
  });
});
