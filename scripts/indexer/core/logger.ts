/**
 * Logger interface for consistent logging across indexers
 */
export interface Logger {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
  debug(message: string): void
}

/**
 * Creates a logger with a consistent prefix format
 * @param scope - The indexer or module name to prefix logs with
 */
export function createLogger(scope: string): Logger {
  const prefix = `[${scope}]`
  const timestamp = () => new Date().toISOString()

  return {
    info(message: string): void {
      console.log(`${timestamp()} ${prefix} ${message}`)
    },
    warn(message: string): void {
      console.warn(`${timestamp()} ${prefix} WARN: ${message}`)
    },
    error(message: string): void {
      console.error(`${timestamp()} ${prefix} ERROR: ${message}`)
    },
    debug(message: string): void {
      if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
        console.log(`${timestamp()} ${prefix} DEBUG: ${message}`)
      }
    },
  }
}

/**
 * No-op logger for testing or when logging should be suppressed
 */
export const nullLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}
