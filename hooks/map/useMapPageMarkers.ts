'use client';

import { useMemo } from 'react';
import type { MapCharacterData, MapEventsData } from '@/game/EventBus';
import type { CharacterWithLocation } from '@/lib/repositories/character-repository';
import {
  buildFallenDeathEvents,
  buildMapEventsPayload,
  buildWalletCharacterMarkers,
} from '@/lib/utils/mapOrchestration';

interface UseMapPageMarkersResult {
  characterMarkers: MapCharacterData[];
  eventsPayload: MapEventsData;
}

export function useMapPageMarkers(
  stakedCharacters: CharacterWithLocation[],
  walletAddress?: string
): UseMapPageMarkersResult {
  const walletLower = useMemo(
    () => (walletAddress ? walletAddress.toLowerCase() : null),
    [walletAddress]
  );

  const characterMarkers = useMemo(
    () => buildWalletCharacterMarkers(stakedCharacters, walletLower),
    [stakedCharacters, walletLower]
  );

  const fallenDeaths = useMemo(
    () => buildFallenDeathEvents(stakedCharacters),
    [stakedCharacters]
  );

  const eventsPayload = useMemo(
    () => buildMapEventsPayload(fallenDeaths),
    [fallenDeaths]
  );

  return {
    characterMarkers,
    eventsPayload,
  };
}
