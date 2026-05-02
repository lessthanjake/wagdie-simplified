'use client';

import { useCallback, useMemo, useState } from 'react';
import type { MarkerPayload } from '@/game/EventBus';
import type { CharacterWithLocation } from '@/lib/repositories/character-repository';
import {
  buildStakedCharactersByLocation,
  getLocationIdFromMarker,
  getStakingLocationSelection,
  type SelectedStakingLocation,
} from '@/lib/utils/mapOrchestration';

export interface UseMapPageSelectionResult {
  selectedMarker: MarkerPayload | null;
  isSidebarOpen: boolean;
  selectedStakingLocation: SelectedStakingLocation | null;
  selectedStakingError: string | null;
  stakedHere: CharacterWithLocation[];
  handleMarkerClick: (marker: MarkerPayload) => void;
  handleCloseSidebar: () => void;
  handleOpenStakingSidebar: () => void;
}

export function useMapPageSelection(
  stakedCharacters: CharacterWithLocation[]
): UseMapPageSelectionResult {
  const [selectedMarker, setSelectedMarker] = useState<MarkerPayload | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedStakingLocation, setSelectedStakingLocation] =
    useState<SelectedStakingLocation | null>(null);
  const [selectedStakingError, setSelectedStakingError] = useState<string | null>(null);

  const stakedByLocationId = useMemo(
    () => buildStakedCharactersByLocation(stakedCharacters),
    [stakedCharacters]
  );

  const selectedLocationId = getLocationIdFromMarker(selectedMarker);
  const stakedHere = selectedLocationId
    ? (stakedByLocationId.get(selectedLocationId) ?? [])
    : [];

  const handleMarkerClick = useCallback((marker: MarkerPayload) => {
    setSelectedMarker(marker);
    setIsSidebarOpen(true);

    const stakingSelection = getStakingLocationSelection(marker);
    if (stakingSelection) {
      setSelectedStakingError(stakingSelection.selectedLocationError);
      setSelectedStakingLocation(stakingSelection.selectedLocation);
      return;
    }

    // Preserve sticky location selection for non-location markers, but clear stale errors.
    setSelectedStakingError(null);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    setSelectedMarker(null);
  }, []);

  const handleOpenStakingSidebar = useCallback(() => {
    setSelectedMarker(null);
    setIsSidebarOpen(true);
  }, []);

  return {
    selectedMarker,
    isSidebarOpen,
    selectedStakingLocation,
    selectedStakingError,
    stakedHere,
    handleMarkerClick,
    handleCloseSidebar,
    handleOpenStakingSidebar,
  };
}
