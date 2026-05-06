import { act, renderHook } from '@testing-library/react'

import { useSearing } from '@/hooks/useSearing'
import { useStaking } from '@/hooks/useStaking'
import { SearingService } from '@/lib/services/blockchain/searing'
import { StakingService } from '@/lib/services/blockchain/staking'
import { ContractErrorType, TransactionStatus, type TransactionHash } from '@/types/blockchain'

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  usePublicClient: jest.fn(),
  useWalletClient: jest.fn(),
}))

jest.mock('@/lib/services/blockchain/staking', () => ({
  StakingService: jest.fn(),
}))

jest.mock('@/lib/services/blockchain/searing', () => ({
  SearingService: jest.fn(),
}))

jest.mock('@/lib/store/transactions', () => ({
  useTransactionStore: () => ({
    addTransaction: jest.fn(),
    updateTransaction: jest.fn(),
  }),
}))

jest.mock('@/lib/utils/toast', () => ({
  showTransactionPendingToast: jest.fn(),
  showTransactionSuccessToast: jest.fn(),
  showTransactionErrorToast: jest.fn(),
  showApprovalRequiredToast: jest.fn(),
  showApprovalSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}))

jest.mock('@/lib/utils/errors', () => ({
  logError: jest.fn(),
}))

const wagmi = jest.requireMock('wagmi') as {
  useAccount: jest.Mock
  usePublicClient: jest.Mock
  useWalletClient: jest.Mock
}

const mockFetch = jest.fn()
const address = '0x0000000000000000000000000000000000000001'
const hash = `0x${'1'.repeat(64)}` as TransactionHash

function connectedWallet(chainId = 1) {
  wagmi.useAccount.mockReturnValue({ address, isConnected: true })
  wagmi.usePublicClient.mockReturnValue({ getChainId: jest.fn().mockResolvedValue(chainId) })
  wagmi.useWalletClient.mockReturnValue({ data: { account: { address } } })
}

function disconnectedWallet() {
  wagmi.useAccount.mockReturnValue({ address: undefined, isConnected: false })
  wagmi.usePublicClient.mockReturnValue(undefined)
  wagmi.useWalletClient.mockReturnValue({ data: undefined })
}

function mockStakingService(overrides: Record<string, jest.Mock> = {}) {
  const service = {
    initialize: jest.fn().mockResolvedValue(undefined),
    isStakingEnabled: jest.fn().mockResolvedValue({ data: true }),
    isApprovedForStaking: jest.fn().mockResolvedValue({ data: true }),
    approveForStaking: jest.fn().mockResolvedValue({ hash }),
    stakeWagdies: jest.fn().mockResolvedValue({ hash }),
    unstakeWagdies: jest.fn().mockResolvedValue({ hash }),
    waitForTransactionConfirmation: jest.fn().mockResolvedValue({}),
    ...overrides,
  }

  ;(StakingService as jest.Mock).mockImplementation(() => service)
  return service
}

function mockSearingService(overrides: Record<string, jest.Mock> = {}) {
  const service = {
    initialize: jest.fn().mockResolvedValue(undefined),
    getApprovalStatus: jest.fn().mockResolvedValue({
      data: {
        isWagdieApproved: true,
        isConcordApproved: true,
        isFullyApproved: true,
      },
    }),
    approveForSearing: jest.fn().mockResolvedValue({ hash, hashes: { wagdie: hash } }),
    searConcords: jest.fn().mockResolvedValue({ hash }),
    getConcordBalance: jest.fn(),
    getConcordBalances: jest.fn(),
    waitForTransactionConfirmation: jest.fn().mockResolvedValue({}),
    ...overrides,
  }

  ;(SearingService as jest.Mock).mockImplementation(() => service)
  return service
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = mockFetch as unknown as typeof fetch
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({
      results: [{ tokenId: 7, success: true, locationId: null, chainLocationId: '0' }],
    }),
  })
})

