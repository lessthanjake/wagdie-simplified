import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://kong:8000'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params
  const tokenIdNum = parseInt(tokenId, 10)

  if (isNaN(tokenIdNum) || tokenIdNum < 1 || tokenIdNum > 6666) {
    return NextResponse.json(
      { error: 'Invalid token ID' },
      { status: 400 }
    )
  }

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const eventType = url.searchParams.get('event_type')

  const supabase = createClient(supabaseUrl, supabaseKey)

  let query = supabase
    .from('staking_events')
    .select('*', { count: 'exact' })
    .eq('token_id', tokenIdNum)
    .order('block_number', { ascending: false })
    .range(offset, offset + limit - 1)

  if (eventType && ['stake', 'unstake', 'location_change', 'burn'].includes(eventType)) {
    query = query.eq('event_type', eventType)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Failed to fetch staking events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staking events' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    tokenId: tokenIdNum,
    events: data || [],
    total: count || 0,
    limit,
    offset,
  })
}
