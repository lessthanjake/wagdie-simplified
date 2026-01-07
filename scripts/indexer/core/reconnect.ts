import type { Logger } from './logger'
import { createLogger } from './logger'

/**
 * Options for creating a reconnect controller
 */
export interface ReconnectOptions {
  baseDelayMs: number
  maxDelayMs: number
  logger?: Logger
}

/**
 * Controller for managing WebSocket reconnection with exponential backoff
 */
export interface ReconnectController {
  /** Schedule a reconnection attempt */
  schedule(reason: string, start: () => void): void
  /** Reset the attempt counter (call after successful connection) */
  reset(): void
  /** Clear any pending reconnection timer */
  clear(): void
  /** Get the current attempt count */
  getAttempts(): number
}

/**
 * Calculate exponential backoff delay
 * @param baseDelayMs - Base delay in milliseconds
 * @param maxDelayMs - Maximum delay cap
 * @param attempt - Current attempt number (0-based)
 */
export function backoffDelay(baseDelayMs: number, maxDelayMs: number, attempt: number): number {
  const exponential = baseDelayMs * Math.pow(2, attempt)
  return Math.min(exponential, maxDelayMs)
}

/**
 * Create a reconnect controller with exponential backoff
 */
export function createReconnectController(options: ReconnectOptions): ReconnectController {
  const { baseDelayMs, maxDelayMs } = options
  const logger = options.logger ?? createLogger('reconnect')

  let attempts = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  function schedule(reason: string, start: () => void): void {
    // Clear any existing timer
    clear()

    const delayMs = backoffDelay(baseDelayMs, maxDelayMs, attempts)
    attempts++

    logger.warn(`${reason}. Reconnecting in ${(delayMs / 1000).toFixed(1)}s (attempt ${attempts})`)

    timer = setTimeout(() => {
      timer = null
      start()
    }, delayMs)
  }

  /**
   * Reset the attempt counter (call after successful connection)
   */
  function reset(): void {
    attempts = 0
    logger.debug('Reconnect counter reset')
  }

  /**
   * Clear any pending reconnection timer
   */
  function clear(): void {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  /**
   * Get the current attempt count
   */
  function getAttempts(): number {
    return attempts
  }

  return {
    schedule,
    reset,
    clear,
    getAttempts,
  }
}
