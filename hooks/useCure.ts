'use client'

// useCure Hook
// React hook for curing infected characters

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { ContractError, ContractErrorType, TransactionHash, TransactionStatus } from '@/types/blockchain'
import { CureService, CureStatus } from '@/lib/services/blockchain/cure'
import { logError } from '@/lib/utils/errors'
import { useTransactionStore } from '@/lib/store/transactions'
import {
  showTransactionPendingToast,
  showTransactionSuccessToast,
  showTransactionErrorToast,
} from '@/lib/utils/toast'
import { useBlockchainTransaction } from './useBlockchainTransaction'

interface UseCureResult {
  isCuring: boolean
  error: ContractError | null
  txHash: TransactionHash | null
  txStatus: TransactionStatus
  cureStatus: CureStatus | null
  cureCharacter: (characterId: number) => Promise<void>
  fetchCureStatus: () => Promise<void>
}

type CureTransactionResult = {
  mushroomsRequired: bigint
}

function missingTransactionHashError(): ContractError {
  return {
    type: ContractErrorType.UNKNOWN,
    message: 'Cure transaction did not return a hash',
  }
}

export function useCure(): UseCureResult {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [localError, setLocalError] = useState<ContractError | null>(null)
  const [localStatus, setLocalStatus] = useState<TransactionStatus>(TransactionStatus.IDLE)
  const [isPreparingCure, setIsPreparingCure] = useState(false)
  const [cureStatus, setCureStatus] = useState<CureStatus | null>(null)

  const { addTransaction, updateTransaction } = useTransactionStore()

  const fetchCureStatus = async (): Promise<void> => {
    if (!address || !publicClient) {
      setCureStatus(null)
      return
    }

    try {
      const service = new CureService({ publicClient, walletClient })
      await service.initialize()

      const result = await service.getCureStatus(address)
      if (result.data) {
        setCureStatus(result.data)
      }
    } catch (err) {
      logError(err, 'fetchCureStatus')
    }
  }

  const cureTx = useBlockchainTransaction<CureTransactionResult>({
    transactionType: 'cure-character',
    onSubmitted: (hash) => {
      showTransactionPendingToast(hash)
    },
    onSuccess: (hash, result) => {
      const mushroomsRequired = result?.mushroomsRequired ?? 0n
      showTransactionSuccessToast(
        hash,
        `Character cured! Burned ${mushroomsRequired} mushroom token${mushroomsRequired > 1n ? 's' : ''}.`
      )
    },
    onError: (error) => {
      showTransactionErrorToast(error)
      logError(error, 'cureCharacter')
    },
    addTransaction,
    updateTransaction,
  })

  useEffect(() => {
    fetchCureStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, publicClient])

  const cureCharacter = async (characterId: number): Promise<void> => {
    cureTx.reset()
    setLocalError(null)

    if (!address || !publicClient || !walletClient) {
      const err: ContractError = {
        type: ContractErrorType.UNKNOWN,
        message: 'Wallet not connected',
      }
      setLocalError(err)
      return
    }

    setLocalStatus(TransactionStatus.PENDING)
    setIsPreparingCure(true)

    try {
      const service = new CureService({ publicClient, walletClient })
      await service.initialize()

      // Check cure status
      const statusResult = await service.getCureStatus(address)
      if (statusResult.error) {
        setLocalError(statusResult.error)
        setLocalStatus(TransactionStatus.ERROR)
        showTransactionErrorToast(statusResult.error)
        return
      }

      const status = statusResult.data!

      if (!status.isMintingEnabled) {
        const err: ContractError = {
          type: ContractErrorType.CONTRACT_ERROR,
          message: 'Mushroom burning is currently disabled',
        }
        setLocalError(err)
        setLocalStatus(TransactionStatus.ERROR)
        showTransactionErrorToast(err)
        return
      }

      if (!status.hasEnoughMushrooms) {
        const err: ContractError = {
          type: ContractErrorType.INSUFFICIENT_FUNDS,
          message: `Insufficient mushroom tokens. You need ${status.mushroomsRequired} mushrooms to cure.`,
        }
        setLocalError(err)
        setLocalStatus(TransactionStatus.ERROR)
        showTransactionErrorToast(err)
        return
      }

      const outcome = await cureTx.execute(
        {
          characterId,
          mushroomsBurned: status.mushroomsRequired,
        },
        async ({ mushroomsBurned }, context) => {
          const result = await service.burnMushroomsForCure(mushroomsBurned, address)

          if (result.error) return { error: result.error }

          if (result.hash) {
            context.markSubmitted(result.hash)

            const receipt = await service['waitForTransaction'](result.hash)
            if (receipt.error) return { hash: result.hash, error: receipt.error }

            return {
              hash: result.hash,
              result: { mushroomsRequired: mushroomsBurned },
            }
          }

          return { error: missingTransactionHashError() }
        }
      )

      if (outcome.success && !outcome.superseded) {
        // Refresh cure status
        await fetchCureStatus()
      }
    } catch (err) {
      const error: ContractError = {
        type: ContractErrorType.UNKNOWN,
        message: 'Failed to cure character',
        originalError: err instanceof Error ? err : undefined,
      }
      setLocalError(error)
      setLocalStatus(TransactionStatus.ERROR)
      showTransactionErrorToast(error)
      logError(err, 'cureCharacter')
    } finally {
      setIsPreparingCure(false)
    }
  }

  const txStatus = cureTx.status !== TransactionStatus.IDLE ? cureTx.status : localStatus

  return {
    isCuring: cureTx.isExecuting || isPreparingCure,
    error: localError || cureTx.error,
    txHash: cureTx.txHash,
    txStatus,
    cureStatus,
    cureCharacter,
    fetchCureStatus,
  }
}
