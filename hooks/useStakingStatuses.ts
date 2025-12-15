'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'
import type { ContractError, StakingStatus } from '@/types/blockchain'
import { StakingService } from '@/lib/services/blockchain/staking'

export interface UseStakingStatusesOptions {
  enabled?: boolean
}

export interface UseStakingStatusesResult {
  statuses: Map<number, StakingStatus>
  isLoading: boolean
  error: ContractError | null
  refetch: () => Promise<void>
}

function buildStatusesMap(
  wagdieIds: number[],
  locations: Map<number, bigint>
): Map<number, StakingStatus> {
  const next = new Map<number, StakingStatus>()

  for (const wagdieId of wagdieIds) {
    const locationId = locations.get(wagdieId) ?? 0n
    const isStaked = locationId > 0n

    next.set(wagdieId, {
      tokenId: BigInt(wagdieId),
      isStaked,
      locationId: isStaked ? locationId : undefined,
    })
  }

  return next
}

export function useStakingStatuses(
  wagdieIds: number[],
  options?: UseStakingStatusesOptions
): UseStakingStatusesResult {
  const enabled = options?.enabled ?? true
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [statuses, setStatuses] = useState<Map<number, StakingStatus>>(
    () => new Map()
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ContractError | null>(null)

  // Stabilize wagdieIds reference by content (not by array identity)
  const wagdieIdsKey = Array.isArray(wagdieIds) ? wagdieIds.join(',') : ''
  const stableWagdieIds = useMemo(() => wagdieIds.slice(), [wagdieIdsKey])

  const fetchStatuses = useCallback(async (): Promise<void> => {
    if (!enabled) return

    if (!publicClient) {
      // wagmi not ready; don't treat as an error, just no-op
      return
    }

    if (stableWagdieIds.length === 0) {
      setStatuses(new Map())
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const service = new StakingService({ publicClient, walletClient })
      await service.initialize()

      const result = await service.getStakedLocations(stableWagdieIds)

      if (result.error) {
        setError(result.error)
        setStatuses(new Map())
        return
      }

      const locations = result.data ?? new Map<number, bigint>()
      setStatuses(buildStatusesMap(stableWagdieIds, locations))
    } catch (err) {
      // StakingService should already parse contract errors internally, but
      // keep a safe fallback for unexpected runtime errors.
      const fallback: ContractError = {
        type: 'unknown' as any,
        message: 'Failed to fetch staking statuses',
        originalError: err instanceof Error ? err : undefined,
      }
      setError(fallback)
      setStatuses(new Map())
    } finally {
      setIsLoading(false)
    }
  }, [enabled, publicClient, walletClient, stableWagdieIds])

  useEffect(() => {
    if (!enabled) return
    if (!publicClient) return
    if (stableWagdieIds.length === 0) return

    void fetchStatuses()
  }, [enabled, publicClient, stableWagdieIds, fetchStatuses])

  return {
    statuses,
    isLoading,
    error,
    refetch: fetchStatuses,
  }
}