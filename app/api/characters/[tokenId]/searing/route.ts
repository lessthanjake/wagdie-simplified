/**
 * Character Searing Events API Route
 * GET: Fetch searing events for a character (concord equipment history)
 *
 * Query params:
 *   - type: 'sear' | 'tame' (optional, filters by event type)
 *   - limit: number (optional, max results, default 50)
 */

import { NextRequest } from 'next/server'
import { parseEnumParam, parseLimitParam, parseTokenIdParam } from '@/lib/api/params'
import { jsonRaw, jsonRawError } from '@/lib/api/responses'
import { activityRepository } from '@/lib/repositories/activity-repository'

const SEARING_EVENT_TYPES = ['sear', 'tame'] as const
type SearingEventType = typeof SEARING_EVENT_TYPES[number]

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  const params = await context.params
  const tokenId = parseTokenIdParam(params.tokenId, { min: 0 })
  if (tokenId === null) {
    return jsonRawError('Invalid token ID', 400)
  }

  const searchParams = request.nextUrl.searchParams
  const eventTypeParam = searchParams.get('type')
  const eventType: SearingEventType | null | undefined = eventTypeParam
    ? parseEnumParam(eventTypeParam, SEARING_EVENT_TYPES, 'sear')
    : undefined
  const limit = parseLimitParam(searchParams.get('limit'), { defaultLimit: 50, maxLimit: 100 })

  // Validate event type if provided
  if (eventTypeParam && eventType === null) {
    return jsonRawError('Invalid event type. Must be "sear" or "tame"', 400)
  }

  try {
    const events = await activityRepository.findSearingEvents(tokenId, {
      limit,
      eventType: eventType ?? undefined,
    })

    return jsonRaw({
      tokenId,
      events,
      count: events.length,
    })
  } catch (error) {
    console.error('Unexpected error in searing events API:', error)
    return jsonRawError('Internal server error', 500)
  }
}
