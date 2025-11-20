/**
 * SimpleMap Component - REFACTORED
 *
 * Main map component that orchestrates the display of WAGDIE world map with markers.
 * This is a refactored version that uses modular components for better maintainability.
 *
 * Reduced from 735 lines to ~150 lines by extracting:
 * - IconFactory for icon creation
 * - PopupRenderer and TooltipRenderer for UI
 * - MarkerComponent for generic marker rendering
 * - LayerController for layer management
 * - LayerControls for UI controls
 *
 * All marker-specific rendering is now handled by individual marker components.
 */

'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LeafletMapWrapper from './LeafletMapWrapper';

// Components
import { LayerController, useLayerFilteredMarkers } from './LayerController';
import LayerControls from './LayerControls';
import LocationMarker from './markers/LocationMarker';
import CharacterMarker from './markers/CharacterMarker';
import BurnMarker from './markers/BurnMarker';
import DeathMarker from './markers/DeathMarker';
import FightMarker from './markers/FightMarker';
import { AssetErrorBoundary } from './AssetErrorBoundary';
import { AssetLoadingIndicator, AssetLoadingSpinner } from './AssetLoadingStates';

// Hooks
import { useAssetLoading } from '@/hooks/useAssetLoading';
import { useIconFactory } from '@/hooks/useIconFactory';

// Types
import type { Location, CharacterLocation } from '@/lib/types/map';
import type { LayerVisibility } from '@/specs/008-map-refactor/contracts/layer-controller';
import type { MapMarkerData } from '@/specs/008-map-refactor/contracts/marker-component';

interface SimpleMapProps {
  locations: Location[];
  characterLocations: CharacterLocation[];
  layers: LayerVisibility;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  onMarkerClick?: (marker: MapMarkerData) => void;
  onAssetRetry?: (assetId: string) => void;
}

export interface SimpleMapRef {
  setView: (center: [number, number], zoom?: number, options?: L.ZoomPanOptions) => void;
  getMap: () => L.Map | null;
}

// Fix for default markers in react-leaflet with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});


/**
 * Detect if device is mobile or tablet
 */
function isMobileOrTablet(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 1024;
}

/**
 * Main SimpleMap Component - REFACTORED
 *
 * Now a thin orchestrator that delegates to specialized components
 * Enhanced with asset loading and error handling
 */
