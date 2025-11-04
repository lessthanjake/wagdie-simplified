'use client';

import { useState, useCallback } from 'react';
import type { LayerVisibility } from '@/lib/types/map';

const DEFAULT_LAYERS: LayerVisibility = {
  locations: true,
  characters: true,
  burns: false,
  deaths: false,
  fights: false,
};

export function useMapLayers() {
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);

  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  }, []);

  return { layers, toggleLayer };
}
