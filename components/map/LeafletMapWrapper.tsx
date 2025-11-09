/**
 * LeafletMapWrapper Component
 *
 * A robust wrapper for React-Leaflet MapContainer that handles all lifecycle issues
 * and prevents "_leaflet_events" errors during cleanup and HMR.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MapContainer as LeafletMapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletMapWrapperProps {
  children: React.ReactNode;
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  crs?: any;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  attributionControl?: boolean;
  whenReady?: (map: L.Map) => void;
}

// Fix for default markers in react-leaflet with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * ImageOverlay component for WAGDIE world map
 */
function WAGDIEImageOverlay() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    map.attributionControl.setPrefix('WAGDIE World');

    // Add WAGDIE world image overlay
    const bounds: L.LatLngBoundsExpression = [[0, 0], [2222, 2222]];
    const imageOverlay = L.imageOverlay('/images/wagdiemap.png', bounds, {
      zIndex: 1, // Ensure image is at bottom layer
      className: 'wagdie-map-overlay'
    });

    try {
      imageOverlay.addTo(map);
      map.fitBounds(bounds);

      return () => {
        try {
          imageOverlay.remove();
        } catch (e) {
          // Ignore errors during cleanup
        }
      };
    } catch (e) {
      // If image overlay fails to load, still set up the map
      console.warn('Failed to load map image overlay:', e);
      return undefined;
    }
  }, [map]);

  return null;
}

/**
 * Global registry to track active maps and prevent duplicate initialization
 * Uses mapKey for consistent registry access
 */
const activeMaps = new Map<string, L.Map>();

/**
 * Set to track ongoing cleanup operations to prevent race conditions
 */
const cleanupOperations = new Set<string>();

/**
 * Force cleanup of DOM container to prevent reuse conflicts
 */
function forceCleanupContainer(container: HTMLElement): void {
  try {
    // Validate container exists and has valid parent
    if (!container || !container.parentNode) {
      console.warn('[LeafletMapWrapper] Container or parent node not available for cleanup');
      return;
    }

    // Clear all Leaflet references
    (container as any)._leaflet_id = undefined;

    // Remove all event listeners by cloning the node
    if (container.parentNode && container.parentNode.nodeType === Node.ELEMENT_NODE) {
      const newContainer = container.cloneNode(false) as HTMLElement;

      // Copy essential attributes only if container is valid
      if (newContainer) {
        newContainer.style.cssText = container.style.cssText || '';
        newContainer.className = container.className || '';
        newContainer.id = container.id || '';

        // Safely replace the container
        try {
          container.parentNode.replaceChild(newContainer, container);
        } catch (replaceError) {
          console.warn('[LeafletMapWrapper] Error replacing container:', replaceError);
          // Fallback: just clear the container if replacement fails
          container.innerHTML = '';
          (container as any)._leaflet_id = undefined;
        }
      }
    }
  } catch (error) {
    console.warn('[LeafletMapWrapper] Error forcing container cleanup:', error);
  }
}

/**
 * Cleanup function to safely remove a map instance
 * Uses mapKey for consistent registry access and cleanup tracking
 */
