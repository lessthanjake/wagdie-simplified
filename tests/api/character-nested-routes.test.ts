/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET as getInfectionEvents } from '@/app/api/characters/[tokenId]/events/route'
import { GET as getStakingEvents } from '@/app/api/characters/[tokenId]/staking/route'
import { activityRepository } from '@/lib/repositories/activity-repository'

jest.mock('@/lib/repositories/activity-repository', () => ({
  activityRepository: {
    findInfectionEvents: jest.fn(),
    findStakingEvents: jest.fn(),
  },
}))

function createRequest(url: string) {
  return new NextRequest(url)
}

function createParams(tokenId: string) {
  return { params: Promise.resolve({ tokenId }) }
}

describe('Character nested event API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('preserves infection event invalid type response shape', async () => {
    const response = await getInfectionEvents(
      createRequest('http://localhost/api/characters/1/events?type=bad'),
      createParams('1')
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid event type. Must be "infection" or "cure"',
    })
  })

  it('keeps whitespace infection event type values invalid', async () => {
    const response = await getInfectionEvents(
      createRequest('http://localhost/api/characters/1/events?type=%20cure%20'),
      createParams('1')
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid event type. Must be "infection" or "cure"',
    })
  })

  it('returns infection events without success/data wrapping', async () => {
    const events = [{ id: 'event-1', event_type: 'cure' }]
    ;(activityRepository.findInfectionEvents as jest.Mock).mockResolvedValueOnce(events)

    const response = await getInfectionEvents(
      createRequest('http://localhost/api/characters/7/events?type=cure&limit=10'),
      createParams('7')
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      tokenId: 7,
      events,
      count: 1,
    })
    expect(activityRepository.findInfectionEvents).toHaveBeenCalledWith(7, {
      limit: 10,
      eventType: 'cure',
    })
  })

  it('preserves staking event invalid type response shape', async () => {
    const response = await getStakingEvents(
      new Request('http://localhost/api/characters/1/staking?event_type=bad'),
      createParams('1')
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid event type',
    })
  })

  it('keeps whitespace staking event type values invalid', async () => {
    const response = await getStakingEvents(
      new Request('http://localhost/api/characters/1/staking?event_type=%20stake%20'),
      createParams('1')
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid event type',
    })
  })

  it('returns staking events without success/data wrapping', async () => {
    const events = [{ id: 'stake-1', event_type: 'stake' }]
    ;(activityRepository.findStakingEvents as jest.Mock).mockResolvedValueOnce({
      events,
      total: 1,
    })

    const response = await getStakingEvents(
      new Request('http://localhost/api/characters/5/staking?event_type=stake&limit=10&offset=20'),
      createParams('5')
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      tokenId: 5,
      events,
      total: 1,
      limit: 10,
      offset: 20,
    })
    expect(activityRepository.findStakingEvents).toHaveBeenCalledWith(5, {
      limit: 10,
      offset: 20,
      eventType: 'stake',
    })
  })
})
