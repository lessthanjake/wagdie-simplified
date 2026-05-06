import { act, renderHook, waitFor } from '@testing-library/react'

import { useStakingStatuses } from '@/hooks/useStakingStatuses'
import { ContractErrorType } from '@/types/blockchain'

const mockFetch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = mockFetch as unknown as typeof fetch
})

describe('useStakingStatuses', () => {
  it('keeps DB slug location IDs as DB IDs and does not parse them as bigint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        statuses: [
          {
            tokenId: 7,
            isStaked: true,
            source: 'db',
            dbLocationId: 'concord_searing',
            chainLocationId: null,
            locationId: 'concord_searing',
          },
        ],
      }),
    })

    const { result } = renderHook(() => useStakingStatuses([7], { source: 'db' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    await waitFor(() => expect(result.current.statuses.has(7)).toBe(true))

    const status = result.current.statuses.get(7)
    expect(result.current.error).toBeNull()
    expect(status).toMatchObject({
      tokenId: 7n,
      isStaked: true,
      dbLocationId: 'concord_searing',
    })
    expect(status?.locationId).toBeUndefined()
    expect(status?.chainLocationId).toBeUndefined()
  })

  it('parses explicit numeric chain location IDs as bigint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        statuses: [
          {
            tokenId: 7,
            isStaked: true,
            source: 'chain',
            dbLocationId: 'concord_searing',
            chainLocationId: '12',
            locationId: '12',
            syncSuccess: false,
            syncError: 'No location mapping for chain_location_id',
          },
        ],
      }),
    })

    const { result } = renderHook(() => useStakingStatuses([7], { source: 'chain' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    await waitFor(() => expect(result.current.statuses.has(7)).toBe(true))

    const status = result.current.statuses.get(7)
    expect(status).toMatchObject({
      tokenId: 7n,
      isStaked: true,
      locationId: 12n,
      chainLocationId: 12n,
      dbLocationId: 'concord_searing',
      syncSuccess: false,
      syncError: 'No location mapping for chain_location_id',
    })
  })

  it('treats source-less DB responses as DB IDs based on the requested source', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        statuses: [
          {
            tokenId: 7,
            isStaked: true,
            locationId: '12',
          },
        ],
      }),
    })

    const { result } = renderHook(() => useStakingStatuses([7], { source: 'db' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    await waitFor(() => expect(result.current.statuses.has(7)).toBe(true))

    const status = result.current.statuses.get(7)
    expect(status?.dbLocationId).toBe('12')
    expect(status?.locationId).toBeUndefined()
    expect(status?.chainLocationId).toBeUndefined()
  })

  it('can refetch explicit chain token IDs even when automatic fetching is disabled', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        statuses: [
          {
            tokenId: 7,
            isStaked: true,
            source: 'chain',
            chainLocationId: '12',
            locationId: '12',
          },
        ],
      }),
    })

    const { result } = renderHook(() => useStakingStatuses([], { enabled: false }))

    await act(async () => {
      await result.current.refetch({ source: 'chain', tokenIds: [7] })
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/characters/staking-status?tokenIds=7&source=chain',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.current.statuses.get(7)).toMatchObject({
      tokenId: 7n,
      isStaked: true,
      locationId: 12n,
      chainLocationId: 12n,
    })
  })

  it('preserves API error behavior', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        statuses: [],
        error: 'Failed to fetch staking status',
      }),
    })

    const { result } = renderHook(() => useStakingStatuses([7]))

    await waitFor(() => expect(result.current.error).not.toBeNull())

    expect(result.current.error).toMatchObject({
      type: ContractErrorType.UNKNOWN,
      message: 'Failed to fetch staking status',
    })
    expect(result.current.statuses.size).toBe(0)
  })
})