function safelyCleanupMap(mapKey: string, map: L.Map): Promise<void> {
  return new Promise((resolve) => {
    // Prevent concurrent cleanup operations
    if (cleanupOperations.has(mapKey)) {
      console.log(`[LeafletMapWrapper] Cleanup already in progress for: ${mapKey}`);
      resolve();
      return;
    }

    cleanupOperations.add(mapKey);
    console.log(`[LeafletMapWrapper] Starting cleanup for map: ${mapKey}`);

    try {
      // Remove from global registry first
      activeMaps.delete(mapKey);

      // Get container reference with enhanced validation
      const container = map.getContainer();
      if (!map || !container || typeof container !== 'object') {
        console.log(`[LeafletMapWrapper] Map ${mapKey} already cleaned up or invalid`);
        cleanupOperations.delete(mapKey);
        resolve();
        return;
      }

        // Safely remove all layers
      try {
        map.eachLayer((layer) => {
          try {
            if (layer && typeof layer.remove === 'function') {
              map.removeLayer(layer);
            }
          } catch (layerError) {
            console.warn(`[LeafletMapWrapper] Error removing layer:`, layerError);
          }
        });
      } catch (layersError) {
        console.warn(`[LeafletMapWrapper] Error removing layers:`, layersError);
      }

      // Safely clear all event listeners
      try {
        if (typeof map.off === 'function') {
          map.off();
        }
      } catch (eventsError) {
        console.warn(`[LeafletMapWrapper] Error clearing events:`, eventsError);
      }

      // Invalidate and remove the map
      try {
        map.invalidateSize({ pan: false });
        if (typeof map.remove === 'function') {
          map.remove();
        }
      } catch (removeError) {
        console.warn(`[LeafletMapWrapper] Error during map removal:`, removeError);
      }

      // Force cleanup of the DOM container to prevent reuse conflicts
      forceCleanupContainer(container);

      console.log(`[LeafletMapWrapper] Successfully cleaned up map: ${mapKey}`);

    } catch (error) {
      console.error(`[LeafletMapWrapper] Critical error during map cleanup:`, error);
    } finally {
      // Always remove from cleanup operations set
      cleanupOperations.delete(mapKey);
    }

    resolve();
  });
}

/**
 * Component to bridge map instance and handle cleanup
 */
