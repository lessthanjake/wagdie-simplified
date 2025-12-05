/**
 * Character Types
 */

export interface ExampleMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CharacterStyle {
  all?: string[];
  chat?: string[];
  post?: string[];
}

export interface Character {
  id: string;
  name: string;
  personality: string;
  backstory: string;
  systemPrompt?: string;
  exampleMessages?: ExampleMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterInput {
  name: string;
  personality: string;
  backstory: string;
  systemPrompt?: string;
  exampleMessages?: ExampleMessage[];
  /** External system ID for upsert behavior */
  externalId?: string;
}

export interface UpdateCharacterInput {
  name?: string;
  personality?: string;
  backstory?: string;
  systemPrompt?: string;
  exampleMessages?: ExampleMessage[];
}
