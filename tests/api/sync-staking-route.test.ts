/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/sync/staking/route'
import { syncStakingState } from '@/lib/services/sync/staking-state-sync'

jest.mock('@/lib/services/sync/staking-state-sync', () => ({
  syncStakingState: jest.fn(),
}))

function createJsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/sync/staking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createRawRequest(body: string) {
  return new NextRequest('http://localhost/api/sync/staking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

describe('Sync staking API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns no-store invalid JSON response with existing body shape', async () => {
    const response = await POST(createRawRequest('{'))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      results: [],
      error: 'Invalid JSON body',
    })
  })

  it('returns no-store invalid tokenIds response with existing body shape', async () => {
    const response = await POST(createJsonRequest({ tokenIds: [1, '2'] }))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      results: [],
      error: 'tokenIds must be an array of positive integers',
    })
  })

  it('returns no-store empty tokenIds response with existing body shape', async () => {
    const response = await POST(createJsonRequest({ tokenIds: [] }))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      results: [],
      error: 'tokenIds must not be empty',
    })
  })

  it('returns no-store too-many-tokenIds response with existing body shape', async () => {
    const tokenIds = Array.from({ length: 51 }, (_, index) => index + 1)
    const response = await POST(createJsonRequest({ tokenIds }))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      results: [],
      error: 'Maximum 50 tokenIds per request',
    })
  })

  it('deduplicates tokenIds and returns sync results without success/data wrapping', async () => {
    ;(syncStakingState as jest.Mock).mockResolvedValueOnce({
      results: [
        {
          tokenId: 1,
          success: true,
          locationId: '7',
          chainLocationId: '7',
        },
        {
          tokenId: 2,
          success: false,
          locationId: null,
          chainLocationId: '',
          error: 'No location mapping for chain_location_id',
        },
      ],
    })

    const response = await POST(createJsonRequest({ tokenIds: [1, 1, 2] }))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      results: [
        {
          tokenId: 1,
          success: true,
          locationId: '7',
          chainLocationId: '7',
        },
        {
          tokenId: 2,
          success: false,
          locationId: null,
          chainLocationId: '',
          error: 'No location mapping for chain_location_id',
        },
      ],
    })
    expect(syncStakingState).toHaveBeenCalledWith({ tokenIds: [1, 2] })
  })
})
