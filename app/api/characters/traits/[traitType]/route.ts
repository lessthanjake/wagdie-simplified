/**
 * Trait Counts API Route
 * GET handler for retrieving counts of a specific trait type (e.g., Armor, Back, Mask)
 */

import { NextRequest, NextResponse } from 'next/server'
import { characterRepository } from '@/lib/repositories/character-repository'

// Valid trait types that can be queried
const VALID_TRAIT_TYPES = ['Armor', 'Back', 'Mask', 'Body', 'Hair', 'Background', 'Class', 'Health']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ traitType: string }> }
) {
  try {
    const { traitType } = await params

    // Validate trait type (case-insensitive match, return proper casing)
    const normalizedTraitType = VALID_TRAIT_TYPES.find(
      t => t.toLowerCase() === traitType.toLowerCase()
    )

    if (!normalizedTraitType) {
      return NextResponse.json(
        { error: `Invalid trait type. Valid types: ${VALID_TRAIT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await characterRepository.getTraitCounts(normalizedTraitType)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching trait counts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trait counts' },
      { status: 500 }
    )
  }
}
