'use client'

// useSearing Hook
// React hook for character searing operations

import { useState } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { ContractError, ContractErrorType, TransactionHash, TransactionStatus } from '@/types/blockchain'
import { SearConcordsParams } from '@/types/contracts'
import {
  SearingApprovalStatus,
  SearingConcordBalance,
  SearingService,
  SearingStatus,
} from '@/lib/services/blockchain/searing'
import { logError } from '@/lib/utils/errors'
import { useTransactionStore } from '@/lib/store/transactions'
import {
  showTransactionPendingToast,
  showTransactionSuccessToast,
  showTransactionErrorToast,
  showApprovalRequiredToast,
  showApprovalSuccessToast,
} from '@/lib/utils/toast'
import {
  createContractError,
  confirmContractTransaction,
  missingTransactionHashError,
  walletNotConnectedError,
  useBlockchainTransaction,
} from './useBlockchainTransaction'

const defaultApprovalStatus: SearingApprovalStatus = {
  isWagdieApproved: false,
  isConcordApproved: false,
  isFullyApproved: false,
}

export interface SearingTransactionResult {
  success: boolean
  hash?: TransactionHash
  error?: ContractError
}

interface UseSearingResult {
  isSearing: boolean
  isApproving: boolean
  error: ContractError | null
  txHash: TransactionHash | null
  txStatus: TransactionStatus
  approvalStatus: SearingApprovalStatus | null
  searConcords: (wagdieId: number, concordId: number) => Promise<SearingTransactionResult>
  checkApproval: () => Promise<boolean>
  checkApprovalStatus: () => Promise<SearingApprovalStatus>
  approveForSearing: () => Promise<void>
  getConcordBalance: (concordId: number) => Promise<SearingConcordBalance | null>
  getConcordBalances: (concordIds: number[]) => Promise<SearingConcordBalance[]>
}

type SearingOperation = 'approve' | 'sear'

