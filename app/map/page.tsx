'use client';

import dynamic from 'next/dynamic';
import { useMapData } from '@/hooks/map/useMapData';
import { useMapLayers } from '@/hooks/map/useMapLayers';

// Dynamically import SimpleMap to avoid SSR issues
const SimpleMap = dynamic(() => import('@/components/map/SimpleMap').then(mod => ({ default: mod.SimpleMap })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-abyss">
      <div className="text-bone">Loading map...</div>
    </div>
  ),
});

export default function MapPage() {
  const { locations, characterLocations, isLoading, error } = useMapData();
  const { layers, toggleLayer } = useMapLayers();

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-abyss">
        <div className="text-bone">Error loading map: {error.message}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-abyss">
        <div className="text-bone">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <SimpleMap
        locations={locations}
        characterLocations={characterLocations}
        layers={layers}
        toggleLayer={toggleLayer}
        onMarkerClick={(marker) => {
          console.log('Marker clicked:', marker);
        }}
      />
    </div>
  );
}
