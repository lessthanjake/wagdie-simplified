'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location, CharacterLocation, LayerVisibility, MapMarkerData } from '@/lib/types/map';

interface SimpleMapProps {
  locations: Location[];
  characterLocations: CharacterLocation[];
  layers: LayerVisibility;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  onMarkerClick?: (marker: MapMarkerData) => void;
}

export function SimpleMap({ locations, characterLocations, layers, toggleLayer, onMarkerClick }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Guard against SSR
    if (typeof window === 'undefined') return;

    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [1111, 1111],
      zoom: 0,
      zoomControl: true,
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 2,
      attributionControl: false,
    });

    // Add WAGDIE world image
    const bounds: L.LatLngBoundsExpression = [[0, 0], [2222, 2222]];
    L.imageOverlay('/images/wagdiemap.png', bounds).addTo(map);
    map.fitBounds(bounds);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add location markers
    if (layers.locations) {
      locations.forEach((location) => {
        // Skip if no metadata or bounds
        if (!location.metadata || !location.metadata.bounds) {
          console.warn('Location missing metadata:', location);
          return;
        }

        const bounds = location.metadata.bounds;
        const center: [number, number] = location.metadata.center || [
          (bounds[0][0] + bounds[1][0]) / 2,
          (bounds[0][1] + bounds[1][1]) / 2,
        ];

        const marker = L.marker(center, {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: #8B5A2B; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${location.name}</div>`,
            iconSize: [100, 30],
            iconAnchor: [50, 30],
          })
        });

        marker.on('click', () => {
          if (onMarkerClick) {
            onMarkerClick({
              id: location.id,
              type: 'location',
              position: center,
              data: location,
            });
          }
        });

        marker.addTo(map);
      });
    }

    // Add character markers
    if (layers.characters) {
      characterLocations.forEach((charLocation) => {
        if (!charLocation.location) return;

        // Skip if no metadata or bounds
        if (!charLocation.location.metadata || !charLocation.location.metadata.bounds) {
          console.warn('Character location missing metadata:', charLocation);
          return;
        }

        const bounds = charLocation.location.metadata.bounds;
        const center: [number, number] = charLocation.location.metadata.center || [
          (bounds[0][0] + bounds[1][0]) / 2,
          (bounds[0][1] + bounds[1][1]) / 2,
        ];

        const marker = L.marker(center, {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: #FFD700; color: black; padding: 4px 8px; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${charLocation.character_token_id}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          })
        });

        marker.on('click', () => {
          if (onMarkerClick) {
            onMarkerClick({
              id: `character-${charLocation.character_token_id}`,
              type: 'character',
              position: center,
              data: charLocation,
            });
          }
        });

        marker.addTo(map);
      });
    }
  }, [locations, characterLocations, layers, onMarkerClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Simple Layer Controls */}
      <div className="absolute top-4 right-4 bg-shadow border border-midnight rounded-lg p-3 z-[1000]">
        <h3 className="font-wagdie text-bone text-sm mb-2">Layers</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-bone text-xs">
            <input
              type="checkbox"
              checked={layers.locations}
              onChange={() => toggleLayer('locations')}
            />
            Locations
          </label>
          <label className="flex items-center gap-2 text-bone text-xs">
            <input
              type="checkbox"
              checked={layers.characters}
              onChange={() => toggleLayer('characters')}
            />
            Characters
          </label>
        </div>
      </div>
    </div>
  );
}
