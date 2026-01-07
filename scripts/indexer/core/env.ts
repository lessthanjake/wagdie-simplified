/**
 * Parse an environment variable as a number with fallback
 * @param name - Environment variable name
 * @param fallback - Default value if not set or invalid
 */
export function parseEnvNumber(name: string, fallback: number): number {
  const value = process.env[name]
  if (!value) return fallback
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Parse an environment variable as a bigint with fallback
 * @param name - Environment variable name
 * @param fallback - Default value if not set or invalid
 */
export function parseEnvBigInt(name: string, fallback: bigint): bigint {
  const value = process.env[name]
  if (!value) return fallback
  try {
    return BigInt(value)
  } catch {
    return fallback
  }
}

/**
 * Get a required environment variable or throw
 * @param name - Environment variable name
 * @throws Error if the variable is not set
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`)
  }
  return value
}

/**
 * Get an optional environment variable
 * @param name - Environment variable name
 * @returns The value or undefined if not set
 */
export function optionalEnv(name: string): string | undefined {
  return process.env[name]
}

/**
 * Get an environment variable with a default value
 * @param name - Environment variable name
 * @param defaultValue - Default value if not set
 */
export function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue
}

/**
 * Parse an integer from a string, supporting both decimal and hex formats
 * @param val - String value to parse
 */
export function parseIntAuto(val: string): number {
  return val.startsWith('0x') ? parseInt(val, 16) : parseInt(val, 10)
}

/**
 * Simple delay function
 * @param ms - Milliseconds to wait
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
