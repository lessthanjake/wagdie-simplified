import type { AuthTokens, NonceResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

const STORAGE_KEY = 'eliza_auth_tokens';
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

export interface AuthManagerConfig {
  apiKey?: string;
  accessToken?: string;
  onTokenRefresh?: (tokens: AuthTokens) => void;
  onAuthRequired?: () => void;
}

export class AuthManager {
  private apiKey?: string;
  private tokens?: AuthTokens;
  private httpClient?: HttpClient;
  private refreshPromise?: Promise<void>;
  private onTokenRefresh?: (tokens: AuthTokens) => void;
  private onAuthRequired?: () => void;

  constructor(config: AuthManagerConfig) {
    this.apiKey = config.apiKey;
    this.onTokenRefresh = config.onTokenRefresh;
    this.onAuthRequired = config.onAuthRequired;

    if (config.accessToken) {
      this.tokens = { accessToken: config.accessToken };
    } else if (typeof window !== 'undefined') {
      // Try to load from localStorage in browser
      this.loadFromStorage();
    }
  }

  setHttpClient(client: HttpClient): void {
    this.httpClient = client;
  }

  /**
   * Get the authorization header value
   */
  getAuthHeader(): string | null {
    if (this.apiKey) {
      return `Bearer ${this.apiKey}`;
    }

    if (this.tokens?.accessToken) {
      return `Bearer ${this.tokens.accessToken}`;
    }

    return null;
  }

  /**
   * Check if we have valid authentication
   */
  isAuthenticated(): boolean {
    if (this.apiKey) {
      return true;
    }

    if (!this.tokens?.accessToken) {
      return false;
    }

    // Check if token is expired
    if (this.tokens.expiresAt && Date.now() >= this.tokens.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Check if token needs refresh
   */
  needsRefresh(): boolean {
    if (this.apiKey || !this.tokens?.refreshToken || !this.tokens.expiresAt) {
      return false;
    }

    return Date.now() >= this.tokens.expiresAt - TOKEN_REFRESH_MARGIN_MS;
  }

  /**
   * Set tokens after successful authentication
   */
  setTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
    this.saveToStorage();
    this.onTokenRefresh?.(tokens);
  }

  /**
   * Clear all auth state
   */
  clearAuth(): void {
    this.tokens = undefined;
    this.clearStorage();
  }

  /**
   * Refresh the access token
   */
  async refreshTokens(): Promise<void> {
    // Prevent concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokens?.refreshToken || !this.httpClient) {
      this.onAuthRequired?.();
      throw new Error('No refresh token available');
    }

    this.refreshPromise = this.doRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = undefined;
    }
  }

  private async doRefresh(): Promise<void> {
    try {
      const response = await this.httpClient!.post<{
        accessToken: string;
        refreshToken?: string;
        expiresIn?: number;
      }>('/auth/refresh', {
        refreshToken: this.tokens!.refreshToken,
      });

      const newTokens: AuthTokens = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || this.tokens!.refreshToken,
        expiresAt: response.expiresIn
          ? Date.now() + response.expiresIn * 1000
          : this.tokens!.expiresAt,
      };

      this.setTokens(newTokens);
    } catch {
      // Refresh failed, clear auth and notify
      this.clearAuth();
      this.onAuthRequired?.();
      throw new Error('Token refresh failed');
    }
  }

  // SIWE Auth Flow Methods
  /**
   * Get nonce for SIWE authentication
   */
  async getNonce(): Promise<NonceResponse> {
    if (!this.httpClient) {
      throw new Error('HTTP client not initialized');
    }

    return this.httpClient.get<NonceResponse>('/auth/nonce');
  }

  /**
   * Verify SIWE message and signature
   */
  async verify(
    message: string,
    signature: string,
    sessionId: string
  ): Promise<AuthTokens> {
    if (!this.httpClient) {
      throw new Error('HTTP client not initialized');
    }

    const response = await this.httpClient.post<{
      token: string;
      refreshToken?: string;
      expiresIn?: number;
    }>('/auth/verify', { message, signature, sessionId });

    const tokens: AuthTokens = {
      accessToken: response.token,
      refreshToken: response.refreshToken,
      expiresAt: response.expiresIn ? Date.now() + response.expiresIn * 1000 : undefined,
    };

    this.setTokens(tokens);
    return tokens;
  }

  // Storage Methods
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.tokens = JSON.parse(stored) as AuthTokens;
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !this.tokens) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tokens));
    } catch {
      // Ignore storage errors
    }
  }

  private clearStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}
