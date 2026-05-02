'use client'

// useStaking Hook
// React hook for character staking operations

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { ContractError, ContractErrorType, TransactionHash, TransactionStatus, StakingStatus } from '@/types/blockchain'
import { StakeWagdiesParams, UnstakeWagdiesParams } from '@/types/contracts'
import { StakingService } from '@/lib/services/blockchain/staking'
import { logError } from '@/lib/utils/errors'
import { useTransactionStore } from '@/lib/store/transactions'
import {
  showTransactionPendingToast,
  showTransactionSuccessToast,
  showTransactionErrorToast,
  showApprovalRequiredToast,
  showApprovalSuccessToast,
  showErrorToast,
} from '@/lib/utils/toast'
import {
  confirmContractTransaction,
  useBlockchainTransaction,
} from './useBlockchainTransaction'

type SyncStakingApiResult = {
  tokenId: number
  success: boolean
  locationId: string | null
  chainLocationId: string
  error?: string
}

type SyncStakingApiResponse = {
  results: SyncStakingApiResult[]
  error?: string
}

function buildSyncFailureMessage(params: {
  tokenId: number
  responseOk: boolean
  status: number
  payload: SyncStakingApiResponse | null
}): string {
  const { tokenId, responseOk, status, payload } = params

  if (!responseOk) {
    const serverMessage =
      payload && typeof payload.error === 'string' && payload.error.trim().length > 0
        ? payload.error.trim()
        : `Request failed (${status})`
    return `Failed to sync staking state for #${tokenId}: ${serverMessage}`
  }

  if (payload?.error && payload.error.trim().length > 0) {
    return `Failed to sync staking state for #${tokenId}: ${payload.error.trim()}`
  }

  const results = Array.isArray(payload?.results) ? payload!.results : []
  const failed = results.filter((r) => !r.success)

  if (failed.length > 0) {
    const first = failed[0]
    const reason =
      typeof first?.error === 'string' && first.error.trim().length > 0
        ? first.error.trim()
        : 'Unknown error'
    return `Failed to sync staking state for #${tokenId}: ${reason}`
  }

  return `Failed to sync staking state for #${tokenId}`
}

async function syncStakingStateToDb(params: {
  tokenId: number
  action: 'stake' | 'unstake'
}): Promise<void> {
  const { tokenId, action } = params

  try {
    const response = await fetch('/api/sync/staking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIds: [tokenId] }),
    })

    let payload: SyncStakingApiResponse | null = null
    try {
      payload = (await response.json()) as SyncStakingApiResponse
    } catch (parseError) {
      payload = null
      console.warn('[useStaking] Failed to parse /api/sync/staking JSON:', {
        tokenId,
        action,
        status: response.status,
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
      })
    }

    const results = Array.isArray(payload?.results) ? payload!.results : []
    const failedResults = results.filter((r) => !r.success)
    const hasFailure = !response.ok || !!payload?.error || failedResults.length > 0

    if (hasFailure) {
      const message = buildSyncFailureMessage({
        tokenId,
        responseOk: response.ok,
        status: response.status,
        payload,
      })

      console.warn('[useStaking] /api/sync/staking failed:', {
        tokenId,
        action,
        status: response.status,
        ok: response.ok,
        payload,
      })

      showErrorToast('Staking Sync Failed', message)
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug('[useStaking] /api/sync/staking succeeded:', { tokenId, action, payload })
    }
  } catch (syncError) {
    console.warn('[useStaking] Failed to sync staking state to DB:', {
      tokenId,
      action,
      error: syncError instanceof Error ? syncError.message : String(syncError),
    })
    showErrorToast(
      'Staking Sync Failed',
      `Failed to sync staking state for #${tokenId}. Please refresh and try again.`
    )
    logError(syncError, 'syncStakingStateToDb')
  }
}

interface UseStakingResult {
  isStaking: boolean
  isUnstaking: boolean
  isApproving: boolean
  error: ContractError | null
  txHash: TransactionHash | null
  txStatus: TransactionStatus
  stakeWagdie: (wagdieId: number, locationId: bigint) => Promise<void>
  unstakeWagdie: (wagdieId: number) => Promise<void>
  checkApproval: (tokenId?: bigint) => Promise<boolean>
  approveForStaking: (tokenId?: bigint) => Promise<void>
}

type StakingOperation = 'approve' | 'stake' | 'unstake'

function missingTransactionHashError(action: string): ContractError {
  return {
    type: ContractErrorType.UNKNOWN,
    message: `${action} transaction did not return a hash`,
  }
}

