/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/characters/[tokenId]/searing/preview/route'

jest.mock('@/lib/domain/searing/searing-layer-resolver', () => ({
  resolveSearingLayersForCharacter: jest.fn(),
  validateSearingLayerResolution: jest.fn(),
}))

jest.mock('@/lib/repositories/searing-map-materialization-repository', () => ({
  searingMapMaterializationRepository: {
    findByConcordTokenId: jest.fn(),
  },
}))

jest.mock('@/lib/services/searing-image-composer', () => ({
  searingImageComposer: {
    compose: jest.fn(),
  },
}))

jest.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: jest.fn(),
}))

function createRequest(query = '') {
  return new NextRequest(`http://localhost/api/characters/7/searing/preview${query}`)
}

function createParams(tokenId: string) {
  return { params: Promise.resolve({ tokenId }) }
}

describe('Searing preview API Route', () => {
  it('returns no-store invalid token ID response while preserving raw error shape', async () => {
    const response = await GET(createRequest('?concordId=1'), createParams('bad'))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ error: 'Invalid token ID' })
  })

  it('returns no-store missing concordId response while preserving raw error shape', async () => {
    const response = await GET(createRequest(), createParams('7'))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ error: 'concordId is required' })
  })

  it.each(['1abc', '1.5', '1e2', '9007199254740992'])(
    'rejects malformed concordId %s instead of parseInt coercing it',
    async (concordId) => {
      const response = await GET(createRequest(`?concordId=${concordId}`), createParams('7'))

      expect(response.status).toBe(400)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      await expect(response.json()).resolves.toEqual({ error: 'concordId is required' })
    }
  )
})
