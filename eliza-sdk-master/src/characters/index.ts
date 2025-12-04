import type { HttpClient } from '../client/http.js';
import type { Character, CreateCharacterInput, UpdateCharacterInput } from '../types/character.js';
import type { PaginatedResponse, PaginationParams } from '../types/index.js';
import { validateCreateCharacter, validateUpdateCharacter } from './validation.js';

interface CharacterListParams extends PaginationParams {
  // Future: add filters like search, tags, etc.
}

export class CharactersAPI {
  constructor(private http: HttpClient) {}

  /**
   * List all characters (with pagination)
   */
  async list(params: CharacterListParams = {}): Promise<PaginatedResponse<Character>> {
    const { page = 1, pageSize = 20 } = params;

    const response = await this.http.get<{
      characters: Character[];
      total: number;
    }>(`/characters?page=${page}&pageSize=${pageSize}`);

    return {
      items: response.characters,
      total: response.total,
      page,
      pageSize,
      hasMore: page * pageSize < response.total,
    };
  }

  /**
   * Get a character by ID
   */
  async get(id: string): Promise<Character> {
    return this.http.get<Character>(`/characters/${id}`);
  }

  /**
   * Create a new character
   * If externalId is provided and a character with that externalId exists,
   * it will be updated instead (upsert behavior)
   */
  async create(input: CreateCharacterInput): Promise<Character> {
    const validated = validateCreateCharacter(input);

    // Transform to API format
    const body = {
      name: validated.name,
      config: {
        bio: validated.backstory,
        personality: validated.personality,
        style: validated.style,
        messageExamples: validated.exampleMessages?.map((msg) => [
          { user: msg.role, content: { text: msg.content } },
        ]),
      },
      externalId: validated.externalId,
    };

    return this.http.post<Character>('/characters', body);
  }

  /**
   * Update an existing character
   */
  async update(id: string, input: UpdateCharacterInput): Promise<Character> {
    const validated = validateUpdateCharacter(input);

    // Build partial update object
    const body: Record<string, unknown> = {};

    if (validated.name !== undefined) {
      body.name = validated.name;
    }

    // Build config updates
    const configUpdates: Record<string, unknown> = {};

    if (validated.backstory !== undefined) {
      configUpdates.bio = validated.backstory;
    }
    if (validated.personality !== undefined) {
      configUpdates.personality = validated.personality;
    }
    if (validated.style !== undefined) {
      configUpdates.style = validated.style;
    }
    if (validated.exampleMessages !== undefined) {
      configUpdates.messageExamples = validated.exampleMessages.map((msg) => [
        { user: msg.role, content: { text: msg.content } },
      ]);
    }

    if (Object.keys(configUpdates).length > 0) {
      body.config = configUpdates;
    }

    return this.http.put<Character>(`/characters/${id}`, body);
  }

  /**
   * Delete a character
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/characters/${id}`);
  }

  /**
   * Get a character by external ID
   * Useful for integrations that track characters by their own IDs
   */
  async getByExternalId(externalId: string): Promise<Character | null> {
    try {
      const response = await this.http.get<Character>(
        `/characters/external/${encodeURIComponent(externalId)}`
      );
      return response;
    } catch (error) {
      // Return null for 404 errors
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}
