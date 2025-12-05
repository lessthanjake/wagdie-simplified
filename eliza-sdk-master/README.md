# @eliza/sdk

TypeScript SDK for ElizaOS character chat functionality. Provides a type-safe client for interacting with the Eliza API, including streaming chat, character management, and conversation history.

## Installation

```bash
npm install @eliza/sdk
# or
yarn add @eliza/sdk
# or
pnpm add @eliza/sdk
```

## Quick Start

### With API Key (Server-side)

```typescript
import { ElizaClient } from '@eliza/sdk';

const client = new ElizaClient({
  baseUrl: 'https://your-eliza-api.com',
  apiKey: 'elk_your_api_key',
});

// Verify credentials
const { valid } = await client.verifyCredentials();

// Send a chat message with streaming
await client.chat.sendMessageStream(
  {
    characterId: 'char_123',
    message: 'Hello!',
  },
  {
    onToken: (token) => process.stdout.write(token),
    onComplete: (response) => console.log('\nDone:', response.id),
    onError: (error) => console.error('Error:', error),
  }
);
```

### With SIWE Authentication (Browser)

```typescript
import { ElizaClient, createSIWEMessage } from '@eliza/sdk';

const client = new ElizaClient({
  baseUrl: 'https://your-eliza-api.com',
});

// Get nonce from server
const { nonce, sessionId } = await client.auth.getNonce();

// Create SIWE message
const message = createSIWEMessage({
  domain: window.location.host,
  address: walletAddress,
  statement: 'Sign in to Eliza',
  uri: window.location.origin,
  chainId: 1,
  nonce,
});

// Sign with wallet (e.g., MetaMask)
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [message, walletAddress],
});

// Verify and get tokens
await client.auth.verify(message, signature, sessionId);

// Now authenticated - send messages
const response = await client.chat.sendMessage({
  characterId: 'char_123',
  message: 'Hello!',
});
```

## Features

### Character Management

```typescript
// List characters
const { items } = await client.characters.list({ page: 1, pageSize: 10 });

// Get a character
const character = await client.characters.get('char_123');

// Create a character (with externalId for upsert)
const newChar = await client.characters.create({
  name: 'My Character',
  personality: 'Friendly and helpful assistant...',
  backstory: 'Created to help users with their questions...',
  externalId: 'my-external-id', // Optional: enables upsert behavior
});

// Update a character
await client.characters.update('char_123', {
  personality: 'Updated personality...',
});

// Delete a character
await client.characters.delete('char_123');
```

### Chat with Streaming

```typescript
// Non-streaming
const response = await client.chat.sendMessage({
  characterId: 'char_123',
  message: 'What is the weather like?',
  conversationId: 'conv_456', // Optional: continue existing conversation
});

// Streaming
await client.chat.sendMessageStream(
  {
    characterId: 'char_123',
    message: 'Tell me a story',
  },
  {
    onToken: (token) => {
      // Each token as it arrives
      document.getElementById('output').textContent += token;
    },
    onComplete: (response) => {
      // Full response with metadata
      console.log('Completed:', response.conversationId);
    },
    onError: (error) => {
      console.error('Stream error:', error);
    },
  }
);
```

### Conversation History

```typescript
// List all conversations
const { items } = await client.conversations.list();

// List conversations for a character
const charConvs = await client.conversations.listForCharacter('char_123');

// Get conversation with messages
const detail = await client.conversations.get('conv_456');
console.log(detail.messages);

// Delete a conversation
await client.conversations.delete('conv_456');
```

## Configuration

```typescript
const client = new ElizaClient({
  // Required
  baseUrl: 'https://your-eliza-api.com',

  // Authentication (choose one)
  apiKey: 'elk_your_api_key',    // For server-side
  accessToken: 'jwt_token',       // If you have a token

  // Optional
  timeout: 30000,                 // Request timeout in ms (default: 30000)
  retry: {
    maxRetries: 3,                // Max retry attempts (default: 3)
    baseDelay: 1000,              // Base delay between retries (default: 1000)
    maxDelay: 10000,              // Max delay between retries (default: 10000)
  },
});
```

## Error Handling

```typescript
import {
  ElizaError,
  ElizaAPIError,
  ElizaAuthError,
  ElizaRateLimitError,
  ElizaNetworkError,
  ElizaValidationError,
  isElizaError,
} from '@eliza/sdk';

try {
  await client.chat.sendMessage({ characterId: 'invalid', message: 'Hi' });
} catch (error) {
  if (error instanceof ElizaAuthError) {
    // Handle authentication errors
    console.log('Please log in again');
  } else if (error instanceof ElizaRateLimitError) {
    // Handle rate limiting
    console.log(`Rate limited. Retry after ${error.retryAfter}ms`);
  } else if (error instanceof ElizaValidationError) {
    // Handle validation errors
    console.log('Invalid input:', error.fieldErrors);
  } else if (error instanceof ElizaNetworkError) {
    // Handle network errors
    console.log('Network error:', error.message);
  } else if (isElizaError(error)) {
    // Handle any Eliza error
    console.log('Eliza error:', error.message);
  }
}
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  Character,
  CreateCharacterInput,
  ChatMessage,
  ChatResponse,
  Conversation,
  ConversationDetail,
  ElizaClientConfig,
  PaginatedResponse,
} from '@eliza/sdk';
```

## License

MIT
