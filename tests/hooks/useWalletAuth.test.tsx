import { renderHook } from '@testing-library/react'
import { useWalletAuth } from '@/hooks/useWalletAuth'
import { useAuth } from '@/hooks/useAuth'

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('useWalletAuth compatibility wrapper', () => {
  it('delegates to canonical useAuth state and actions', async () => {
    const disconnect = jest.fn().mockResolvedValue(undefined)
    const authenticate = jest.fn().mockResolvedValue(undefined)

    mockUseAuth.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
      isConnecting: false,
      isAuthenticated: true,
      isAuthenticating: false,
      isHydrating: false,
      hasHydrated: true,
      session: {
        address: '0x1234567890123456789012345678901234567890',
        expires: Date.now() + 60_000,
        selectedCharacter: null,
      },
      siweStep: 'complete',
      error: null,
      connect: jest.fn(),
      disconnect,
      authenticate,
      refreshSession: jest.fn().mockResolvedValue(null),
      clearError: jest.fn(),
    })

    const { result } = renderHook(() => useWalletAuth())

    expect(result.current.address).toBe('0x1234567890123456789012345678901234567890')
    expect(result.current.walletStatus).toBe('connected')
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.siweStep).toBe('complete')

    await result.current.disconnect()
    await result.current.authenticate()

    expect(disconnect).toHaveBeenCalled()
    expect(authenticate).toHaveBeenCalled()
  })
})
