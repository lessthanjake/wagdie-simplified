import { NextRequest } from 'next/server'
import { syncStakingState } from '@/lib/services/sync/staking-state-sync'
import { jsonNoStore } from '@/lib/api/responses'

export const dynamic = 'force-dynamic'

const MAX_TOKEN_IDS = 50

type SyncResult = {
  tokenId: number
  success: boolean
  locationId: string | null
  chainLocationId: string
  error?: string
}

function parseTokenIds(input: unknown): number[] | null {
  if (!Array.isArray(input)) return null

  const parsed: number[] = []
  for (const value of input) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      return null
    }
    parsed.push(value)
  }

  return parsed
}

function uniqueNumbers(values: number[]): number[] {
  const seen = new Set<number>()
  const out: number[] = []
  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonNoStore(
      { results: [], error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const tokenIds = parseTokenIds((body as { tokenIds?: unknown })?.tokenIds)
  if (!tokenIds) {
    return jsonNoStore(
      { results: [], error: 'tokenIds must be an array of positive integers' },
      { status: 400 }
    )
  }

  if (tokenIds.length === 0) {
    return jsonNoStore(
      { results: [], error: 'tokenIds must not be empty' },
      { status: 400 }
    )
  }

  if (tokenIds.length > MAX_TOKEN_IDS) {
    return jsonNoStore(
      { results: [], error: `Maximum ${MAX_TOKEN_IDS} tokenIds per request` },
      { status: 400 }
    )
  }

  const uniqueTokenIds = uniqueNumbers(tokenIds)

  try {
    const { results: sharedResults } = await syncStakingState({
      tokenIds: uniqueTokenIds,
    })

    const results: SyncResult[] = sharedResults.map((r) => ({
      tokenId: r.tokenId,
      success: r.success,
      locationId: r.locationId,
      chainLocationId: r.chainLocationId,
      ...(r.error ? { error: r.error } : {}),
    }))

    return jsonNoStore({ results })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to sync staking status'
    return jsonNoStore(
      { results: [], error: message },
      { status: 500 }
    )
  }
}