function MapInstanceBridge({
  mapKey,
  onReady
}: {
  mapKey: string;
  onReady?: (map: L.Map) => void;
}) {
  const map = useMap();
  const cleanupRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    // Register map instance with mapKey for consistency
    activeMaps.set(mapKey, map);
    console.log(`[LeafletMapWrapper] Map instance registered: ${mapKey}`);

    // Call ready callback
    if (onReady) {
      onReady(map);
    }

    // Create cleanup function
    cleanupRef.current = () => {
      return safelyCleanupMap(mapKey, map);
    };

    return () => {
      console.log(`[LeafletMapWrapper] Cleanup effect triggered for map: ${mapKey}`);
      if (cleanupRef.current) {
        // Don't await cleanup in unmount effect, let it run in background
        cleanupRef.current().catch(error => {
          console.warn(`[LeafletMapWrapper] Error during async cleanup:`, error);
        });
      }
    };
  }, [mapKey, onReady]);

  // Additional cleanup on window unload
  useEffect(() => {
    const handleUnload = () => {
      if (cleanupRef.current) {
        cleanupRef.current().catch(error => {
          console.warn(`[LeafletMapWrapper] Error during unload cleanup:`, error);
        });
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return null;
}

/**
 * Main LeafletMapWrapper component
 */
const LeafletMapWrapper: React.FC<LeafletMapWrapperProps> = ({
  children,
  center,
  zoom,
  minZoom = -2,
  maxZoom = 2,
  crs = L.CRS.Simple,
  style = { height: '100%', width: '100%' },
  className = '',
  id = 'wagdie-map', // Remove static default to prevent conflicts
  attributionControl = true,
  whenReady
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  // Generate unique mapKey and containerId for this component instance
  const [mapKey] = useState(() => `${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const containerId = mapKey; // Use mapKey for DOM container ID
  const mapRef = useRef<L.Map | null>(null);
  const initializedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Enhanced initialization with React 18 + HMR compatibility
  useEffect(() => {
    // Create abort controller for this initialization cycle
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // Prevent double initialization in StrictMode
    if (initializedRef.current || signal.aborted) {
      console.log(`[LeafletMapWrapper] Skipping double initialization for: ${mapKey}`);
      return;
    }

    const timer = setTimeout(async () => {
      // Check if initialization was aborted
      if (signal.aborted) {
        console.log(`[LeafletMapWrapper] Initialization aborted for: ${mapKey}`);
        return;
      }

      // AGGRESSIVE CLEANUP: Clean up ALL existing maps before creating new one
      console.log(`[LeafletMapWrapper] Starting aggressive cleanup of all existing maps`);
      for (const [existingMapKey, existingMap] of activeMaps.entries()) {
        try {
          console.log(`[LeafletMapWrapper] Aggressively cleaning up map: ${existingMapKey}`);
          await safelyCleanupMap(existingMapKey, existingMap);
        } catch (cleanupError) {
          console.warn(`[LeafletMapWrapper] Error during aggressive cleanup:`, cleanupError);
        }
      }

      // Clean up any existing map with same mapKey from previous mounts (fallback)
      const existingMap = activeMaps.get(mapKey);
      if (existingMap) {
        console.log(`[LeafletMapWrapper] Cleaning up existing map: ${mapKey}`);
        try {
          await safelyCleanupMap(mapKey, existingMap);
        } catch (cleanupError) {
          console.warn(`[LeafletMapWrapper] Error during map cleanup:`, cleanupError);
        }
      }

      // Check for and clean up existing DOM container with enhanced validation
      try {
        const existingContainer = document.getElementById(containerId);
        if (existingContainer && existingContainer.parentNode) {
          console.log(`[LeafletMapWrapper] Cleaning up existing DOM container: ${containerId}`);
          forceCleanupContainer(existingContainer);
        }
      } catch (containerError) {
        console.warn(`[LeafletMapWrapper] Error during initial container cleanup:`, containerError);
      }

      // AGGRESSIVE DOM CLEANUP: Remove any orphaned Leaflet containers
      try {
        const leafletContainers = document.querySelectorAll('.leaflet-container, [id*="leaflet"], [id*="wagdie-map"], [id*="map"]');
        console.log(`[LeafletMapWrapper] Found ${leafletContainers.length} potential Leaflet containers to clean up`);

        leafletContainers.forEach((container) => {
          if (container.id !== containerId && container.parentNode) {
            console.log(`[LeafletMapWrapper] Removing orphaned Leaflet container: ${container.id || 'unnamed'}`);
            try {
              container.parentNode.removeChild(container);
            } catch (removeError) {
              console.warn(`[LeafletMapWrapper] Error removing orphaned container:`, removeError);
            }
          }
        });
      } catch (domCleanupError) {
        console.warn(`[LeafletMapWrapper] Error during aggressive DOM cleanup:`, domCleanupError);
      }

      // Final check before rendering
      if (!signal.aborted) {
        initializedRef.current = true;
        setShouldRender(true);
      }
    }, 1200); // Further increased delay to ensure cleanup completes

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [mapKey, containerId]);

  // Enhanced cleanup on unmount with async support
  useEffect(() => {
    return () => {
      console.log(`[LeafletMapWrapper] Component unmounting, cleaning up map: ${mapKey}`);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      initializedRef.current = false;

      const map = mapRef.current || activeMaps.get(mapKey);
      if (map) {
        // Async cleanup - don't block unmount
        safelyCleanupMap(mapKey, map).catch(error => {
          console.warn(`[LeafletMapWrapper] Error during unmount cleanup:`, error);
        });
      }

      // Also clean up the DOM container with enhanced validation
      try {
        const container = document.getElementById(containerId);
        if (container && container.parentNode) {
          forceCleanupContainer(container);
        }
      } catch (containerError) {
        console.warn(`[LeafletMapWrapper] Error during container cleanup:`, containerError);
      }
    };
  }, [mapKey, containerId]);

  if (!shouldRender) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a'
        }}
      >
        <div style={{ color: '#666', fontSize: '14px' }}>
          Initializing map...
        </div>
      </div>
    );
  }

  return (
    <LeafletMapContainer
      key={mapKey}
      id={containerId}
      ref={(mapInstance: L.Map | null) => {
        if (mapInstance) {
          mapRef.current = mapInstance;
          // Use mapKey for consistent registry access
          activeMaps.set(mapKey, mapInstance);
          if (whenReady) {
            whenReady(mapInstance);
          }
        }
      }}
      center={center}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      crs={crs}
      style={style}
      className={className}
      attributionControl={attributionControl}
    >
      <MapInstanceBridge mapKey={mapKey} onReady={whenReady} />
      <WAGDIEImageOverlay />
      {children}
    </LeafletMapContainer>
  );
};

export default LeafletMapWrapper;