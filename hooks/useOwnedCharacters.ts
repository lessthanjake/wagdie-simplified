'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Character } from '@/types/character'

type SortOrder = 'asc' | 'desc'

type ApiCharactersResponse = {
  characters?: Character[]
  // Newer response shape (per instructions)
  total?: number
  page?: number
  perPage?: number
  totalPages?: number
  // Older/alternate response shape (repo type hints)
  totalCount?: number
  hasMore?: boolean
}

export interface UseOwnedCharactersOptions {
  enabled?: boolean
  perPage?: number
  sort?: SortOrder
  search?: string
}

export interface UseOwnedCharactersResult {
  characters: Character[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

function coerceCharacters(payload: unknown): Character[] {
  if (!payload || typeof payload !== 'object') return []
  const maybe = payload as ApiCharactersResponse
  return Array.isArray(maybe.characters) ? maybe.characters : []
}

function buildCharactersUrl(params: {
  tab: 'owned' | 'staked'
  wallet: string
  perPage: number
  sort: SortOrder
  search?: string
}): string {
  const searchParams = new URLSearchParams()
  searchParams.set('tab', params.tab)
  searchParams.set('wallet', params.wallet)
  searchParams.set('perPage', String(params.perPage))
  searchParams.set('sort', params.sort)
  if (params.search && params.search.trim().length > 0) {
    searchParams.set('search', params.search.trim())
  }
  return `/api/characters?${searchParams.toString()}`
}

async function fetchCharacters(
  url: string,
  signal: AbortSignal
): Promise<Character[]> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    signal,
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const text = await res.text()
      if (text) message = text
    } catch {
      // ignore body parse failures
    }
    throw new Error(message)
  }

  const json = (await res.json()) as unknown
  return coerceCharacters(json)
}

export function useOwnedCharacters(
  wallet?: string,
  options?: UseOwnedCharactersOptions
): UseOwnedCharactersResult {
  const enabled = options?.enabled ?? true
  const perPage = options?.perPage ?? 100
  const sort = options?.sort ?? 'desc'
  const search = options?.search

  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const doFetch = useCallback(async () => {
    if (!enabled) return
    if (!wallet || wallet.trim().length === 0) {
      setCharacters([])
      setIsLoading(false)
      setError(null)
      return
    }

    // Abort any in-flight request before starting a new one
    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const ownedUrl = buildCharactersUrl({
        tab: 'owned',
        wallet,
        perPage,
        sort,
        search,
      })

      const stakedUrl = buildCharactersUrl({
        tab: 'staked',
        wallet,
        perPage,
        sort,
        search,
      })

      const [owned, staked] = await Promise.all([
        fetchCharacters(ownedUrl, controller.signal),
        fetchCharacters(stakedUrl, controller.signal),
      ])

      const byTokenId = new Map<number, Character>()

      // Owned first...
      for (const c of owned) {
        if (typeof c?.token_id === 'number') {
          byTokenId.set(c.token_id, c)
        }
      }

      // ...then staked overwrites on duplicates (staked wins)
      for (const c of staked) {
        if (typeof c?.token_id === 'number') {
          byTokenId.set(c.token_id, c)
        }
      }

      // Stable ordering for UI
      const merged = Array.from(byTokenId.values()).sort(
        (a, b) => a.token_id - b.token_id
      )

      // Ignore results if we were aborted
      if (controller.signal.aborted) return

      setCharacters(merged)
    } catch (err) {
      // Ignore abort errors (expected during wallet/options changes)
      if (controller.signal.aborted) return

      const e =
        err instanceof Error ? err : new Error('Failed to fetch characters')
      setError(e)
      setCharacters([])
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [enabled, wallet, perPage, sort, search])

  useEffect(() => {
    void doFetch()

    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [doFetch])

  return {
    characters,
    isLoading,
    error,
    refetch: doFetch,
  }
}