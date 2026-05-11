'use client'

import { useAuth } from '@/hooks/useAuth'
import type { Address, UseWalletAuthReturn } from '@/types/wallet'

/**
 * Compatibility wrapper for legacy wallet auth consumers.
 * WAGDIE SIWE orchestration is centralized in AuthProvider/useAuth.
 */
export function useWalletAuth(): UseWalletAuthReturn {
  const auth = useAuth()

  return {
    address: (auth.address ?? null) as Address | null,
    chainId: 1,
    isConnected: auth.isConnected,
    isConnecting: auth.isConnecting,
    walletStatus: auth.isConnecting
      ? 'connecting'
      : auth.isConnected
      ? 'connected'
      : 'disconnected',
    isAuthenticated: auth.isAuthenticated,
    isAuthenticating: auth.isAuthenticating || auth.isHydrating,
    siweStep: auth.isHydrating ? 'nonce' : auth.siweStep,
    connect: auth.connect,
    disconnect: auth.disconnect,
    authenticate: auth.authenticate,
    error: auth.error,
    clearError: auth.clearError,
  }
}
