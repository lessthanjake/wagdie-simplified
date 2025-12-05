// Main client export
export { ElizaClient } from './client/ElizaClient.js';

// API class exports (for advanced usage)
export { CharactersAPI } from './characters/index.js';
export { ChatAPI } from './chat/index.js';
export { ConversationsAPI } from './conversations/index.js';

// SIWE auth helpers
export {
  createSIWEMessage,
  verifySIWEMessage,
  generateNonce,
  type SIWEMessageParams,
  type SIWEVerificationResult,
} from './auth/siwe.js';

// Type exports
export type {
  ElizaClientConfig,
  RetryConfig,
  PaginationParams,
  PaginatedResponse,
  AuthTokens,
  NonceResponse,
  VerifyCredentialsResponse,
} from './types/index.js';

export type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
  ExampleMessage,
  CharacterStyle,
} from './types/character.js';

export type {
  ChatMessage,
  ChatResponse,
  SendMessageInput,
  StreamCallback,
  StreamCompleteCallback,
  StreamErrorCallback,
  StreamCallbacks,
} from './types/chat.js';

export type {
  Conversation,
  ConversationDetail,
  ConversationMessage,
} from './types/conversation.js';

// Validation schema exports (for custom validation)
export {
  CreateCharacterInputSchema,
  UpdateCharacterInputSchema,
  validateCreateCharacter,
  validateUpdateCharacter,
} from './characters/validation.js';

// Error exports
export {
  ElizaError,
  ElizaAPIError,
  ElizaAuthError,
  ElizaRateLimitError,
  ElizaNetworkError,
  ElizaValidationError,
  isElizaError,
} from './errors/index.js';

// Version
export const VERSION = '0.1.0';
