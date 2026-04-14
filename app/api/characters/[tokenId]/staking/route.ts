import { parseEnumParam, parseLimitOffsetParams, parseTokenIdParam } from '@/lib/api/params'
import { jsonRaw } from '@/lib/api/responses'
import { activityRepository } from '@/lib/repositories/activity-repository'

const STAKING_EVENT_TYPES = ['stake', 'unstake', 'location_change', 'burn'] as const
type StakingEventType = typeof STAKING_EVENT_TYPES[number]

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params
  const tokenIdNum = parseTokenIdParam(tokenId, { min: 1, max: 6666 })
  if (tokenIdNum === null) {
    return jsonRaw(
      { error: 'Invalid token ID' },
      { status: 400 }
    )
  }

  const url = new URL(request.url)
  const { limit, offset } = parseLimitOffsetParams(url.searchParams, { defaultLimit: 50, maxLimit: 100 })
  const eventTypeParam = url.searchParams.get('event_type')
  const normalizedEventType: StakingEventType | null | undefined = eventTypeParam
    ? parseEnumParam(eventTypeParam, STAKING_EVENT_TYPES, 'stake')
    : undefined

  if (eventTypeParam && normalizedEventType === null) {
    return jsonRaw(
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
      eventType: normalizedEventType ?? undefined,
    })
    events = result.events
    total = result.total
  } catch (error) {
    console.error('Failed to fetch staking events:', error)
    return jsonRaw(
      { error: 'Failed to fetch staking events' },
      { status: 500 }
    )
  }

  return jsonRaw({
    tokenId: tokenIdNum,
    events,
    total,
    limit,
    offset,
  })
}
