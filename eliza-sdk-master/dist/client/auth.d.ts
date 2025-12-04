import type { AuthTokens, NonceResponse } from '../types/index.js';
import type { HttpClient } from './http.js';
export interface AuthManagerConfig {
    apiKey?: string;
    accessToken?: string;
    onTokenRefresh?: (tokens: AuthTokens) => void;
    onAuthRequired?: () => void;
}
export declare class AuthManager {
    private apiKey?;
    private tokens?;
    private httpClient?;
    private refreshPromise?;
    private onTokenRefresh?;
    private onAuthRequired?;
    constructor(config: AuthManagerConfig);
    setHttpClient(client: HttpClient): void;
    /**
     * Get the authorization header value
     */
    getAuthHeader(): string | null;
    /**
     * Check if we have valid authentication
     */
    isAuthenticated(): boolean;
    /**
     * Check if token needs refresh
     */
    needsRefresh(): boolean;
    /**
     * Set tokens after successful authentication
     */
    setTokens(tokens: AuthTokens): void;
    /**
     * Clear all auth state
     */
    clearAuth(): void;
    /**
     * Refresh the access token
     */
    refreshTokens(): Promise<void>;
    private doRefresh;
    /**
     * Get nonce for SIWE authentication
     */
    getNonce(): Promise<NonceResponse>;
    /**
     * Verify SIWE message and signature
     */
    verify(message: string, signature: string, sessionId: string): Promise<AuthTokens>;
    private loadFromStorage;
    private saveToStorage;
    private clearStorage;
}
