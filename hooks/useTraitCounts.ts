/**
 * useTraitCounts Hook
 * Application layer - Fetch counts for any metadata trait type with caching
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/endpoints'
import type { TraitCount } from '@/types/character'

export interface UseTraitCountsReturn {
  traits: TraitCount[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  totalCharacters: number
  traitType: string
}

/**
 * Custom hook for fetching counts of a specific trait type
 * Uses React Query for caching - trait values rarely change
 *
 * @param traitType - The trait type to fetch counts for (e.g., 'Armor', 'Back', 'Mask')
 */
export function useTraitCounts(traitType: string): UseTraitCountsReturn {
  const query = useQuery({
    queryKey: ['traitCounts', traitType],
    queryFn: () => api.characters.getTraitCounts(traitType),
    staleTime: 30 * 60 * 1000, // 30 minutes - trait values rarely change
    gcTime: 60 * 60 * 1000, // 1 hour cache
    enabled: !!traitType,
  })

  return {
    traits: query.data?.traits ?? [],
    traitType: query.data?.traitType ?? traitType,
    totalCharacters: query.data?.totalCharacters ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

/**
 * Convenience hooks for specific equipment traits
 */
export function useArmorTraits() {
  return useTraitCounts('Armor')
}

export function useBackTraits() {
  return useTraitCounts('Back')
}

export function useMaskTraits() {
  return useTraitCounts('Mask')
}