export function useStaking(): UseStakingResult {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [localError, setLocalError] = useState<ContractError | null>(null)
  const [localStatus, setLocalStatus] = useState<TransactionStatus>(TransactionStatus.IDLE)
  const [activeOperation, setActiveOperation] = useState<StakingOperation>('stake')
  const [preparingOperation, setPreparingOperation] = useState<StakingOperation | null>(null)

  const { addTransaction, updateTransaction } = useTransactionStore()

  const approvalTx = useBlockchainTransaction({
    transactionType: 'approve-staking',
    onPending: () => {
      showApprovalRequiredToast('Staking Contract')
    },
    onSubmitted: (hash) => {
      showTransactionPendingToast(hash)
    },
    onSuccess: () => {
      showApprovalSuccessToast('Staking Contract')
    },
    onError: (error) => {
      showTransactionErrorToast(error)
      logError(error, 'approveForStaking')
    },
    addTransaction,
    updateTransaction,
  })

  const stakeTx = useBlockchainTransaction({
    transactionType: 'stake-wagdie',
    onSubmitted: (hash) => {
      showTransactionPendingToast(hash)
    },
    onSuccess: (hash) => {
      showTransactionSuccessToast(hash, 'Character staked successfully!')
    },
    onError: (error) => {
      showTransactionErrorToast(error)
      logError(error, 'stakeWagdie')
    },
    addTransaction,
    updateTransaction,
  })

  const unstakeTx = useBlockchainTransaction({
    transactionType: 'unstake-wagdie',
    onSubmitted: (hash) => {
      showTransactionPendingToast(hash)
    },
    onSuccess: (hash) => {
      showTransactionSuccessToast(hash, 'Character unstaked successfully!')
    },
    onError: (error) => {
      showTransactionErrorToast(error)
      logError(error, 'unstakeWagdie')
    },
    addTransaction,
    updateTransaction,
  })

  const checkApproval = async (tokenId?: bigint): Promise<boolean> => {
    if (!address || !publicClient) return false

    const maxRetries = 3
    const baseDelay = 1000 // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const service = new StakingService({ publicClient, walletClient })
        await service.initialize()

        // Prefer operator approval (setApprovalForAll) for "approve once, stake many"
        const operatorApproval = await service.isApprovedForStaking(address)
        if (operatorApproval.data) return true

        // If operator approval is not set, optionally fall back to per-token approval
        if (tokenId) {
          const tokenApproval = await service.isApprovedForStaking(address, tokenId)
          return tokenApproval.data ?? false
        }

        return false
      } catch (err) {
        const isLastAttempt = attempt === maxRetries - 1
        const errorMessage = err instanceof Error ? err.message : String(err)

        // Log with attempt info
        console.warn(
          `[checkApproval] Attempt ${attempt + 1}/${maxRetries} failed:`,
          errorMessage
        )

        if (isLastAttempt) {
          logError(err, 'checkApproval')
          return false
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return false
  }

  const approveForStaking = async (tokenId?: bigint): Promise<void> => {
    approvalTx.reset()
    setActiveOperation('approve')
    setLocalError(null)
    setLocalStatus(TransactionStatus.IDLE)

    if (!address || !publicClient || !walletClient) {
      const err: ContractError = {
        type: ContractErrorType.UNKNOWN,
        message: 'Wallet not connected',
      }
      setLocalError(err)
      return
    }

    await approvalTx.execute(
      {
        address,
        tokenId: tokenId?.toString() ?? 'all',
      },
      async (_params, context) => {
        const service = new StakingService({ publicClient, walletClient })
        await service.initialize()

        return confirmContractTransaction({
          transaction: () => service.approveForStaking(address, tokenId),
          service,
          context,
          missingHashError: missingTransactionHashError('Staking approval'),
        })
      }
    )
  }

  const stakeWagdie = async (wagdieId: number, locationId: bigint): Promise<void> => {
    stakeTx.reset()
    setActiveOperation('stake')
    setLocalError(null)
    setLocalStatus(TransactionStatus.IDLE)

    if (!address || !publicClient || !walletClient) {
      const err: ContractError = {
        type: ContractErrorType.UNKNOWN,
        message: 'Wallet not connected',
      }
      setLocalError(err)
      return
    }

    setLocalStatus(TransactionStatus.PENDING)
    setPreparingOperation('stake')

    try {
      const service = new StakingService({ publicClient, walletClient })
      await service.initialize()

      if (locationId <= 0n) {
        const err: ContractError = {
          type: ContractErrorType.INVALID_PARAMS,
          message: 'Invalid location ID',
        }
        setLocalError(err)
        setLocalStatus(TransactionStatus.ERROR)
        return
      }

      const stakingEnabled = await service.isStakingEnabled()
      if (stakingEnabled.error) {
        setLocalError(stakingEnabled.error)
        setLocalStatus(TransactionStatus.ERROR)
        showTransactionErrorToast(stakingEnabled.error)
        return
      }

      if (!stakingEnabled.data) {
        const err: ContractError = {
          type: ContractErrorType.CONTRACT_ERROR,
          message: 'Staking is currently disabled',
        }
        setLocalError(err)
        setLocalStatus(TransactionStatus.ERROR)
        showErrorToast('Staking Disabled', 'Staking is currently disabled on the contract')
        return
      }

      // Check if approved
      const isApproved = await checkApproval(BigInt(wagdieId))

      if (process.env.NODE_ENV === 'development') {
        const chainId = await publicClient.getChainId()
        console.debug('[useStaking] stakeWagdie', {
          wagdieId,
          locationId,
          locationIdString: locationId.toString(),
          chainId,
          address,
          isApproved,
        })
      }

      if (!isApproved) {
        const err: ContractError = {
          type: ContractErrorType.CONTRACT_ERROR,
          message: 'Please approve the staking contract first',
        }
        setLocalError(err)
        showApprovalRequiredToast('Staking Contract')
        setLocalStatus(TransactionStatus.ERROR)
        return
      }

      const params: StakeWagdiesParams[] = [{ wagdieId, locationId }]
      const outcome = await stakeTx.execute({ wagdieId, locationId }, async (_params, context) => {
        return confirmContractTransaction({
          transaction: () => service.stakeWagdies(params, address),
          service,
          context,
          missingHashError: missingTransactionHashError('Stake'),
        })
      })

      if (outcome.success && !outcome.superseded) {
        await syncStakingStateToDb({ tokenId: wagdieId, action: 'stake' })
      }
    } catch (err) {
      const error: ContractError = {
        type: ContractErrorType.UNKNOWN,
        message: 'Failed to stake character',
        originalError: err instanceof Error ? err : undefined,
      }
      setLocalError(error)
      setLocalStatus(TransactionStatus.ERROR)
      showTransactionErrorToast(error)
      logError(err, 'stakeWagdie')
    } finally {
      setPreparingOperation(null)
    }
  }

  const unstakeWagdie = async (wagdieId: number): Promise<void> => {
    unstakeTx.reset()
    setActiveOperation('unstake')
    setLocalError(null)
    setLocalStatus(TransactionStatus.IDLE)

    if (!address || !publicClient || !walletClient) {
      const err: ContractError = {
        type: ContractErrorType.UNKNOWN,
        message: 'Wallet not connected',
      }
      setLocalError(err)
      return
    }

    setLocalStatus(TransactionStatus.PENDING)
    setPreparingOperation('unstake')

    try {
      const service = new StakingService({ publicClient, walletClient })
      await service.initialize()

      if (process.env.NODE_ENV === 'development') {
        const chainId = await publicClient.getChainId()
        console.debug('[useStaking] unstakeWagdie', {
          wagdieId,
          chainId,
          address,
        })
      }

      const params: UnstakeWagdiesParams[] = [{ wagdieId }]
      const outcome = await unstakeTx.execute({ wagdieId }, async (_params, context) => {
        return confirmContractTransaction({
          transaction: () => service.unstakeWagdies(params, address),
          service,
          context,
          missingHashError: missingTransactionHashError('Unstake'),
        })
      })

      if (outcome.success && !outcome.superseded) {
        await syncStakingStateToDb({ tokenId: wagdieId, action: 'unstake' })
      }
    } catch (err) {
      const error: ContractError = {
        type: ContractErrorType.UNKNOWN,
        message: 'Failed to unstake character',
        originalError: err instanceof Error ? err : undefined,
      }
      setLocalError(error)
      setLocalStatus(TransactionStatus.ERROR)
      showTransactionErrorToast(error)
      logError(err, 'unstakeWagdie')
    } finally {
      setPreparingOperation(null)
    }
  }

  const activeTx =
    activeOperation === 'approve'
      ? approvalTx
      : activeOperation === 'unstake'
        ? unstakeTx
        : stakeTx
  const txStatus = activeTx.status !== TransactionStatus.IDLE ? activeTx.status : localStatus

  return {
    isStaking: stakeTx.isExecuting || preparingOperation === 'stake',
    isUnstaking: unstakeTx.isExecuting || preparingOperation === 'unstake',
    isApproving: approvalTx.isExecuting,
    error: localError || activeTx.error,
    txHash: activeTx.txHash,
    txStatus,
    stakeWagdie,
    unstakeWagdie,
    checkApproval,
    approveForStaking,
  }
}

// Hook for checking staking status
export function useStakingStatus(wagdieId: number | null) {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [status, setStatus] = useState<StakingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ContractError | null>(null)

  const fetchStatus = async () => {
    if (!wagdieId || !publicClient) {
      setStatus(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const service = new StakingService({ publicClient, walletClient })
      await service.initialize()

      const result = await service.getStakingStatus(wagdieId)

      if (result.error) {
        setError(result.error)
        setStatus(null)
      } else if (result.data) {
        setStatus(result.data)
      }
    } catch (err) {
      const error: ContractError = {
        type: ContractErrorType.UNKNOWN,
        message: 'Failed to fetch staking status',
        originalError: err instanceof Error ? err : undefined,
      }
      setError(error)
      logError(err, 'useStakingStatus')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wagdieId, publicClient])

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
  }
}
