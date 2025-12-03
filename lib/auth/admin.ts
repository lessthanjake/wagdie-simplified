/**
 * Admin Configuration
 * Defines admin wallet addresses that can edit any character
 */

// Admin wallet addresses (case-insensitive)
export const ADMIN_WALLETS = [
  '0x5a7F5938deA6238137043415e28efd99A6532dD3',
] as const

/**
 * Check if a wallet address is an admin
 * @param address - The wallet address to check
 * @returns true if the address is an admin
 */
export function isAdmin(address: string | null | undefined): boolean {
  if (!address) return false
  const normalizedAddress = address.toLowerCase()
  return ADMIN_WALLETS.some(
    (adminAddress) => adminAddress.toLowerCase() === normalizedAddress
  )
}