export function useSearing(): UseSearingResult {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [localError, setLocalError] = useState<ContractError | null>(null)
  const [localStatus, setLocalStatus] = useState<TransactionStatus>(TransactionStatus.IDLE)
  const [activeOperation, setActiveOperation] = useState<SearingOperation>('sear')
  const [preparingOperation, setPreparingOperation] = useState<SearingOperation | null>(null)
  const [approvalStatus, setApprovalStatus] = useState<SearingApprovalStatus | null>(null)

  const { addTransaction, updateTransaction } = useTransactionStore()

  const createService = async (): Promise<SearingService | null> => {
    if (!publicClient) return null

    const service = new SearingService({ publicClient, walletClient })
    await service.initialize()
    return service
  }

  const createWritableService = async (): Promise<SearingService | null> => {
    if (!address || !publicClient || !walletClient) return null
    return createService()
  }

  const resetForOperation = (
    operation: SearingOperation,
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

  const approvalTx = useBlockchainTransaction({
    transactionType: 'approve-searing',
    onPending: () => {
      showApprovalRequiredToast('Searing Contract')
    },
    onSubmitted: (hash) => {
      showTransactionPendingToast(hash)
    },
    onSuccess: () => {
      setApprovalStatus({
        isWagdieApproved: true,
        isConcordApproved: true,
        isFullyApproved: true,
      })
      showApprovalSuccessToast('Searing Contract')
    },
    onError: (error) => {
      showTransactionErrorToast(error)
      logError(error, 'approveForSearing')
    },
    addTransaction,
    updateTransaction,
  })

  const searTx = useBlockchainTransaction({
    transactionType: 'sear-concords',
    onSubmitted: (hash) => {
      showTransactionPendingToast(hash)
    },
    onSuccess: (hash) => {
      showTransactionSuccessToast(hash, 'Character seared successfully!')
    },
    onError: (error) => {
      showTransactionErrorToast(error)
      logError(error, 'searConcords')
    },
    addTransaction,
    updateTransaction,
  })

  const checkApprovalStatus = async (): Promise<SearingApprovalStatus> => {
    if (!address || !publicClient) {
      setApprovalStatus(defaultApprovalStatus)
      return defaultApprovalStatus
    }

    try {
      const service = await createService()
      if (!service) return defaultApprovalStatus

      const result = await service.getApprovalStatus(address)
      const nextStatus = result.data ?? defaultApprovalStatus

      if (result.error) {
        setLocalError(result.error)
      }

      setApprovalStatus(nextStatus)
      return nextStatus
    } catch (err) {
      logError(err, 'checkApprovalStatus')
      setApprovalStatus(defaultApprovalStatus)
      return defaultApprovalStatus
    }
  }

  const checkApproval = async (): Promise<boolean> => {
    const status = await checkApprovalStatus()
    return status.isFullyApproved
  }

  const approveForSearing = async (): Promise<void> => {
    resetForOperation('approve', approvalTx.reset)

    if (!address || !publicClient || !walletClient) {
      setWalletError()
      return
    }

    const outcome = await approvalTx.execute({ address }, async (_params, context) => {
      const service = await createWritableService()
      if (!service) {
        return { error: walletNotConnectedError() }
      }

      let submittedApprovals = 0

      const result = await service.approveForSearing(address, {
        waitForConfirmation: true,
        onApprovalTransaction: async (target, hash) => {
          context.markSubmitted(hash, {
            metadata: { target },
          })

          if (submittedApprovals > 0) {
            showTransactionPendingToast(hash)
          }
          submittedApprovals += 1
        },
      })

      if (result.error) {
        return { hash: result.hash, error: result.error }
      }

      return { hash: result.hash }
    })

    if (outcome.success && !outcome.superseded) {
      setApprovalStatus({
        isWagdieApproved: true,
        isConcordApproved: true,
        isFullyApproved: true,
      })

      if (!outcome.hash) {
        showApprovalSuccessToast('Searing Contract')
      }
    }

    if (outcome.error) {
      await checkApprovalStatus()
    }
  }

  const getConcordBalance = async (
    concordId: number
  ): Promise<SearingConcordBalance | null> => {
    if (!address || !publicClient) return null

    try {
      const service = await createService()
      if (!service) return null

      const result = await service.getConcordBalance(address, concordId)

      if (result.error) {
        setLocalError(result.error)
        return null
      }

      return result.data ?? null
    } catch (err) {
      const error = createContractError(
        ContractErrorType.UNKNOWN,
        'Failed to fetch Concord balance',
        err
      )
      setLocalError(error)
      logError(err, 'getConcordBalance')
      return null
    }
  }

  const getConcordBalances = async (
    concordIds: number[]
  ): Promise<SearingConcordBalance[]> => {
    if (!address || !publicClient || concordIds.length === 0) return []

    try {
      const service = await createService()
      if (!service) return []

      const result = await service.getConcordBalances(address, concordIds)

      if (result.error) {
        setLocalError(result.error)
        return []
      }

      return result.data ?? []
    } catch (err) {
      const error = createContractError(
        ContractErrorType.UNKNOWN,
        'Failed to fetch Concord balances',
        err
      )
      setLocalError(error)
      logError(err, 'getConcordBalances')
      return []
    }
  }

  const searConcords = async (
    wagdieId: number,
    concordId: number
  ): Promise<SearingTransactionResult> => {
    resetForOperation('sear', searTx.reset)

    if (!address || !publicClient || !walletClient) {
      const err = setWalletError()
      return { success: false, error: err }
    }

    setLocalStatus(TransactionStatus.PENDING)
    setPreparingOperation('sear')

    try {
      const service = await createWritableService()
      if (!service) {
        const err = setWalletError()
        setLocalStatus(TransactionStatus.ERROR)
        return { success: false, error: err }
      }

      // Check if both WAGDIE and Concord contracts are approved.
      const isApproved = await checkApproval()
      if (!isApproved) {
        const err = createContractError(
          ContractErrorType.CONTRACT_ERROR,
          'Please approve WAGDIE and Concord access for the searing contract first'
        )
        setLocalError(err)
        showApprovalRequiredToast('Searing Contract')
        setLocalStatus(TransactionStatus.ERROR)
        return { success: false, error: err }
      }

      const params: SearConcordsParams[] = [{ wagdieId, concordId }]
      const outcome = await searTx.execute({ wagdieId, concordId }, async (_params, context) => {
        return confirmContractTransaction({
          transaction: () => service.searConcords(params, address),
          service,
          context,
          missingHashError: missingTransactionHashError('Searing'),
        })
      })

      return {
        success: outcome.success,
        hash: outcome.hash,
        error: outcome.error,
      }
    } catch (err) {
      const error = createContractError(
        ContractErrorType.UNKNOWN,
        'Failed to sear concords',
        err
      )
      setLocalError(error)
      setLocalStatus(TransactionStatus.ERROR)
      showTransactionErrorToast(error)
      logError(err, 'searConcords')
      return { success: false, error }
    } finally {
      setPreparingOperation(null)
    }
  }

  const activeTx = activeOperation === 'approve' ? approvalTx : searTx
  const txStatus = activeTx.status !== TransactionStatus.IDLE ? activeTx.status : localStatus

  return {
    isSearing: searTx.isExecuting || preparingOperation === 'sear',
    isApproving: approvalTx.isExecuting,
    error: localError || activeTx.error,
    txHash: activeTx.txHash,
    txStatus,
    approvalStatus,
    searConcords,
    checkApproval,
    checkApprovalStatus,
    approveForSearing,
    getConcordBalance,
    getConcordBalances,
  }
}

// Hook for checking searing status
export function useSearingStatus(wagdieId: number | null) {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [status, setStatus] = useState<SearingStatus | null>(null)
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
      const service = new SearingService({ publicClient, walletClient })
      await service.initialize()

      const result = await service.getSearingStatus(wagdieId)

      if (result.error) {
        setError(result.error)
        setStatus(null)
      } else if (result.data) {
        setStatus(result.data)
      }
    } catch (err) {
      const error = createContractError(
        ContractErrorType.UNKNOWN,
        'Failed to fetch searing status',
        err
      )
      setError(error)
      logError(err, 'useSearingStatus')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
  }
}
