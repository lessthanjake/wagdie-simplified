'use client'

// useStaking Hook
// React hook for character staking operations

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { ContractError, ContractErrorType, TransactionHash, TransactionStatus, StakingStatus } from '@/types/blockchain'
import { StakeWagdiesParams, UnstakeWagdiesParams } from '@/types/contracts'
import { StakingService } from '@/lib/services/blockchain/staking'
import { STAKING_CHAIN_ERROR, STAKING_CHAIN_ID } from '@/lib/contracts/staking-chain'
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
  createContractError,
  confirmContractTransaction,
  missingTransactionHashError,
  walletNotConnectedError,
  type TransactionExecutionOutcome,
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

export type PostTransactionSyncOutcome = {
  ok: boolean
  message?: string
  results?: SyncStakingApiResult[]
  retryable: boolean
}

export type StakingActionOutcome = {
  transaction: TransactionExecutionOutcome
  sync?: PostTransactionSyncOutcome
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
}): Promise<PostTransactionSyncOutcome> {
  const { tokenId, action } = params

  try {
    const response = await fetch('/api/sync/staking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIds: [tokenId] }),
    })

    let payload: SyncStakingApiResponse | null = null
    let parseMessage: string | null = null
    try {
      payload = (await response.json()) as SyncStakingApiResponse
    } catch (parseError) {
      payload = null
      parseMessage = parseError instanceof Error ? parseError.message : String(parseError)
      console.warn('[useStaking] Failed to parse /api/sync/staking JSON:', {
        tokenId,
        action,
        status: response.status,
        parseError: parseMessage,
      })
    }

    const results = Array.isArray(payload?.results) ? payload!.results : []
    const failedResults = results.filter((r) => !r.success)
    const hasFailure =
      !response.ok ||
      !!payload?.error ||
      failedResults.length > 0 ||
      payload === null

    if (hasFailure) {
      const message = payload === null && parseMessage
        ? `Failed to sync staking state for #${tokenId}: ${parseMessage}`
        : buildSyncFailureMessage({
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

      showErrorToast(
        'Staking Sync Delayed',
        'Transaction confirmed, but map data is still syncing.'
      )
      return {
        ok: false,
        message,
        results,
        retryable: true,
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug('[useStaking] /api/sync/staking succeeded:', { tokenId, action, payload })
    }

    return {
      ok: true,
      results,
      retryable: false,
    }
  } catch (syncError) {
    const message = `Failed to sync staking state for #${tokenId}. Please refresh and try again.`
    console.warn('[useStaking] Failed to sync staking state to DB:', {
      tokenId,
      action,
      error: syncError instanceof Error ? syncError.message : String(syncError),
    })
    showErrorToast(
      'Staking Sync Delayed',
      'Transaction confirmed, but map data is still syncing.'
    )
    logError(syncError, 'syncStakingStateToDb')
    return {
      ok: false,
      message,
      retryable: true,
    }
  }
}

interface UseStakingResult {
  isStaking: boolean
  isUnstaking: boolean
  isApproving: boolean
  error: ContractError | null
  txHash: TransactionHash | null
  txStatus: TransactionStatus
  stakeWagdie: (wagdieId: number, locationId: bigint) => Promise<StakingActionOutcome>
  unstakeWagdie: (wagdieId: number) => Promise<StakingActionOutcome>
  checkApproval: (tokenId?: bigint) => Promise<boolean>
  approveForStaking: (tokenId?: bigint) => Promise<void>
  syncStakingState: (
    tokenId: number,
    action?: 'stake' | 'unstake'
  ) => Promise<PostTransactionSyncOutcome>
}

type StakingOperation = 'approve' | 'stake' | 'unstake'

export function useStaking(): UseStakingResult {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [localError, setLocalError] = useState<ContractError | null>(null)
  const [localStatus, setLocalStatus] = useState<TransactionStatus>(TransactionStatus.IDLE)
  const [activeOperation, setActiveOperation] = useState<StakingOperation>('stake')
  const [preparingOperation, setPreparingOperation] = useState<StakingOperation | null>(null)

  const { addTransaction, updateTransaction } = useTransactionStore()

  const resetForOperation = (
    operation: StakingOperation,
    resetTransaction: () => void
  ) => {
    resetTransaction()
    setActiveOperation(operation)
    setLocalError(null)
    setLocalStatus(TransactionStatus.IDLE)
  }

  const setWalletError = (): ContractError => {
    const err = walletNotConnectedError()
    setLocalError(err)
    return err
  }

  const buildFailureOutcome = (
    txId: string,
    error: ContractError
  ): StakingActionOutcome => ({
    transaction: {
      success: false,
      txId,
      error,
    },
  })

  const setWrongChainError = (): ContractError => {
    const err = createContractError(
      ContractErrorType.NETWORK_ERROR,
      STAKING_CHAIN_ERROR
    )
    setLocalError(err)
    setLocalStatus(TransactionStatus.ERROR)
    showTransactionErrorToast(err)
    return err
  }

  const ensureStakingChain = async (): Promise<ContractError | null> => {
    if (!publicClient) return setWalletError()

    try {
      const chainId = await publicClient.getChainId()
      return chainId === STAKING_CHAIN_ID ? null : setWrongChainError()
    } catch (err) {
      const error = createContractError(
        ContractErrorType.NETWORK_ERROR,
        'Unable to verify wallet network',
        err
      )
      setLocalError(error)
      setLocalStatus(TransactionStatus.ERROR)
      showTransactionErrorToast(error)
      return error
    }
  }

  const createService = async (): Promise<StakingService | null> => {
    if (!publicClient) return null

    const service = new StakingService({ publicClient, walletClient })
    await service.initialize()
    return service
  }

  const createWritableService = async (): Promise<StakingService | null> => {
    if (!address || !publicClient || !walletClient) return null
    return createService()
  }

  const runPreparedStakingOperation = async (params: {
    operation: Extract<StakingOperation, 'stake' | 'unstake'>
    tokenId: number
    action: 'stake' | 'unstake'
    failureMessage: string
    execute: (service: StakingService) => Promise<TransactionExecutionOutcome>
  }): Promise<StakingActionOutcome> => {
    const { operation, tokenId, action, failureMessage, execute } = params

    setLocalStatus(TransactionStatus.PENDING)
    setPreparingOperation(operation)

    try {
      const service = await createWritableService()
      if (!service) {
        const err = setWalletError()
        setLocalStatus(TransactionStatus.ERROR)
        return buildFailureOutcome('wallet-not-connected', err)
      }

      const outcome = await execute(service)
      let sync: PostTransactionSyncOutcome | undefined

      if (outcome.success && !outcome.superseded) {
        sync = await syncStakingStateToDb({ tokenId, action })
        updateTransaction(outcome.txId, {
          metadata: {
            postTxSync: {
              status: sync.ok ? 'success' : 'failed',
              ...(sync.message ? { error: sync.message } : {}),
            },
          },
        })
      }

      return {
        transaction: outcome,
        ...(sync ? { sync } : {}),
      }
    } catch (err) {
      const error = createContractError(
        ContractErrorType.UNKNOWN,
        failureMessage,
        err
      )
      setLocalError(error)
      setLocalStatus(TransactionStatus.ERROR)
      showTransactionErrorToast(error)
      logError(err, `${action}Wagdie`)
      return buildFailureOutcome(`${action}-exception`, error)
    } finally {
      setPreparingOperation(null)
    }
  }

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
        const service = await createService()
        if (!service) return false

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
    resetForOperation('approve', approvalTx.reset)

    if (!address || !publicClient || !walletClient) {
      setWalletError()
      return
    }

    const chainError = await ensureStakingChain()
    if (chainError) return

    await approvalTx.execute(
      {
        address,
        tokenId: tokenId?.toString() ?? 'all',
      },
      async (_params, context) => {
        const service = await createWritableService()
        if (!service) {
          return { error: walletNotConnectedError() }
        }

        return confirmContractTransaction({
          transaction: () => service.approveForStaking(address, tokenId),
          service,
          context,
          missingHashError: missingTransactionHashError('Staking approval'),
        })
      }
    )
  }

  const stakeWagdie = async (
    wagdieId: number,
    locationId: bigint
  ): Promise<StakingActionOutcome> => {
    resetForOperation('stake', stakeTx.reset)

    if (!address || !publicClient || !walletClient) {
      const err = setWalletError()
      return buildFailureOutcome('wallet-not-connected', err)
    }

    const chainError = await ensureStakingChain()
    if (chainError) return buildFailureOutcome('wrong-chain', chainError)

    return runPreparedStakingOperation({
      operation: 'stake',
      tokenId: wagdieId,
      action: 'stake',
      failureMessage: 'Failed to stake character',
      execute: async (service) => {
        if (locationId <= 0n) {
          const err = createContractError(
            ContractErrorType.INVALID_PARAMS,
            'Invalid location ID'
          )
          setLocalError(err)
          setLocalStatus(TransactionStatus.ERROR)
          return { success: false, txId: 'invalid-location', error: err }
        }

        const stakingEnabled = await service.isStakingEnabled()
        if (stakingEnabled.error) {
          setLocalError(stakingEnabled.error)
          setLocalStatus(TransactionStatus.ERROR)
          showTransactionErrorToast(stakingEnabled.error)
          return {
            success: false,
            txId: 'staking-enabled-check',
            error: stakingEnabled.error,
          }
        }

        if (!stakingEnabled.data) {
          const err = createContractError(
            ContractErrorType.CONTRACT_ERROR,
            'Staking is currently disabled'
          )
          setLocalError(err)
          setLocalStatus(TransactionStatus.ERROR)
          showErrorToast('Staking Disabled', 'Staking is currently disabled on the contract')
          return { success: false, txId: 'staking-disabled', error: err }
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
          const err = createContractError(
            ContractErrorType.CONTRACT_ERROR,
            'Please approve the staking contract first'
          )
          setLocalError(err)
          showApprovalRequiredToast('Staking Contract')
          setLocalStatus(TransactionStatus.ERROR)
          return { success: false, txId: 'staking-approval-required', error: err }
        }

        const params: StakeWagdiesParams[] = [{ wagdieId, locationId }]
        return stakeTx.execute({ wagdieId, locationId }, async (_params, context) => {
          return confirmContractTransaction({
            transaction: () => service.stakeWagdies(params, address),
            service,
            context,
            missingHashError: missingTransactionHashError('Stake'),
          })
        })
      },
    })
  }

  const unstakeWagdie = async (wagdieId: number): Promise<StakingActionOutcome> => {
    resetForOperation('unstake', unstakeTx.reset)

    if (!address || !publicClient || !walletClient) {
      const err = setWalletError()
      return buildFailureOutcome('wallet-not-connected', err)
    }

    const chainError = await ensureStakingChain()
    if (chainError) return buildFailureOutcome('wrong-chain', chainError)

    return runPreparedStakingOperation({
      operation: 'unstake',
      tokenId: wagdieId,
      action: 'unstake',
      failureMessage: 'Failed to unstake character',
      execute: async (service) => {
        if (process.env.NODE_ENV === 'development') {
          const chainId = await publicClient.getChainId()
          console.debug('[useStaking] unstakeWagdie', {
            wagdieId,
            chainId,
            address,
          })
        }

        const params: UnstakeWagdiesParams[] = [{ wagdieId }]
        return unstakeTx.execute({ wagdieId }, async (_params, context) => {
          return confirmContractTransaction({
            transaction: () => service.unstakeWagdies(params, address),
            service,
            context,
            missingHashError: missingTransactionHashError('Unstake'),
          })
        })
      },
    })
  }

  const syncStakingState = async (
    tokenId: number,
    action: 'stake' | 'unstake' = 'stake'
  ): Promise<PostTransactionSyncOutcome> => syncStakingStateToDb({ tokenId, action })

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
    syncStakingState,
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
      const error = createContractError(
        ContractErrorType.UNKNOWN,
        'Failed to fetch staking status',
        err
      )
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