describe('useStaking transaction orchestration', () => {
  it('reports wallet-not-connected without constructing a staking service', async () => {
    disconnectedWallet()
    const { result } = renderHook(() => useStaking())

    await act(async () => {
      await result.current.stakeWagdie(7, 1n)
    })

    expect(result.current.error).toMatchObject({ message: 'Wallet not connected' })
    expect(StakingService).not.toHaveBeenCalled()
  })

  it('keeps approval gating in the hook and does not submit or sync when approval is missing', async () => {
    connectedWallet()
    const service = mockStakingService({
      isApprovedForStaking: jest.fn().mockResolvedValue({ data: false }),
    })
    const { result } = renderHook(() => useStaking())

    await act(async () => {
      await result.current.stakeWagdie(7, 1n)
    })

    expect(service.stakeWagdies).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.txStatus).toBe(TransactionStatus.ERROR)
    expect(result.current.error).toMatchObject({
      type: ContractErrorType.CONTRACT_ERROR,
      message: 'Please approve the staking contract first',
    })
  })

  it('syncs staking state after a successful confirmed stake transaction', async () => {
    connectedWallet()
    const service = mockStakingService()
    const { result } = renderHook(() => useStaking())

    let response!: Awaited<ReturnType<typeof result.current.stakeWagdie>>
    await act(async () => {
      response = await result.current.stakeWagdie(7, 3n)
    })

    expect(service.stakeWagdies).toHaveBeenCalledWith([{ wagdieId: 7, locationId: 3n }], address)
    expect(service.waitForTransactionConfirmation).toHaveBeenCalledWith(hash, undefined)
    expect(mockFetch).toHaveBeenCalledWith('/api/sync/staking', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ tokenIds: [7] }),
    }))
    expect(response.transaction.success).toBe(true)
    expect(response.sync).toMatchObject({ ok: true, retryable: false })
    expect(result.current.txStatus).toBe(TransactionStatus.SUCCESS)
    expect(result.current.txHash).toBe(hash)
  })

  it('passes an optional token ID through approval and records the approval transaction hash', async () => {
    connectedWallet()
    const service = mockStakingService()
    const { result } = renderHook(() => useStaking())

    await act(async () => {
      await result.current.approveForStaking(7n)
    })

    expect(service.approveForStaking).toHaveBeenCalledWith(address, 7n)
    expect(service.waitForTransactionConfirmation).toHaveBeenCalledWith(hash, undefined)
    expect(result.current.txStatus).toBe(TransactionStatus.SUCCESS)
    expect(result.current.txHash).toBe(hash)
  })

  it('syncs staking state after a successful confirmed unstake transaction', async () => {
    connectedWallet()
    const service = mockStakingService()
    const { result } = renderHook(() => useStaking())

    await act(async () => {
      await result.current.unstakeWagdie(7)
    })

    expect(service.unstakeWagdies).toHaveBeenCalledWith([{ wagdieId: 7 }], address)
    expect(mockFetch).toHaveBeenCalledWith('/api/sync/staking', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ tokenIds: [7] }),
    }))
    expect(result.current.txStatus).toBe(TransactionStatus.SUCCESS)
  })

  it('returns contract success separately from a failed post-transaction sync', async () => {
    connectedWallet()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        results: [
          {
            tokenId: 7,
            success: false,
            locationId: null,
            chainLocationId: '3',
            error: 'No location mapping for chain_location_id',
          },
        ],
      }),
    })
    const service = mockStakingService()
    const { result } = renderHook(() => useStaking())

    let response!: Awaited<ReturnType<typeof result.current.stakeWagdie>>
    await act(async () => {
      response = await result.current.stakeWagdie(7, 3n)
    })

    expect(service.stakeWagdies).toHaveBeenCalled()
    expect(result.current.txStatus).toBe(TransactionStatus.SUCCESS)
    expect(result.current.error).toBeNull()
    expect(response.transaction.success).toBe(true)
    expect(response.sync).toMatchObject({
      ok: false,
      retryable: true,
      message: 'Failed to sync staking state for #7: No location mapping for chain_location_id',
    })
  })

  it('blocks stake direct callers on the wrong chain before constructing the staking service', async () => {
    connectedWallet(11155111)
    const service = mockStakingService()
    const { result } = renderHook(() => useStaking())

    let response!: Awaited<ReturnType<typeof result.current.stakeWagdie>>
    await act(async () => {
      response = await result.current.stakeWagdie(7, 3n)
    })

    expect(StakingService).not.toHaveBeenCalled()
    expect(service.stakeWagdies).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.txStatus).toBe(TransactionStatus.ERROR)
    expect(response.transaction).toMatchObject({
      success: false,
      error: { type: ContractErrorType.NETWORK_ERROR },
    })
  })

  it('blocks unstake direct callers on the wrong chain before constructing the staking service', async () => {
    connectedWallet(11155111)
    const service = mockStakingService()
    const { result } = renderHook(() => useStaking())

    let response!: Awaited<ReturnType<typeof result.current.unstakeWagdie>>
    await act(async () => {
      response = await result.current.unstakeWagdie(7)
    })

    expect(StakingService).not.toHaveBeenCalled()
    expect(service.unstakeWagdies).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.txStatus).toBe(TransactionStatus.ERROR)
    expect(response.transaction).toMatchObject({
      success: false,
      error: { type: ContractErrorType.NETWORK_ERROR },
    })
  })

  it('blocks approval direct callers on the wrong chain before constructing the staking service', async () => {
    connectedWallet(11155111)
    const service = mockStakingService()
    const { result } = renderHook(() => useStaking())

    await act(async () => {
      await result.current.approveForStaking(7n)
    })

    expect(StakingService).not.toHaveBeenCalled()
    expect(service.approveForStaking).not.toHaveBeenCalled()
    expect(result.current.txStatus).toBe(TransactionStatus.ERROR)
    expect(result.current.error).toMatchObject({
      type: ContractErrorType.NETWORK_ERROR,
      message: 'Switch to Ethereum Mainnet to stake or unstake',
    })
  })

  it('does not sync staking state when confirmation fails after a submitted hash', async () => {
    connectedWallet()
    mockStakingService({
      waitForTransactionConfirmation: jest.fn().mockResolvedValue({
        error: { type: ContractErrorType.CONTRACT_ERROR, message: 'receipt failed' },
      }),
    })
    const { result } = renderHook(() => useStaking())

    await act(async () => {
      await result.current.stakeWagdie(7, 3n)
    })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.txStatus).toBe(TransactionStatus.ERROR)
    expect(result.current.txHash).toBe(hash)
    expect(result.current.error).toMatchObject({ message: 'receipt failed' })
  })

  it('does not sync staking state when the contract transaction returns an error', async () => {
    connectedWallet()
    mockStakingService({
      stakeWagdies: jest.fn().mockResolvedValue({
        error: { type: ContractErrorType.CONTRACT_ERROR, message: 'reverted' },
      }),
    })
    const { result } = renderHook(() => useStaking())

    await act(async () => {
      await result.current.stakeWagdie(7, 3n)
    })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.txStatus).toBe(TransactionStatus.ERROR)
    expect(result.current.error).toMatchObject({ message: 'reverted' })
  })

  it('does not sync staking state when a transaction submission returns no hash', async () => {
    connectedWallet()
    mockStakingService({
      stakeWagdies: jest.fn().mockResolvedValue({}),
    })
    const { result } = renderHook(() => useStaking())

    await act(async () => {
      await result.current.stakeWagdie(7, 3n)
    })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.txStatus).toBe(TransactionStatus.ERROR)
    expect(result.current.error).toMatchObject({
      message: 'Stake transaction did not return a hash',
    })
  })
})

