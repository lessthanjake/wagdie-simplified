/**
 * SIWE (Sign-In with Ethereum) Authentication Helpers
 *
 * This module provides helper functions for creating and verifying
 * EIP-4361 compliant SIWE messages for wallet-based authentication.
 *
 * @see https://eips.ethereum.org/EIPS/eip-4361
 */

/**
 * Parameters for creating a SIWE message
 */
export interface SIWEMessageParams {
  /** Ethereum domain requesting the sign-in */
  domain: string;
  /** Ethereum address performing the sign-in */
  address: string;
  /** Human-readable ASCII assertion */
  statement?: string;
  /** RFC 3986 URI of the resource */
  uri: string;
  /** EIP-155 chain ID */
  chainId: number;
  /** Random string for replay protection */
  nonce: string;
  /** ISO 8601 timestamp when message was issued */
  issuedAt?: string;
  /** ISO 8601 timestamp when message expires */
  expirationTime?: string;
  /** ISO 8601 timestamp when message becomes valid */
  notBefore?: string;
  /** System-specific request ID */
  requestId?: string;
  /** List of resources authorized for use */
  resources?: string[];
}

/**
 * Verification result for a SIWE message
 */
export interface SIWEVerificationResult {
  success: boolean;
  address?: string;
  error?: string;
  fields?: SIWEMessageParams;
}

/**
 * Create a SIWE (Sign-In with Ethereum) message string
 *
 * The message follows EIP-4361 format and can be signed by any
 * Ethereum wallet (MetaMask, WalletConnect, etc.)
 *
 * @example
 * ```typescript
 * const message = createSIWEMessage({
 *   domain: 'example.com',
 *   address: '0x1234...abcd',
 *   statement: 'Sign in to access Eliza chat',
 *   uri: 'https://example.com',
 *   chainId: 1,
 *   nonce: 'abc123xyz',
 * });
 *
 * // Sign with wallet
 * const signature = await wallet.signMessage(message);
 *
 * // Verify with SDK
 * const tokens = await client.auth.verify(message, signature, sessionId);
 * ```
 */
export function createSIWEMessage(params: SIWEMessageParams): string {
  const {
    domain,
    address,
    statement,
    uri,
    chainId,
    nonce,
    issuedAt = new Date().toISOString(),
    expirationTime,
    notBefore,
    requestId,
    resources,
  } = params;

  // Validate required fields
  if (!domain) throw new Error('domain is required');
  if (!address) throw new Error('address is required');
  if (!uri) throw new Error('uri is required');
  if (!chainId) throw new Error('chainId is required');
  if (!nonce) throw new Error('nonce is required');

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error('Invalid Ethereum address format');
  }

  // Build message lines
  const lines: string[] = [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
  ];

  if (statement) {
    lines.push(statement, '');
  }

  lines.push(`URI: ${uri}`);
  lines.push(`Version: 1`);
  lines.push(`Chain ID: ${chainId}`);
  lines.push(`Nonce: ${nonce}`);
  lines.push(`Issued At: ${issuedAt}`);

  if (expirationTime) {
    lines.push(`Expiration Time: ${expirationTime}`);
  }

  if (notBefore) {
    lines.push(`Not Before: ${notBefore}`);
  }

  if (requestId) {
    lines.push(`Request ID: ${requestId}`);
  }

  if (resources && resources.length > 0) {
    lines.push('Resources:');
    for (const resource of resources) {
      lines.push(`- ${resource}`);
    }
  }

  return lines.join('\n');
}

/**
 * Parse and verify a SIWE message string
 *
 * This function parses the message and validates its structure.
 * Note: This does NOT verify the cryptographic signature.
 * Signature verification should be done server-side.
 *
 * @example
 * ```typescript
 * const result = verifySIWEMessage(messageString, {
 *   domain: 'example.com',
 *   nonce: expectedNonce,
 * });
 *
 * if (result.success) {
 *   console.log('Message is valid for address:', result.address);
 * } else {
 *   console.error('Validation failed:', result.error);
 * }
 * ```
 */
export function verifySIWEMessage(
  message: string,
  options?: {
    domain?: string;
    nonce?: string;
    checkExpiration?: boolean;
  }
): SIWEVerificationResult {
  try {
    const parsed = parseSIWEMessage(message);

    // Validate domain if provided
    if (options?.domain && parsed.domain !== options.domain) {
      return {
        success: false,
        error: `Domain mismatch: expected ${options.domain}, got ${parsed.domain}`,
      };
    }

    // Validate nonce if provided
    if (options?.nonce && parsed.nonce !== options.nonce) {
      return {
        success: false,
        error: 'Nonce mismatch',
      };
    }

    // Check expiration if requested
    if (options?.checkExpiration && parsed.expirationTime) {
      const expirationDate = new Date(parsed.expirationTime);
      if (expirationDate < new Date()) {
        return {
          success: false,
          error: 'Message has expired',
        };
      }
    }

    // Check notBefore if present
    if (parsed.notBefore) {
      const notBeforeDate = new Date(parsed.notBefore);
      if (notBeforeDate > new Date()) {
        return {
          success: false,
          error: 'Message is not yet valid',
        };
      }
    }

    return {
      success: true,
      address: parsed.address,
      fields: parsed,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse message',
    };
  }
}

/**
 * Parse a SIWE message string into its components
 */
function parseSIWEMessage(message: string): SIWEMessageParams {
  const lines = message.split('\n');

  if (lines.length < 7) {
    throw new Error('Invalid SIWE message format');
  }

  // Parse header line
  const headerMatch = lines[0].match(/^(.+) wants you to sign in with your Ethereum account:$/);
  if (!headerMatch) {
    throw new Error('Invalid SIWE header');
  }
  const domain = headerMatch[1];

  // Parse address (line 2)
  const address = lines[1];
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error('Invalid Ethereum address');
  }

  // Find required fields
  const result: SIWEMessageParams = {
    domain,
    address,
    uri: '',
    chainId: 0,
    nonce: '',
  };

  // Check for statement (between address and URI)
  let statementLines: string[] = [];
  let i = 3; // Skip header, address, and empty line
  while (i < lines.length && !lines[i].startsWith('URI:')) {
    if (lines[i]) {
      statementLines.push(lines[i]);
    }
    i++;
  }
  if (statementLines.length > 0) {
    result.statement = statementLines.join('\n');
  }

  // Parse key-value fields
  for (; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('URI: ')) {
      result.uri = line.slice(5);
    } else if (line.startsWith('Chain ID: ')) {
      result.chainId = parseInt(line.slice(10), 10);
    } else if (line.startsWith('Nonce: ')) {
      result.nonce = line.slice(7);
    } else if (line.startsWith('Issued At: ')) {
      result.issuedAt = line.slice(11);
    } else if (line.startsWith('Expiration Time: ')) {
      result.expirationTime = line.slice(17);
    } else if (line.startsWith('Not Before: ')) {
      result.notBefore = line.slice(12);
    } else if (line.startsWith('Request ID: ')) {
      result.requestId = line.slice(12);
    } else if (line === 'Resources:') {
      // Parse resources
      result.resources = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('- ')) {
          result.resources.push(lines[j].slice(2));
        } else {
          break;
        }
      }
    }
  }

  // Validate required fields
  if (!result.uri) throw new Error('Missing URI field');
  if (!result.chainId) throw new Error('Missing Chain ID field');
  if (!result.nonce) throw new Error('Missing Nonce field');

  return result;
}

/**
 * Generate a random nonce for SIWE messages
 *
 * @param length - Length of the nonce (default: 16)
 * @returns Random alphanumeric string
 */
export function generateNonce(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return result;
}
