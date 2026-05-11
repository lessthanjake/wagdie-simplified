/**
 * useAuth Hook
 * Application layer - Authentication state and SIWE flow facade
 */

'use client'

import { useAuthContext } from '@/contexts/AuthContext'
import type { UserSession, WalletAuthError, SIWEStep } from '@/types/wallet'

export interface UseAuthReturn {
  address: string | undefined
  isConnected: boolean
  isConnecting: boolean
  isAuthenticated: boolean
  isAuthenticating: boolean
  isHydrating: boolean
  hasHydrated: boolean
  session: Pick<UserSession, 'address' | 'expires' | 'selectedCharacter'> | null
  siweStep: SIWEStep
  error: WalletAuthError | null
  connect: () => void
  disconnect: () => Promise<void>
  authenticate: (options?: { force?: boolean }) => Promise<void>
  refreshSession: () => Promise<Pick<UserSession, 'address' | 'expires' | 'selectedCharacter'> | null>
  clearError: () => void
}

/**
 * Custom hook for wallet authentication with SIWE.
 * Shared auth state and SIWE orchestration live in AuthProvider.
 */
export function useAuth(): UseAuthReturn {
  return useAuthContext()
}
