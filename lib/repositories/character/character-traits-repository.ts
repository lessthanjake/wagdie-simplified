import { CHARACTERS_TABLE } from '@/lib/db/tables'
import { supabase } from '@/lib/supabase'
import type {
  AlignmentCount,
  AlignmentsResponse,
  OriginCount,
  OriginsResponse,
  TraitCount,
  TraitCountsResponse,
} from '@/types/character'

type MetadataTraitRow = {
  metadata: { attributes?: Array<{ trait_type: string; value: string | number }> } | null
}

function countTraitValues(
  rows: MetadataTraitRow[],
  traitType: string
): Map<string, number> {
  const traitCounts = new Map<string, number>()

  for (const row of rows) {
    const metadata = row.metadata
    if (metadata?.attributes && Array.isArray(metadata.attributes)) {
      const traitAttr = metadata.attributes.find(
        (attr: { trait_type: string; value: string | number }) => attr.trait_type === traitType
      )
      if (traitAttr?.value) {
        const value = String(traitAttr.value)
        traitCounts.set(value, (traitCounts.get(value) || 0) + 1)
      }
    }
  }

  return traitCounts
}

/**
 * Handles metadata trait aggregations for filter dropdowns.
 */
export class CharacterTraitsRepository {
  /**
   * Get all unique origins with character counts
   * Extracts Body trait from metadata JSONB
   */
  async getOrigins(): Promise<OriginsResponse> {
    // Fetch all metadata to extract Body trait
    const { data, error, count } = await supabase!
      .from(CHARACTERS_TABLE)
      .select('metadata', { count: 'exact' })

    if (error) {
      console.error('Error fetching origins:', error)
      throw new Error(`Failed to fetch origins: ${error.message}`)
    }

    const rows = (data || []) as unknown as MetadataTraitRow[]
    const originCounts = countTraitValues(rows, 'Body')

    // Convert to array and sort by count descending
    const origins: OriginCount[] = Array.from(originCounts.entries())
      .map(([origin, count]) => ({ origin, count }))
      .sort((a, b) => b.count - a.count)

    return {
      origins,
      totalCharacters: count || 0
    }
  }

  /**
   * Get all unique alignments with character counts
   * Extracts Alignment trait from metadata JSONB
   */
  async getAlignments(): Promise<AlignmentsResponse> {
    // Fetch all metadata to extract Alignment trait
    const { data, error, count } = await supabase!
      .from(CHARACTERS_TABLE)
      .select('metadata', { count: 'exact' })

    if (error) {
      console.error('Error fetching alignments:', error)
      throw new Error(`Failed to fetch alignments: ${error.message}`)
    }

    const rows = (data || []) as unknown as MetadataTraitRow[]
    const alignmentCounts = countTraitValues(rows, 'Alignment')

    // Convert to array and sort by alignment name
    const alignments: AlignmentCount[] = Array.from(alignmentCounts.entries())
      .map(([alignment, count]) => ({ alignment, count }))
      .sort((a, b) => a.alignment.localeCompare(b.alignment))

    return {
      alignments,
      totalCharacters: count || 0
    }
  }

  /**
   * Get counts for any trait type in metadata JSONB
   * Generic method to support Armor, Back, Mask, and other trait filters
   */
  async getTraitCounts(traitType: string): Promise<TraitCountsResponse> {
    // Fetch all metadata to extract the specified trait
    const { data, error, count } = await supabase!
      .from(CHARACTERS_TABLE)
      .select('metadata', { count: 'exact' })

    if (error) {
      throw new Error(`Failed to fetch ${traitType} traits: ${error.message}`)
    }

    const rows = (data || []) as unknown as MetadataTraitRow[]
    const traitCounts = countTraitValues(rows, traitType)

    // Convert to array and sort by count descending
    const traits: TraitCount[] = Array.from(traitCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)

    return {
      traitType,
      traits,
      totalCharacters: count || 0
    }
  }
}
