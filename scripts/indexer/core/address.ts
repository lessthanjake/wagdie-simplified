import type { Address } from './types'

/**
 * Well-known zero address (burn address for ERC721)
 */
export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000'

/**
 * Alternative dead address used for burns
 */
export const DEAD_ADDRESS: Address = '0x000000000000000000000000000000000000dead'

/**
 * Normalize an address to lowercase 0x-prefixed format
 * @param value - Address string to normalize
 * @returns Normalized address or null if invalid
 */
export function normalizeAddress(value: string | undefined | null): Address | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  if (!/^0x[a-f0-9]{40}$/i.test(trimmed)) return null
  return trimmed as Address
}

/**
 * Compare two addresses for equality (case-insensitive)
 * @param a - First address
 * @param b - Second address
 */
export function isSameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Check if an address is a burn address (zero or dead)
 * @param address - Address to check
 */
export function isBurnAddress(address: string): boolean {
  const normalized = address.toLowerCase()
  return normalized === ZERO_ADDRESS || normalized === DEAD_ADDRESS
}

/**
 * Check if an address is the zero address
 * @param address - Address to check
 */
export function isZeroAddress(address: string): boolean {
  return address.toLowerCase() === ZERO_ADDRESS
}

/**
 * Normalize a token ID from various input types
 * @param value - Token ID value (bigint, number, or string)
 * @returns Normalized number or null if invalid
 */
export function normalizeTokenId(value: unknown): number | null {
  if (value === null || value === undefined) return null
  
  if (typeof value === 'bigint') {
    return Number(value)
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? null : value
  }
  
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? null : parsed
  }
  
  return null
}
