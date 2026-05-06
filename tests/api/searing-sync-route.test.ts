/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/characters/[tokenId]/searing/sync/route'
import {
  getConfiguredSearingChainId,
  searingMaterializationService,
} from '@/lib/services/searing-materialization-service'

jest.mock('@/lib/services/searing-materialization-service', () => ({
  getConfiguredSearingChainId: jest.fn(),
  searingMaterializationService: {
    verifyTransactionAndMaterialize: jest.fn(),
  },
}))

function createJsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/characters/7/searing/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createRawRequest(body: string) {
  return new NextRequest('http://localhost/api/characters/7/searing/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

function createParams(tokenId: string) {
  return { params: Promise.resolve({ tokenId }) }
}

describe('Searing sync API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getConfiguredSearingChainId as jest.Mock).mockReturnValue(1)
  })

  it('returns no-store invalid token ID response with existing body shape', async () => {
    const response = await POST(createJsonRequest({ transactionHash: '0xabc' }), createParams('bad'))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ error: 'Invalid token ID' })
  })

  it('treats invalid JSON as missing transactionHash with existing body shape', async () => {
    const response = await POST(createRawRequest('{'), createParams('7'))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      error: 'transactionHash is required for public searing sync',
    })
  })

  it('rejects chain ID mismatches without success/data wrapping', async () => {
    const response = await POST(
      createJsonRequest({ transactionHash: '0xabc', chainId: 2 }),
      createParams('7')
    )

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      error: 'chainId does not match server configuration',
    })
  })

  it('returns materialization result unchanged with no-store headers', async () => {
    const result = { status: 'completed', imageUrl: '/image.png' }
    ;(searingMaterializationService.verifyTransactionAndMaterialize as jest.Mock).mockResolvedValueOnce(result)

    const response = await POST(
      createJsonRequest({ txHash: '0xabc', chainId: 1, retryFailed: true }),
      createParams('7')
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual(result)
    expect(searingMaterializationService.verifyTransactionAndMaterialize).toHaveBeenCalledWith({
      tokenId: 7,
      transactionHash: '0xabc',
      retryFailed: true,
      repairCompleted: false,
    })
  })
})
