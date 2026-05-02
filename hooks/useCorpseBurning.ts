'use client'

// useCorpseBurning Hook
// React hook for corpse burning operations

import { useState } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { ContractError, ContractErrorType, TransactionHash, TransactionStatus } from '@/types/blockchain'
import { CorpseService } from '@/lib/services/blockchain/corpse'
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
  confirmContractTransaction,
  useBlockchainTransaction,
} from './useBlockchainTransaction'

interface UseCorpseBurningResult {
  isBurning: boolean
  isApproving: boolean
  error: ContractError | null
  txHash: TransactionHash | null
  txStatus: TransactionStatus
  corpseBalance: bigint | null
  mushroomBalance: bigint | null
  burnCorpse: (amount: bigint) => Promise<void>
  checkApproval: () => Promise<boolean>
  approveForBurning: () => Promise<void>
  fetchBalances: () => Promise<void>
}

type CorpseOperation = 'approve' | 'burn'

function missingTransactionHashError(action: string): ContractError {
  return {
    type: ContractErrorType.UNKNOWN,
    message: `${action} transaction did not return a hash`,
  }
}

type BurnTransactionResult = {
  amount: bigint
}

export function useCorpseBurning(): UseCorpseBurningResult {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [localError, setLocalError] = useState<ContractError | null>(null)
  const [localStatus, setLocalStatus] = useState<TransactionStatus>(TransactionStatus.IDLE)
  const [activeOperation, setActiveOperation] = useState<CorpseOperation>('burn')
  const [preparingOperation, setPreparingOperation] = useState<CorpseOperation | null>(null)
  const [corpseBalance, setCorpseBalance] = useState<bigint | null>(null)
  const [mushroomBalance, setMushroomBalance] = useState<bigint | null>(null)

  const { addTransaction, updateTransaction } = useTransactionStore()

  const fetchBalances = async (): Promise<void> => {
    if (!address || !publicClient) return

    try {
      const service = new CorpseService({ publicClient, walletClient })
      await service.initialize()

      const result = await service.getBothBalances(address)
      if (result.data) {
        setCorpseBalance(result.data.corpse)
        setMushroomBalance(result.data.mushroom)
      }
    } catch (err) {
      logError(err, 'fetchBalances')
    }
  }

  const approvalTx = useBlockchainTransaction({
    transactionType: 'approve-corpse-burning',
    onPending: () => {
      showApprovalRequiredToast('Mushroom Contract')
    },
    onSubmitted: (hash) => {
      showTransactionPendingToast(hash)
    },
    onSuccess: () => {
      showApprovalSuccessToast('Mushroom Contract')
    },
    onError: (error) => {
      showTransactionErrorToast(error)
      logError(error, 'approveForBurning')
    },
    addTransaction,
    updateTransaction,
  })

  const burnTx = useBlockchainTransaction<BurnTransactionResult>({
    transactionType: 'burn-corpse',
    onSubmitted: (hash) => {
      showTransactionPendingToast(hash)
    },
    onSuccess: (hash, result) => {
      const amount = result?.amount ?? 0n
      showTransactionSuccessToast(
        hash,
        `Burned ${amount} corpse token${amount > 1n ? 's' : ''}!`
      )
    },
    onError: (error) => {
      showTransactionErrorToast(error)
      logError(error, 'burnCorpse')
    },
    addTransaction,
    updateTransaction,
  })

  const checkApproval = async (): Promise<boolean> => {
    if (!address || !publicClient) return false

    try {
      const service = new CorpseService({ publicClient, walletClient })
      await service.initialize()

      const result = await service.isCorpseApproved(address)
      return result.data ?? false
    } catch (err) {
      logError(err, 'checkApproval')
      return false
    }
  }

  const approveForBurning = async (): Promise<void> => {
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

    await approvalTx.execute({ address }, async (_params, context) => {
      const service = new CorpseService({ publicClient, walletClient })
      await service.initialize()

      return confirmContractTransaction({
        transaction: () => service.approveCorpseForBurning(address),
        service,
        context,
        missingHashError: missingTransactionHashError('Corpse approval'),
      })
    })
  }

  const burnCorpse = async (amount: bigint): Promise<void> => {
    burnTx.reset()
    setActiveOperation('burn')
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

    if (amount <= 0n) {
      const err: ContractError = {
        type: ContractErrorType.INVALID_PARAMS,
        message: 'Amount must be greater than 0',
      }
      setLocalError(err)
      return
    }

    setLocalStatus(TransactionStatus.PENDING)
    setPreparingOperation('burn')

    try {
      const service = new CorpseService({ publicClient, walletClient })
      await service.initialize()

      // Check if approved
      const isApproved = await checkApproval()
      if (!isApproved) {
        const err: ContractError = {
          type: ContractErrorType.CONTRACT_ERROR,
          message: 'Please approve the mushroom contract first',
        }
        setLocalError(err)
        showApprovalRequiredToast('Mushroom Contract')
        setLocalStatus(TransactionStatus.ERROR)
        return
      }

      // Check balance
      const balanceResult = await service.getCorpseBalance(address)
      if (balanceResult.error || (balanceResult.data && balanceResult.data < amount)) {
        const err: ContractError = {
          type: ContractErrorType.INSUFFICIENT_FUNDS,
          message: 'Insufficient corpse token balance',
        }
        setLocalError(err)
        setLocalStatus(TransactionStatus.ERROR)
        showTransactionErrorToast(err)
        return
      }

      const outcome = await burnTx.execute({ amount }, async ({ amount }, context) => {
        const result = await confirmContractTransaction({
          transaction: () => service.burnCorpse(amount, address),
          service,
          context,
          missingHashError: missingTransactionHashError('Corpse burn'),
        })

        if (result.error) return { hash: result.hash, error: result.error }

        return {
          hash: result.hash,
          result: { amount },
        }
      })

      if (outcome.success && !outcome.superseded) {
        // Refresh balances
        await fetchBalances()
      }
    } catch (err) {
      const error: ContractError = {
        type: ContractErrorType.UNKNOWN,
        message: 'Failed to burn corpse tokens',
        originalError: err instanceof Error ? err : undefined,
      }
      setLocalError(error)
      setLocalStatus(TransactionStatus.ERROR)
      showTransactionErrorToast(error)
      logError(err, 'burnCorpse')
    } finally {
      setPreparingOperation(null)
    }
  }

  const activeTx = activeOperation === 'approve' ? approvalTx : burnTx
  const txStatus = activeTx.status !== TransactionStatus.IDLE ? activeTx.status : localStatus

  return {
    isBurning: burnTx.isExecuting || preparingOperation === 'burn',
    isApproving: approvalTx.isExecuting,
    error: localError || activeTx.error,
    txHash: activeTx.txHash,
    txStatus,
    corpseBalance,
    mushroomBalance,
    burnCorpse,
    checkApproval,
    approveForBurning,
    fetchBalances,
  }
}
