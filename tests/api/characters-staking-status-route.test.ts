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

  it('returns database statuses without success/data wrapping', async () => {
    ;(activityRepository.findStakingStatusRows as jest.Mock).mockResolvedValueOnce([
      { token_id: 1, location_id: '12' },
    ])

    const response = await GET(createRequest('?tokenIds=1,2'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      statuses: [
        { tokenId: 1, isStaked: true, locationId: '12' },
        { tokenId: 2, isStaked: false, locationId: null },
      ],
    })
    expect(activityRepository.findStakingStatusRows).toHaveBeenCalledWith([1, 2])
  })

  it('returns chain statuses without success/data wrapping', async () => {
    ;(syncStakingState as jest.Mock).mockResolvedValueOnce({
      results: [
        { tokenId: 1, chainLocationId: '7' },
        { tokenId: 2, chainLocationId: '0' },
      ],
    })

    const response = await GET(createRequest('?tokenIds=1,2&source=chain'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      statuses: [
        { tokenId: 1, isStaked: true, locationId: '7' },
        { tokenId: 2, isStaked: false, locationId: null },
      ],
    })
    expect(syncStakingState).toHaveBeenCalledWith({ tokenIds: [1, 2] })
  })
})
