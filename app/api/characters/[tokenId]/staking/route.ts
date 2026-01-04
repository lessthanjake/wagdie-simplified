import { NextResponse } from 'next/server'
import { parseLimitOffsetParams, parseTokenIdParam } from '@/lib/api/params'
import { activityRepository } from '@/lib/repositories/activity-repository'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params
  const tokenIdNum = parseTokenIdParam(tokenId, { min: 1, max: 6666 })
  if (tokenIdNum === null) {
    return NextResponse.json(
      { error: 'Invalid token ID' },
      { status: 400 }
    )
  }

  const url = new URL(request.url)
  const { limit, offset } = parseLimitOffsetParams(url.searchParams, { defaultLimit: 50, maxLimit: 100 })
  const eventType = url.searchParams.get('event_type')
  const allowedEventTypes = ['stake', 'unstake', 'location_change', 'burn'] as const
  const normalizedEventType = allowedEventTypes.includes(eventType as typeof allowedEventTypes[number])
    ? (eventType as typeof allowedEventTypes[number])
    : undefined

  if (eventType && !normalizedEventType) {
    return NextResponse.json(
      { error: 'Invalid event type' },
      { status: 400 }
    )
  }

  let events = []
  let total = 0
  try {
    const result = await activityRepository.findStakingEvents(tokenIdNum, {
      limit,
      offset,
      eventType: normalizedEventType,
    })
    events = result.events
    total = result.total
  } catch (error) {
    console.error('Failed to fetch staking events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staking events' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    tokenId: tokenIdNum,
    events,
    total,
    limit,
    offset,
  })
}
