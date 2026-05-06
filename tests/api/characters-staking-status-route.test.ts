/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/characters/staking-status/route'
import { activityRepository } from '@/lib/repositories/activity-repository'
import { syncStakingState } from '@/lib/services/sync/staking-state-sync'

jest.mock('@/lib/repositories/activity-repository', () => ({
  activityRepository: {
    findStakingStatusRows: jest.fn(),
  },
}))

jest.mock('@/lib/services/sync/staking-state-sync', () => ({
  syncStakingState: jest.fn(),
}))

function createRequest(query = '') {
  return new NextRequest(`http://localhost/api/characters/staking-status${query}`)
}

describe('Characters staking-status API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns no-store missing-tokenIds error with existing body shape', async () => {
    const response = await GET(createRequest())

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      statuses: [],
      error: 'tokenIds parameter is required',
    })
  })

  it('returns no-store invalid-source error with existing body shape', async () => {
    const response = await GET(createRequest('?tokenIds=1&source=cache'))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      statuses: [],
      error: 'source must be either "db" or "chain"',
    })
  })

  it('keeps whitespace source values invalid', async () => {
    const response = await GET(createRequest('?tokenIds=1&source=%20'))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      statuses: [],
      error: 'source must be either "db" or "chain"',
    })
  })

  it('returns no-store too-many-tokenIds error with existing body shape', async () => {
    const tokenIds = Array.from({ length: 501 }, (_, index) => index + 1).join(',')
    const response = await GET(createRequest(`?tokenIds=${tokenIds}`))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      statuses: [],
      error: 'Maximum 500 token IDs per request',
    })
  })

  it('returns explicit database status fields while preserving legacy locationId', async () => {
    ;(activityRepository.findStakingStatusRows as jest.Mock).mockResolvedValueOnce([
      { token_id: 1, location_id: 'concord_searing' },
    ])

    const response = await GET(createRequest('?tokenIds=1,2'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      statuses: [
        {
          tokenId: 1,
          isStaked: true,
          source: 'db',
          dbLocationId: 'concord_searing',
          chainLocationId: null,
          locationId: 'concord_searing',
        },
        {
          tokenId: 2,
          isStaked: false,
          source: 'db',
          dbLocationId: null,
          chainLocationId: null,
          locationId: null,
        },
      ],
    })
    expect(activityRepository.findStakingStatusRows).toHaveBeenCalledWith([1, 2])
  })

  it('returns explicit chain status fields with sync success metadata', async () => {
    ;(syncStakingState as jest.Mock).mockResolvedValueOnce({
      results: [
        { tokenId: 1, success: true, locationId: 'concord_searing', chainLocationId: '7' },
        { tokenId: 2, success: true, locationId: null, chainLocationId: '0' },
      ],
    })

    const response = await GET(createRequest('?tokenIds=1,2&source=chain'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      statuses: [
        {
          tokenId: 1,
          isStaked: true,
          source: 'chain',
          dbLocationId: 'concord_searing',
          chainLocationId: '7',
          locationId: '7',
          syncSuccess: true,
        },
        {
          tokenId: 2,
          isStaked: false,
          source: 'chain',
          dbLocationId: null,
          chainLocationId: null,
          locationId: null,
          syncSuccess: true,
        },
      ],
    })
    expect(syncStakingState).toHaveBeenCalledWith({ tokenIds: [1, 2] })
  })

  it('reports chain truth even when chain-source DB sync fails', async () => {
    ;(syncStakingState as jest.Mock).mockResolvedValueOnce({
      results: [
        {
          tokenId: 1,
          success: false,
          locationId: null,
          chainLocationId: '7',
          error: 'No location mapping for chain_location_id',
        },
      ],
    })

    const response = await GET(createRequest('?tokenIds=1&source=chain'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      statuses: [
        {
          tokenId: 1,
          isStaked: true,
          source: 'chain',
          dbLocationId: null,
          chainLocationId: '7',
          locationId: '7',
          syncSuccess: false,
          syncError: 'No location mapping for chain_location_id',
        },
      ],
    })
  })
})
