'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef, memo } from 'react';
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

export interface SimpleMapRef {
  setView: (center: [number, number], zoom?: number, options?: L.ZoomPanOptions) => void;
  getMap: () => L.Map | null;
}

// Memoized component to prevent unnecessary re-renders
const SimpleMapComponent = forwardRef<SimpleMapRef, SimpleMapProps>(({ locations, characterLocations, layers, toggleLayer, onMarkerClick }, ref) => {
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
      attributionControl: true,
    });

    // Set attribution separately
    map.attributionControl.setPrefix('WAGDIE World');

    // Add WAGDIE world image with loading tracking
    const bounds: L.LatLngBoundsExpression = [[0, 0], [2222, 2222]];
    const imageOverlay = L.imageOverlay('/images/wagdiemap.png', bounds);

    imageOverlay.on('load', () => {
      console.log('Map image loaded successfully');
    });

    imageOverlay.on('error', (error) => {
      console.error('Failed to load map image:', error);
    });

    imageOverlay.addTo(map);
    map.fitBounds(bounds);

    // Handle window resize for responsive behavior
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);

    mapInstanceRef.current = map;

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Helper function to get responsive icon sizes for touch targets
  const getIconSizes = (isMobile: boolean, baseSize: [number, number]) => {
    // Minimum touch target size: 44px (Apple/Google guidelines)
    const minTouchSize = 44;
    const scaleFactor = isMobile ? 1.5 : 1;
    const size = Math.max(baseSize[0] * scaleFactor, minTouchSize);
    return [size, size] as [number, number];
  };

  // Detect mobile/tablet
  const isMobileOrTablet = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 1024;
  };

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

        // Create custom icon using WAGDIE icon with touch-friendly sizing
        const isMobile = isMobileOrTablet();
        const locationIconSize = getIconSizes(isMobile, [32, 32]);
        const locationIcon = L.icon({
          iconUrl: '/images/map-icons/icon_location.png',
          iconSize: locationIconSize,
          iconAnchor: [locationIconSize[0] / 2, locationIconSize[1]],
          popupAnchor: [0, -locationIconSize[1]],
        });

        const marker = L.marker(center, {
          icon: locationIcon,
        });

        // Add tooltip on hover with mobile-friendly positioning
        marker.bindTooltip(
          `<div style="font-family: 'Wagdie_Fraktur_21', serif;">
            <strong>${location.name}</strong><br/>
            ${location.description || 'WAGDIE Location'}
          </div>`,
          {
            direction: 'top',
            offset: [0, -locationIconSize[1]],
            className: 'custom-tooltip',
            // Improve touch interaction
            permanent: false,
            opacity: isMobile ? 0.9 : 0.8,
          }
        );

        // Add popup on click
        const popupContent = `
          <div style="font-family: 'Wagdie_Fraktur_21', serif; min-width: 250px;">
            <h3 style="color: #d4af37; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #252525; padding-bottom: 4px;">
              ${location.name}
            </h3>
            <p style="color: #e8e8e8; font-size: 12px; margin-bottom: 8px;">
              ${location.description || 'A location in the WAGDIE world'}
            </p>
            <div style="background: #1a1a1a; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
              <div style="color: #b0b0b0; font-size: 11px; margin-bottom: 4px;">
                <span style="color: #e8e8e8;">Area:</span> ${location.metadata.area || 'Unknown'}
              </div>
              <div style="color: #b0b0b0; font-size: 11px; margin-bottom: 4px;">
                <span style="color: #e8e8e8;">Type:</span> ${location.metadata.properties?.terrain || 'Unknown'}
              </div>
              <div style="color: #b0b0b0; font-size: 11px;">
                <span style="color: #e8e8e8;">Difficulty:</span> ${location.metadata.properties?.difficulty || 'Unknown'}
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="alert('Stake feature coming soon!')" style="flex: 1; background: #d4af37; color: #0a0a0a; border: none; padding: 8px; border-radius: 4px; font-family: 'Wagdie_Fraktur_21', serif; font-size: 11px; cursor: pointer;">
                Stake Character
              </button>
              <button onclick="console.log('View details for ${location.name}')" style="flex: 1; background: #252525; color: #e8e8e8; border: 1px solid #252525; padding: 8px; border-radius: 4px; font-family: 'Wagdie_Fraktur_21', serif; font-size: 11px; cursor: pointer;">
                View Details
              </button>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          className: 'custom-popup',
          maxWidth: 300,
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

        // Create custom icon using WAGDIE icon with touch-friendly sizing
        const isMobile = isMobileOrTablet();
        const characterIconSize = getIconSizes(isMobile, [24, 24]);
        const characterIcon = L.icon({
          iconUrl: '/images/map-icons/icon_character.png',
          iconSize: characterIconSize,
          iconAnchor: [characterIconSize[0] / 2, characterIconSize[1]],
          popupAnchor: [0, -characterIconSize[1]],
        });

        const marker = L.marker(center, {
          icon: characterIcon,
        });

        // Add tooltip on hover with mobile-friendly positioning
        marker.bindTooltip(
          `<div style="font-family: 'Wagdie_Fraktur_21', serif;">
            <strong>Character #${charLocation.character_token_id}</strong><br/>
            ${charLocation.location?.name || 'Unknown Location'}
          </div>`,
          {
            direction: 'top',
            offset: [0, -characterIconSize[1]],
            className: 'custom-tooltip',
            // Improve touch interaction
            permanent: false,
            opacity: isMobile ? 0.9 : 0.8,
          }
        );

        // Add popup on click
        const characterPopupContent = `
          <div style="font-family: 'Wagdie_Fraktur_21', serif; min-width: 250px;">
            <h3 style="color: #d4af37; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #252525; padding-bottom: 4px;">
              Character #${charLocation.character_token_id}
            </h3>
            <p style="color: #e8e8e8; font-size: 12px; margin-bottom: 8px;">
              A WAGDIE character
            </p>
            <div style="background: #1a1a1a; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
              <div style="color: #b0b0b0; font-size: 11px; margin-bottom: 4px;">
                <span style="color: #e8e8e8;">Token ID:</span> ${charLocation.character_token_id}
              </div>
              <div style="color: #b0b0b0; font-size: 11px; margin-bottom: 4px;">
                <span style="color: #e8e8e8;">Location:</span> ${charLocation.location?.name || 'Unknown'}
              </div>
              <div style="color: #b0b0b0; font-size: 11px; margin-bottom: 4px;">
                <span style="color: #e8e8e8;">Status:</span> <span style="color: #4a7c59; text-transform: capitalize;">${charLocation.status}</span>
              </div>
              <div style="color: #b0b0b0; font-size: 11px;">
                <span style="color: #e8e8e8;">Wallet:</span> ${charLocation.wallet_address.slice(0, 6)}...${charLocation.wallet_address.slice(-4)}
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="alert('View character feature coming soon!')" style="flex: 1; background: #d4af37; color: #0a0a0a; border: none; padding: 8px; border-radius: 4px; font-family: 'Wagdie_Fraktur_21', serif; font-size: 11px; cursor: pointer;">
                View Character
              </button>
              <button onclick="alert('Move character feature coming soon!')" style="flex: 1; background: #252525; color: #e8e8e8; border: 1px solid #252525; padding: 8px; border-radius: 4px; font-family: 'Wagdie_Fraktur_21', serif; font-size: 11px; cursor: pointer;">
                Move Character
              </button>
            </div>
          </div>
        `;

        marker.bindPopup(characterPopupContent, {
          className: 'custom-popup',
          maxWidth: 300,
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

  // Expose map methods via ref
  useImperativeHandle(ref, () => ({
    setView: (center: [number, number], zoom = 1, options?: L.ZoomPanOptions) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView(center, zoom, options);
      }
    },
    getMap: () => mapInstanceRef.current,
  }), []);

  return (
    <>
      {/* Skip to content link for accessibility */}
      <a
        href="#map-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-gold focus:text-abyss focus:font-wagdie focus:font-bold focus:rounded"
      >
        Skip to map controls
      </a>

      <div ref={mapRef} className="w-full h-full" />

      {/* Layer Controls - Responsive for mobile/tablet with enhanced accessibility */}
      <div
        id="map-main-content"
        className="fixed top-4 right-4 sm:right-20 z-30 bg-shadow border-2 border-gold rounded-lg p-3 sm:p-4 shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-sm"
        role="region"
        aria-label="Map layer controls"
      >
        <div className="flex flex-col gap-2 sm:gap-3">
          <h3 className="font-wagdie text-gold text-xs sm:text-sm font-bold mb-1 sm:mb-2 tracking-wide">
            Map Layers
          </h3>
          <p className="sr-only">
            Use Tab to navigate, Space or Enter to toggle layers. Press L to toggle Locations, C to toggle Characters.
          </p>

          <label className="flex items-center gap-2 sm:gap-3 text-mist text-xs sm:text-sm cursor-pointer hover:text-ember transition-all duration-200 group min-h-[44px] focus-within:ring-2 focus-within:ring-gold focus-within:ring-offset-2 focus-within:ring-offset-abyss rounded">
            <img
              src="/images/map-icons/icon_location.png"
              alt="Locations layer icon"
              className="w-5 h-5 sm:w-6 sm:h-6 filter drop-shadow-[0_0_3px_rgba(212,175,55,0.3)] group-hover:brightness-110 transition-all"
              aria-hidden="true"
            />
            <input
              type="checkbox"
              checked={layers.locations}
              onChange={() => toggleLayer('locations')}
              onKeyDown={(e) => {
                if (e.key === 'l' || e.key === 'L') {
                  e.preventDefault();
                  toggleLayer('locations');
                }
              }}
              className="ml-1 h-4 w-4 rounded border-midnight bg-shadow text-gold focus:ring-gold focus:ring-2 touch-manipulation"
              aria-label="Toggle locations layer (press L)"
              aria-describedby="locations-description"
            />
            <span className="font-wagdie tracking-wide">Locations</span>
          </label>
          <div id="locations-description" className="sr-only">
            Toggle visibility of location markers on the map
          </div>

          <label className="flex items-center gap-2 sm:gap-3 text-mist text-xs sm:text-sm cursor-pointer hover:text-ember transition-all duration-200 group min-h-[44px] focus-within:ring-2 focus-within:ring-gold focus-within:ring-offset-2 focus-within:ring-offset-abyss rounded">
            <img
              src="/images/map-icons/icon_character.png"
              alt="Characters layer icon"
              className="w-5 h-5 sm:w-6 sm:h-6 filter drop-shadow-[0_0_3px_rgba(212,175,55,0.3)] group-hover:brightness-110 transition-all"
              aria-hidden="true"
            />
            <input
              type="checkbox"
              checked={layers.characters}
              onChange={() => toggleLayer('characters')}
              onKeyDown={(e) => {
                if (e.key === 'c' || e.key === 'C') {
                  e.preventDefault();
                  toggleLayer('characters');
                }
              }}
              className="ml-1 h-4 w-4 rounded border-midnight bg-shadow text-gold focus:ring-gold focus:ring-2 touch-manipulation"
              aria-label="Toggle characters layer (press C)"
              aria-describedby="characters-description"
            />
            <span className="font-wagdie tracking-wide">Characters</span>
          </label>
          <div id="characters-description" className="sr-only">
            Toggle visibility of character markers on the map
          </div>

          <div className="border-t border-midnight my-1 sm:my-2" role="separator" aria-hidden="true"></div>

          <label className="flex items-center gap-2 sm:gap-3 text-mist text-xs sm:text-sm opacity-80 min-h-[44px]">
            <img
              src="/images/map-icons/icon_burn.png"
              alt="Burns layer icon"
              className="w-5 h-5 sm:w-6 sm:h-6 opacity-60"
              aria-hidden="true"
            />
            <input
              type="checkbox"
              disabled
              aria-disabled="true"
              className="ml-1 h-4 w-4 rounded border-midnight bg-midnight opacity-50 cursor-not-allowed"
            />
            <span className="font-wagdie tracking-wide">Burns</span>
            <span className="text-xs text-ash font-wagdie ml-auto" aria-label="coming soon">(Soon)</span>
          </label>

          <label className="flex items-center gap-2 sm:gap-3 text-mist text-xs sm:text-sm opacity-80 min-h-[44px]">
            <img
              src="/images/map-icons/icon_death.png"
              alt="Deaths layer icon"
              className="w-5 h-5 sm:w-6 sm:h-6 opacity-60"
              aria-hidden="true"
            />
            <input
              type="checkbox"
              disabled
              aria-disabled="true"
              className="ml-1 h-4 w-4 rounded border-midnight bg-midnight opacity-50 cursor-not-allowed"
            />
            <span className="font-wagdie tracking-wide">Deaths</span>
            <span className="text-xs text-ash font-wagdie ml-auto" aria-label="coming soon">(Soon)</span>
          </label>

          <label className="flex items-center gap-2 sm:gap-3 text-mist text-xs sm:text-sm opacity-80 min-h-[44px]">
            <img
              src="/images/map-icons/icon_fight.png"
              alt="Fights layer icon"
              className="w-5 h-5 sm:w-6 sm:h-6 opacity-60"
              aria-hidden="true"
            />
            <input
              type="checkbox"
              disabled
              aria-disabled="true"
              className="ml-1 h-4 w-4 rounded border-midnight bg-midnight opacity-50 cursor-not-allowed"
            />
            <span className="font-wagdie tracking-wide">Fights</span>
            <span className="text-xs text-ash font-wagdie ml-auto" aria-label="coming soon">(Soon)</span>
          </label>
        </div>
      </div>

      {/* Live region for announcements */}
      <div
        id="map-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
});

SimpleMapComponent.displayName = 'SimpleMap';

// Memoize the component with custom comparison
export const SimpleMap = memo(SimpleMapComponent, (prevProps, nextProps) => {
  // Only re-render if these props have actually changed
  return (
    prevProps.locations === nextProps.locations &&
    prevProps.characterLocations === nextProps.characterLocations &&
    prevProps.layers === nextProps.layers &&
    prevProps.toggleLayer === nextProps.toggleLayer &&
    prevProps.onMarkerClick === nextProps.onMarkerClick
  );
});