describe('useSearing transaction orchestration', () => {
  it('returns the stable wallet-not-connected response shape', async () => {
    disconnectedWallet()
    const { result } = renderHook(() => useSearing())

    let response!: Awaited<ReturnType<typeof result.current.searConcords>>
    await act(async () => {
      response = await result.current.searConcords(7, 3)
    })

    expect(response).toMatchObject({
      success: false,
      error: { message: 'Wallet not connected' },
    })
    expect(SearingService).not.toHaveBeenCalled()
  })

  it('keeps dual-approval gating before searing submission', async () => {
    connectedWallet()
    const service = mockSearingService({
      getApprovalStatus: jest.fn().mockResolvedValue({
        data: {
          isWagdieApproved: true,
          isConcordApproved: false,
          isFullyApproved: false,
        },
      }),
    })
    const { result } = renderHook(() => useSearing())

    let response!: Awaited<ReturnType<typeof result.current.searConcords>>
    await act(async () => {
      response = await result.current.searConcords(7, 3)
    })

    expect(service.searConcords).not.toHaveBeenCalled()
    expect(response).toMatchObject({
      success: false,
      error: {
        type: ContractErrorType.CONTRACT_ERROR,
        message: 'Please approve WAGDIE and Concord access for the searing contract first',
      },
    })
    expect(result.current.txStatus).toBe(TransactionStatus.ERROR)
  })

  it('returns a success response with hash after a confirmed searing transaction', async () => {
    connectedWallet()
    const service = mockSearingService()
    const { result } = renderHook(() => useSearing())

    let response!: Awaited<ReturnType<typeof result.current.searConcords>>
    await act(async () => {
      response = await result.current.searConcords(7, 3)
    })

    expect(service.searConcords).toHaveBeenCalledWith([{ wagdieId: 7, concordId: 3 }], address)
    expect(service.waitForTransactionConfirmation).toHaveBeenCalledWith(hash, undefined)
    expect(response).toEqual({ success: true, hash, error: undefined })
    expect(result.current.txHash).toBe(hash)
    expect(result.current.txStatus).toBe(TransactionStatus.SUCCESS)
  })

  it('handles searing approval callbacks and updates approval status', async () => {
    connectedWallet()
    const service = mockSearingService({
      approveForSearing: jest.fn().mockImplementation(async (_owner, options) => {
        await options.onApprovalTransaction('wagdie', hash)
        return { hash, hashes: { wagdie: hash } }
      }),
    })
    const { result } = renderHook(() => useSearing())

    await act(async () => {
      await result.current.approveForSearing()
    })

    expect(service.approveForSearing).toHaveBeenCalledWith(address, expect.objectContaining({
      waitForConfirmation: true,
      onApprovalTransaction: expect.any(Function),
    }))
    expect(result.current.txStatus).toBe(TransactionStatus.SUCCESS)
    expect(result.current.txHash).toBe(hash)
    expect(result.current.approvalStatus).toEqual({
      isWagdieApproved: true,
      isConcordApproved: true,
      isFullyApproved: true,
    })
  })
})
