'use client';

import { useState, useEffect } from 'react';
import type { Location, CharacterLocation } from '@/lib/types/map';

export function useMapData() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [characterLocations, setCharacterLocations] = useState<CharacterLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      // Guard against SSR
      if (typeof window === 'undefined') return;

      try {
        setIsLoading(true);

        // Dynamically import repositories to avoid SSR issues
        const { LocationRepository } = await import('@/lib/repositories/locationRepository');
        const { CharacterLocationRepository } = await import('@/lib/repositories/characterLocationRepository');

        const locationRepo = new LocationRepository();
        const charLocationRepo = new CharacterLocationRepository();

        const [locationsData, characterLocationsData] = await Promise.all([
          locationRepo.getAll(),
          charLocationRepo.getConfirmed()
        ]);

        setLocations(locationsData);
        setCharacterLocations(characterLocationsData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch map data:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return { locations, characterLocations, isLoading, error };
}
