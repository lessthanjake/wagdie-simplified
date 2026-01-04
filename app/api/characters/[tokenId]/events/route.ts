/**
 * Character Infection Events API Route
 * GET: Fetch infection and cure events for a character
 *
 * Query params:
 *   - type: 'infection' | 'cure' (optional, filters by event type)
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
  if (eventType && eventType !== 'infection' && eventType !== 'cure') {
    return NextResponse.json(
      { error: 'Invalid event type. Must be "infection" or "cure"' },
      { status: 400 }
    )
  }
  const normalizedEventType = eventType === 'infection' || eventType === 'cure' ? eventType : undefined

  try {
    const events = await activityRepository.findInfectionEvents(tokenId, {
      limit,
      eventType: normalizedEventType,
    })

    return NextResponse.json({
      tokenId,
      events,
      count: events.length,
    })
  } catch (error) {
    console.error('Unexpected error in infection events API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
