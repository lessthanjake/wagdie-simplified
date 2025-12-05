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
export declare function createSIWEMessage(params: SIWEMessageParams): string;
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
export declare function verifySIWEMessage(message: string, options?: {
    domain?: string;
    nonce?: string;
    checkExpiration?: boolean;
}): SIWEVerificationResult;
/**
 * Generate a random nonce for SIWE messages
 *
 * @param length - Length of the nonce (default: 16)
 * @returns Random alphanumeric string
 */
export declare function generateNonce(length?: number): string;
