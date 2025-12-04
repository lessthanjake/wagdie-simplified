import type { RetryConfig } from '../types/index.js';
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
export declare class HttpClient {
    private readonly baseUrl;
    private readonly timeout;
    private readonly retryConfig;
    private getAuthHeader;
    constructor(config: HttpClientConfig);
    setAuthHeaderProvider(provider: () => string | null): void;
    request<T>(path: string, options?: RequestOptions): Promise<T>;
    private fetchWithTimeout;
    private handleResponse;
    private safeParseJSON;
    private shouldRetry;
    private calculateDelay;
    private sleep;
    get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T>;
    post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T>;
    put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T>;
    patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T>;
    delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T>;
}
