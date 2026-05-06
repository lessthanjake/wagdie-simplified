/**
 * Staking Status API Route
 * GET handler for batch staking status lookup by token IDs
 * Returns staking status from database or chain-backed sync
 */

import { syncStakingState } from '@/lib/services/sync/staking-state-sync'
import { NextRequest, type NextResponse } from 'next/server'
import { parseCsvPositiveIntList, parseEnumParam } from '@/lib/api/params'
import { jsonNoStore } from '@/lib/api/responses'
import { activityRepository } from '@/lib/repositories/activity-repository'

export const dynamic = 'force-dynamic'

type StakingSource = 'db' | 'chain'

const STAKING_SOURCES: readonly StakingSource[] = ['db', 'chain'] as const
const MAX_TOKEN_IDS = 500

interface StakingStatusResponse {
  tokenId: number
  isStaked: boolean
  source: StakingSource
  dbLocationId: string | null
  chainLocationId: string | null
  /**
   * Deprecated compatibility field.
   * db source: DB location ID; chain source: chain location ID.
   */
  locationId: string | null
  syncSuccess?: boolean
  syncError?: string
}

interface ApiResponse {
  statuses: StakingStatusResponse[]
  error?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const tokenIdsParam = searchParams.get('tokenIds')
    const source = parseEnumParam(
      searchParams.get('source') || null,
      STAKING_SOURCES,
      'db'
    )

    if (source === null) {
      return jsonNoStore(
        { statuses: [], error: 'source must be either "db" or "chain"' },
        { status: 400 }
      )
    }

    if (!tokenIdsParam) {
      return jsonNoStore(
        { statuses: [], error: 'tokenIds parameter is required' },
        { status: 400 }
      )
    }

    // Parse token IDs from comma-separated string
    const tokenIdParseResult = parseCsvPositiveIntList(tokenIdsParam, {
      maxItems: MAX_TOKEN_IDS,
    })
    const tokenIds = tokenIdParseResult.values

    if (tokenIds.length === 0) {
      return jsonNoStore({ statuses: [] })
    }

    // Limit to 500 token IDs per request to prevent abuse
    if (tokenIdParseResult.error) {
      return jsonNoStore(
        { statuses: [], error: tokenIdParseResult.error },
        { status: 400 }
      )
    }

    if (source === 'chain') {
      // Read-through cache pattern: chain is truth, DB is refreshed as a side effect.
      const { results } = await syncStakingState({ tokenIds })

      const byTokenId = new Map<number, typeof results[number]>()
      for (const r of results) {
        byTokenId.set(r.tokenId, r)
      }

      const statuses: StakingStatusResponse[] = tokenIds.map((tokenId) => {
        const row = byTokenId.get(tokenId)
        const rawChainLocationId = row?.chainLocationId ?? ''
        const chainLocationId =
          rawChainLocationId && rawChainLocationId !== '0'
            ? rawChainLocationId
            : null

        return {
          tokenId,
          isStaked: chainLocationId !== null,
          source: 'chain',
          dbLocationId: row?.locationId ?? null,
          chainLocationId,
          locationId: chainLocationId,
          syncSuccess: row?.success ?? false,
          ...(row?.error ? { syncError: row.error } : {}),
        }
      })

      return jsonNoStore({ statuses })
    }

    // Default: Query database for staking status (location_id)
    let rows = []
    try {
      rows = await activityRepository.findStakingStatusRows(tokenIds)
    } catch (error) {
      console.error('Error fetching staking status:', error)
      return jsonNoStore(
        { statuses: [], error: 'Failed to fetch staking status' },
        { status: 500 }
      )
    }

    // Build response with staking status
    const statusMap = new Map<number, { location_id: string | null }>()
    for (const row of rows) {
      statusMap.set(row.token_id, { location_id: row.location_id })
    }

    // Build response array for all requested token IDs
    const statuses: StakingStatusResponse[] = tokenIds.map(tokenId => {
      const record = statusMap.get(tokenId)
      const locationId = record?.location_id ?? null
      return {
        tokenId,
        isStaked: locationId !== null,
        source: 'db',
        dbLocationId: locationId,
        chainLocationId: null,
        locationId,
      }
    })

    return jsonNoStore({ statuses })
  } catch (error) {
    console.error('Error in staking-status API:', error)
    return jsonNoStore(
      { statuses: [], error: 'Internal server error' },
      { status: 500 }
    )
  }
}
