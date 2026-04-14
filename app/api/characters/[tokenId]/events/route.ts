/**
 * Character Infection Events API Route
 * GET: Fetch infection and cure events for a character
 *
 * Query params:
 *   - type: 'infection' | 'cure' (optional, filters by event type)
 *   - limit: number (optional, max results, default 50)
 */

import { NextRequest } from 'next/server'
import { parseEnumParam, parseLimitParam, parseTokenIdParam } from '@/lib/api/params'
import { jsonRaw } from '@/lib/api/responses'
import { activityRepository } from '@/lib/repositories/activity-repository'

const INFECTION_EVENT_TYPES = ['infection', 'cure'] as const
type InfectionEventType = typeof INFECTION_EVENT_TYPES[number]

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  const params = await context.params
  const tokenId = parseTokenIdParam(params.tokenId, { min: 0 })
  if (tokenId === null) {
    return jsonRaw(
      { error: 'Invalid token ID' },
      { status: 400 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const eventTypeParam = searchParams.get('type')
  const eventType: InfectionEventType | null | undefined = eventTypeParam
    ? parseEnumParam(eventTypeParam, INFECTION_EVENT_TYPES, 'infection')
    : undefined
  const limit = parseLimitParam(searchParams.get('limit'), { defaultLimit: 50, maxLimit: 100 })

  // Validate event type if provided
  if (eventTypeParam && eventType === null) {
    return jsonRaw(
      { error: 'Invalid event type. Must be "infection" or "cure"' },
      { status: 400 }
    )
  }
  const normalizedEventType = eventType ?? undefined

  try {
    const events = await activityRepository.findInfectionEvents(tokenId, {
      limit,
      eventType: normalizedEventType,
    })

    return jsonRaw({
      tokenId,
      events,
      count: events.length,
    })
  } catch (error) {
    console.error('Unexpected error in infection events API:', error)
    return jsonRaw(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
