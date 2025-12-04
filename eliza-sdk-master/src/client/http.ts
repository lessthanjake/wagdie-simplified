import type { RetryConfig } from '../types/index.js';
import { ElizaAPIError } from '../errors/ElizaAPIError.js';
import { ElizaAuthError } from '../errors/ElizaAuthError.js';
import { ElizaRateLimitError } from '../errors/ElizaRateLimitError.js';
import { ElizaNetworkError } from '../errors/ElizaNetworkError.js';

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  retryServerErrors: true,
};

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  retry?: Partial<RetryConfig>;
  getAuthHeader?: () => string | null;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  skipRetry?: boolean;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retryConfig: RetryConfig;
  private getAuthHeader: () => string | null;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };
    this.getAuthHeader = config.getAuthHeader ?? (() => null);
  }

  setAuthHeaderProvider(provider: () => string | null): void {
    this.getAuthHeader = provider;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, body, timeout, skipRetry = false } = options;

    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };

    const authHeader = this.getAuthHeader();
    if (authHeader) {
      requestHeaders['Authorization'] = authHeader;
    }

    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    };

    const requestTimeout = timeout ?? this.timeout;
    let lastError: Error | undefined;

    const maxAttempts = skipRetry ? 1 : this.retryConfig.maxRetries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, requestInit, requestTimeout);
        return await this.handleResponse<T>(response);
      } catch (error) {
        lastError = error as Error;

        // Don't retry non-retryable errors
        if (!this.shouldRetry(error as Error, attempt)) {
          throw error;
        }

        // Wait before retrying
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ElizaNetworkError('Request timed out');
      }
      throw new ElizaNetworkError(
        'Network request failed',
        error instanceof Error ? error : undefined
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle rate limiting
    if (response.status === 429) {
      throw ElizaRateLimitError.fromHeaders(response.headers);
    }

    // Handle auth errors
    if (response.status === 401) {
      const body = await this.safeParseJSON(response);
      throw new ElizaAuthError(body?.message || 'Authentication failed');
    }

    // Handle other errors
    if (!response.ok) {
      const body = await this.safeParseJSON(response);
      throw ElizaAPIError.fromResponse(response.status, body ?? undefined);
    }

    // Handle empty responses
    const contentType = response.headers.get('Content-Type');
    if (response.status === 204 || !contentType?.includes('application/json')) {
      return {} as T;
    }

    try {
      return await response.json() as T;
    } catch {
      throw new ElizaAPIError('Invalid JSON response', response.status);
    }
  }

  private async safeParseJSON(
    response: Response
  ): Promise<{ error?: string; message?: string; details?: Record<string, unknown> } | null> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    // Check if error is retryable
    if ('isRetryable' in error && typeof error.isRetryable === 'boolean') {
      // Special handling for rate limits - use their retry-after if available
      if (error instanceof ElizaRateLimitError && error.retryAfter) {
        return true;
      }

      // Respect server error retry config
      if (error instanceof ElizaAPIError && error.statusCode >= 500) {
        return this.retryConfig.retryServerErrors;
      }

      return error.isRetryable;
    }

    // Network errors are always retryable
    if (error instanceof ElizaNetworkError) {
      return true;
    }

    return false;
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Convenience methods
  async get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  async put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  async patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  async delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
