/**
 * Character Searing Events API Route
 * GET: Fetch searing events for a character (concord equipment history)
 *
 * Query params:
 *   - type: 'sear' | 'tame' (optional, filters by event type)
 *   - limit: number (optional, max results, default 50)
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseLimitParam, parseTokenIdParam } from '@/lib/api/params'
import { activityRepository } from '@/lib/repositories/activity-repository'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  const params = await context.params
  const tokenId = parseTokenIdParam(params.tokenId, { min: 0 })
  if (tokenId === null) {
    return NextResponse.json(
      { error: 'Invalid token ID' },
      { status: 400 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const eventType = searchParams.get('type')
  const limit = parseLimitParam(searchParams.get('limit'), { defaultLimit: 50, maxLimit: 100 })

  // Validate event type if provided
  if (eventType && eventType !== 'sear' && eventType !== 'tame') {
    return NextResponse.json(
      { error: 'Invalid event type. Must be "sear" or "tame"' },
      { status: 400 }
    )
  }
  const normalizedEventType = eventType === 'sear' || eventType === 'tame' ? eventType : undefined

  try {
    const events = await activityRepository.findSearingEvents(tokenId, {
      limit,
      eventType: normalizedEventType,
    })

    return NextResponse.json({
      tokenId,
      events,
      count: events.length,
    })
  } catch (error) {
    console.error('Unexpected error in searing events API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
