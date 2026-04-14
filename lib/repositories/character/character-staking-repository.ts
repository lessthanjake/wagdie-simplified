import { CHARACTERS_TABLE } from '@/lib/db/tables'
import { normalizeLocationMetadata } from '@/lib/domain/location/metadata'
import { supabase } from '@/lib/supabase'
import { isBurnedOwner } from '@/lib/utils/blockchain'
import type { Character } from '@/types/character'
import type { CharacterWithLocation } from './character-types'

/**
 * Handles staked-character queries and location joins for map data.
 */
export class CharacterStakingRepository {
  async getStakedCharacters(): Promise<CharacterWithLocation[]> {
    // Step 1: Get characters with location_id set
    // Note: Using separate queries because there's no FK constraint between wagdie_characters and locations
    const { data, error: charError } = await supabase!
      .from(CHARACTERS_TABLE)
      .select('*')
      .not('location_id', 'is', null)
      .order('token_id', { ascending: true })

    if (charError) {
      console.error('Error fetching staked characters:', charError)
      throw new Error(`Failed to fetch staked characters: ${charError.message}`)
    }

    // Cast to Character[] since Supabase doesn't infer the full type
    const characters = (data || []) as unknown as Character[]

    if (characters.length === 0) {
      return []
    }

    // Step 2: Get unique location IDs
    const locationIds = [...new Set(
      characters
        .map(c => c.location_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )]

    // Step 3: Fetch locations for those IDs
    const { data: locationsData, error: locError } = await supabase!
      .from('locations')
      .select('id, name, metadata')
      .in('id', locationIds)

    if (locError) {
      console.error('Error fetching locations for staked characters:', locError)
      // Return characters without location data rather than failing completely
      return characters.map(c => ({ ...c, location: null })) as CharacterWithLocation[]
    }

    // Cast to proper type since Supabase doesn't infer it
    const locations = (locationsData || []) as unknown as Array<{ id: string; name: string; metadata: unknown }>

    // Step 4: Create location lookup map
    const locationMap = new Map<string, { id: string; name: string; metadata: unknown }>()
    for (const loc of locations) {
      locationMap.set(loc.id, loc)
    }

    // Step 5: Join characters with locations and normalize metadata + burned flag
    const result: CharacterWithLocation[] = characters.map(char => {
      const rawLoc = char.location_id ? locationMap.get(char.location_id) : undefined
      // Normalize burned flag based on owner_address rule
      const normalizedBurned = isBurnedOwner(char.owner_address, char.burned)
      if (!rawLoc) {
        return { ...char, burned: normalizedBurned, location: null } as CharacterWithLocation
      }
      return {
        ...char,
        burned: normalizedBurned,
        location: {
          id: rawLoc.id,
          name: rawLoc.name,
          metadata: normalizeLocationMetadata(rawLoc.metadata),
        },
      } as CharacterWithLocation
    })

    return result
  }
}
