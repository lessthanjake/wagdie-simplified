import type {
  MapCharacterData,
  MapEventData,
  MapEventsData,
  MapLocationData,
  MarkerPayload,
} from '@/game/EventBus';
import type { CharacterWithLocation } from '@/lib/repositories/character-repository';
import type { Location } from '@/lib/types/map';
import { parseChainLocationId } from '@/lib/utils/chainIds';
import { isBurnedOwner } from '@/lib/utils/blockchain';

export interface SelectedStakingLocation {
  location: Location;
  locationId: bigint;
}

export interface StakingLocationSelection {
  selectedLocation: SelectedStakingLocation | null;
  selectedLocationError: string | null;
}

const FALLEN_MARKER_OFFSET_DISTANCE = 35;

/**
 * Get location ID from a marker, returns null if not a location marker.
 */
export function getLocationIdFromMarker(marker: MarkerPayload | null): string | null {
  if (!marker || marker.type !== 'location') return null;

  const locationData = marker.data as MapLocationData;
  const maybeId = locationData?.id;

  return typeof maybeId === 'string' && maybeId.length > 0 ? maybeId : null;
}

export function buildStakedCharactersByLocation(
  stakedCharacters: CharacterWithLocation[]
): Map<string, CharacterWithLocation[]> {
  const index = new Map<string, CharacterWithLocation[]>();

  for (const row of stakedCharacters) {
    const locationId = row.location_id;
    if (!locationId) continue;

    const list = index.get(locationId);
    if (list) list.push(row);
    else index.set(locationId, [row]);
  }

  for (const [, list] of index) {
    list.sort((a, b) => a.token_id - b.token_id);
  }

  return index;
}

export function toLocation(locationData: MapLocationData): Location {
  return {
    id: locationData.id,
    name: locationData.name,
    description: locationData.description,
    chain_location_id: locationData.chain_location_id,
    metadata: {
      bounds: locationData.metadata?.bounds ?? [[0, 0], [0, 0]],
      center: locationData.metadata?.center,
    },
    created_at: locationData.created_at ?? '',
    updated_at: locationData.updated_at ?? '',
  };
}

export function getStakingLocationSelection(marker: MarkerPayload): StakingLocationSelection | null {
  if (marker.type !== 'location') return null;

  const location = toLocation(marker.data as MapLocationData);
  const chainLocationId = parseChainLocationId(location.chain_location_id);

  if (chainLocationId === null || chainLocationId === 0n) {
    console.warn(`Location "${location.id}" has no valid chain_location_id`);

    return {
      selectedLocation: null,
      selectedLocationError: 'This location is not registered on-chain. Staking is unavailable.',
    };
  }

  return {
    selectedLocation: { location, locationId: chainLocationId },
    selectedLocationError: null,
  };
}

export function buildWalletCharacterMarkers(
  stakedCharacters: CharacterWithLocation[],
  walletLower: string | null
): MapCharacterData[] {
  // Wallet-only pins: if no connected wallet, show no character markers.
  // The location popup list still shows ALL staked characters.
  if (!walletLower) return [];

  const out: MapCharacterData[] = [];

  for (const character of stakedCharacters) {
    // Only render pins for the connected wallet's characters.
    // When a character is staked, owner_address becomes the staking contract;
    // staker_address tracks the wallet that staked it.
    const effectiveOwner = character.staker_address ?? character.owner_address;
    const effectiveOwnerLower =
      typeof effectiveOwner === 'string' && effectiveOwner.length > 0
        ? effectiveOwner.toLowerCase()
        : null;

    if (!effectiveOwnerLower || effectiveOwnerLower !== walletLower) continue;

    const joinedLocation = character.location;
    if (!joinedLocation) continue;

    const center = joinedLocation.metadata.center;
    if (!Array.isArray(center) || center.length !== 2) continue;

    const characterName =
      (typeof character.name === 'string' && character.name.trim().length > 0
        ? character.name.trim()
        : null) ??
      (typeof character.metadata?.name === 'string' && character.metadata.name.trim().length > 0
        ? character.metadata.name.trim()
        : null) ??
      `Character #${character.token_id}`;

    out.push({
      character_token_id: character.token_id,
      character_name: characterName,
      wallet_address: effectiveOwner ?? undefined,
      location: {
        id: joinedLocation.id,
        name: joinedLocation.name,
        metadata: { center },
      },
    });
  }

  out.sort((a, b) => a.character_token_id - b.character_token_id);
  return out;
}

export function buildFallenDeathEvents(stakedCharacters: CharacterWithLocation[]): MapEventData[] {
  return stakedCharacters
    .filter((character) => isBurnedOwner(character.owner_address, character.burned))
    .flatMap((character, index) => {
      const center = character.location?.metadata?.center;
      if (!Array.isArray(center) || center.length !== 2) return [];

      // Spread multiple fallen warriors in a circle around the location.
      const angle = (index * 137.5 * Math.PI) / 180;
      const offsetX = Math.cos(angle) * FALLEN_MARKER_OFFSET_DISTANCE;
      const offsetY = Math.sin(angle) * FALLEN_MARKER_OFFSET_DISTANCE;

      return [{
        id: `fallen-${character.token_id}`,
        title: `Fallen Warrior #${character.token_id}`,
        name: character.name || character.metadata?.name || `Character #${character.token_id}`,
        htmlcoordinates: [center[0] + offsetX, center[1] + offsetY] as [number, number],
        character_token_id: character.token_id,
      }];
    });
}

export function buildMapEventsPayload(deaths: MapEventData[]): MapEventsData {
  return {
    burns: [],
    deaths,
    fights: [],
  };
}