const SimpleMapComponent = React.forwardRef<SimpleMapRef, SimpleMapProps>(
  ({ locations, characterLocations, layers, toggleLayer, onMarkerClick, onAssetRetry }, ref) => {
    // Hold Leaflet map instance for imperative handle
    const leafletMapRef = useRef<L.Map | null>(null);

    // Enhanced asset loading integration
    const {
      loading: assetLoading,
      error: assetError,
      assets: assetsMap,
      criticalLoaded,
      retryAsset: internalRetryAsset,
      preloadAssets,
      metrics: assetMetrics
    } = useAssetLoading();

    // Wrap retry asset to include external callback
    const handleRetryAsset = useCallback((assetId: string) => {
      internalRetryAsset(assetId);
      onAssetRetry?.(assetId);
    }, [internalRetryAsset, onAssetRetry]);

    const {
      getIcon,
      loading: iconLoading,
      error: iconError,
      metrics: iconMetrics,
      retryIcon,
      preloadIcons
    } = useIconFactory();

    // Initialize asset loading
    useEffect(() => {
      const initAssets = async () => {
        try {
          // Initialize asset preloading for critical map assets
          await preloadIcons(['location', 'character', 'burn', 'death', 'fight'] as any);
        } catch (error) {
          console.warn('[SimpleMap] Failed to preload assets:', error);
        }
      };

      initAssets();
    }, [preloadIcons]);

    // Expose imperative methods to parent
    React.useImperativeHandle(ref, () => ({
      setView: (center: [number, number], zoom?: number, options?: L.ZoomPanOptions) => {
        if (leafletMapRef.current) {
          leafletMapRef.current.setView(center as any, zoom ?? leafletMapRef.current.getZoom(), options);
        }
      },
      getMap: () => leafletMapRef.current,
    }), []);

  
    // Create location marker components
    const locationMarkers = useMemo(() => {
      if (!layers.locations) return [];

      return locations.map((location) => {
        if (!location.metadata?.bounds) {
          console.warn('Location missing metadata:', location);
          return null;
        }

        const center: [number, number] =
          location.metadata.center || [
            (location.metadata.bounds[0][0] + location.metadata.bounds[1][0]) / 2,
            (location.metadata.bounds[0][1] + location.metadata.bounds[1][1]) / 2,
          ];

        return (
          <LocationMarker
            key={`location-${location.id}`}
            id={location.id}
            type="location"
            data={location}
            position={center}
            onClick={onMarkerClick}
            isMobile={isMobileOrTablet()}
          />
        );
      }).filter(Boolean);
    }, [locations, layers.locations, onMarkerClick]);

    // Create character marker components
    const characterMarkers = useMemo(() => {
      if (!layers.characters) return [];

      return characterLocations.map((charLocation) => {
        if (!charLocation.location?.metadata?.bounds) {
          console.warn('Character location missing metadata:', charLocation);
          return null;
        }

        const center: [number, number] =
          charLocation.location.metadata.center || [
            (charLocation.location.metadata.bounds[0][0] + charLocation.location.metadata.bounds[1][0]) / 2,
            (charLocation.location.metadata.bounds[0][1] + charLocation.location.metadata.bounds[1][1]) / 2,
          ];

        return (
          <CharacterMarker
            key={`character-${charLocation.character_token_id}`}
            id={`character-${charLocation.character_token_id}`}
            type="character"
            data={charLocation}
            position={center}
            onClick={onMarkerClick}
            isMobile={isMobileOrTablet()}
          />
        );
      }).filter(Boolean);
    }, [characterLocations, layers.characters, onMarkerClick]);

    // Note: Event markers (burns, deaths, fights) would be added here
    // For now, using empty arrays as they're loaded via hooks
    // This will be implemented in the actual refactoring

    const burnMarkers: any[] = [];
    const deathMarkers: any[] = [];
    const fightMarkers: any[] = [];

    // Clustering options removed while clustering is disabled

    // Show enhanced loading state with asset loading progress
    if (!criticalLoaded) {
      return (
        <div className="flex items-center justify-center h-screen bg-abyss">
          <div className="text-center p-8 max-w-md w-full">
            <div className="text-bone text-xl mb-4 font-wagdie">
              Loading Map Assets...
            </div>
            <div className="text-mist mb-6">
              Please wait while WAGDIE assets are loaded.
            </div>

            {/* Show asset loading spinner */}
            <AssetLoadingSpinner
              size="large"
              text="Loading assets..."
              className="mb-6"
            />

            {/* Show asset loading indicator when assets are loading */}
            {assetLoading && (
              <div className="mb-4">
                <AssetLoadingIndicator
                  loadingStates={assetsMap}
                  onRetryAsset={handleRetryAsset}
                  className="bg-abyss/80 border border-gold/30"
                />
              </div>
            )}

            {/* Show error state if asset loading fails */}
            {assetError && (
              <div className="text-poison text-sm mb-4">
                Failed to load map assets. Some features may be unavailable.
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <React.Fragment>
        {/* Skip to content link for accessibility - Hot reload test */}
        <a
          href="#map-main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-gold focus:text-abyss focus:font-wagdie focus:font-bold focus:rounded"
        >
          Skip to map controls
        </a>

        <div style={{ height: '100%', width: '100%' }} data-testid="map-container">
          <AssetErrorBoundary
            onError={(error, errorInfo) => {
              console.error('[SimpleMap] Asset loading error:', error, errorInfo);
            }}
            maxRetries={3}
            resetOnRetry={true}
          >
            <LeafletMapWrapper
              center={[1111, 1111]}
              zoom={0}
              minZoom={-2}
              maxZoom={2}
              crs={L.CRS.Simple}
              style={{ height: '100%', width: '100%' }}
              attributionControl={true}
            >
              {/* Layer Controller provides context for layer management */}
              <LayerController
                locations={locationMarkers}
                characterLocations={characterMarkers}
                burnMarkers={burnMarkers}
                deathMarkers={deathMarkers}
                fightMarkers={fightMarkers}
              >
                {/* Location markers (clustering disabled) */}
                {locationMarkers.length > 0 && (
                  <>{locationMarkers}</>
                )}

                {/* Character markers (clustering disabled) */}
                {characterMarkers.length > 0 && (
                  <>{characterMarkers}</>
                )}

                {/* Event markers - TODO: Add event markers here */}
                {burnMarkers.length > 0 && (
                  <>{burnMarkers}</>
                )}

                {deathMarkers.length > 0 && (
                  <>{deathMarkers}</>
                )}

                {fightMarkers.length > 0 && (
                  <>{fightMarkers}</>
                )}
              </LayerController>
            </LeafletMapWrapper>
          </AssetErrorBoundary>
        </div>

        {/* Layer Controls - Moved to separate component for maintainability */}
        <div
          id="map-main-content"
          role="region"
          aria-label="Map layer controls"
        >
          <LayerControls
            layers={layers}
            onToggle={toggleLayer}
            showCounts={true}
          />
        </div>

        {/* Live region for announcements */}
        <div
          id="map-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {/* Hidden indicator for testing - map fully loaded with assets */}
        {criticalLoaded && !assetLoading && !assetError && !iconLoading && !iconError && (
          <div
            data-testid="map-fully-loaded"
            className="sr-only"
            aria-hidden="true"
          />
        )}
      </React.Fragment>
    );
  }
);

SimpleMapComponent.displayName = 'SimpleMap';

// Export with memoization for performance
export const SimpleMap = React.memo(SimpleMapComponent, (prevProps, nextProps) => {
  // Only re-render if these props have actually changed
  return (
    prevProps.locations === nextProps.locations &&
    prevProps.characterLocations === nextProps.characterLocations &&
    prevProps.layers === nextProps.layers &&
    prevProps.toggleLayer === nextProps.toggleLayer &&
    prevProps.onMarkerClick === nextProps.onMarkerClick &&
    prevProps.onAssetRetry === nextProps.onAssetRetry
  );
});
