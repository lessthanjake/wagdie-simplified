import type { NormalizedLocationMetadata } from '@/lib/domain/location/metadata-types'
import type { Character } from '@/types/character'

/**
 * Location data joined from the locations table.
 * The metadata field is normalized to ensure center can be derived from bounds.
 */
export interface JoinedLocation {
  /** UUID of the location */
  id: string;

  /** Human-readable location name */
  name: string;

  /**
   * Normalized metadata with guaranteed bounds field.
   * Center and coordinates are derived if not present in raw data.
   */
  metadata: NormalizedLocationMetadata;
}

/**
 * Character with optional joined location data.
 *
 * Returned by:
 * - CharacterRepository.getStakedCharacters()
 *
 * Consumed by:
 * - useMapData() hook
 * - app/map/page.tsx mapCharacterMarkers memo
 */
export interface CharacterWithLocation extends Character {
  /**
   * Joined location data. Null if:
   * - Character's location_id is null (not staked)
   * - Character's location_id references a deleted location (orphaned FK)
   */
  location?: JoinedLocation | null;
}
