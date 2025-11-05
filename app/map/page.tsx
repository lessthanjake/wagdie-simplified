'use client';

import dynamic from 'next/dynamic';
import { useState, useRef } from 'react';
import { useMapData } from '@/hooks/map/useMapData';
import { useMapLayers } from '@/hooks/map/useMapLayers';
import { useWallet } from '@/hooks/map/useWallet';
import { CharacterListPanel } from '@/components/map/CharacterListPanel';
import type { CharacterLocation } from '@/lib/types/map';
import type { SimpleMapRef } from '@/components/map/SimpleMap';

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
  const { connectedWallet, connectWallet } = useWallet();
  const [showCharacterPanel, setShowCharacterPanel] = useState(false);
  const mapRef = useRef<SimpleMapRef>(null);

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
    <div className="w-full h-screen relative">
      <SimpleMap
        locations={locations}
        characterLocations={characterLocations}
        layers={layers}
        toggleLayer={toggleLayer}
        onMarkerClick={(marker) => {
          console.log('Marker clicked:', marker);
        }}
        ref={mapRef}
      />

      {/* Character List Toggle Button */}
      <button
        onClick={() => setShowCharacterPanel(!showCharacterPanel)}
        className={`fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-wagdie font-bold tracking-wide transition-all ${
          showCharacterPanel
            ? 'bg-gold text-abyss border-gold'
            : 'bg-shadow text-gold border-gold hover:bg-gold/10'
        }`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span>My Characters</span>
        {connectedWallet && (
          <div className="w-2 h-2 bg-gold rounded-full animate-pulse"></div>
        )}
      </button>

      {/* Character List Panel */}
      {showCharacterPanel && (
        <div className="fixed top-20 left-4 z-40">
          <CharacterListPanel
            characters={characterLocations}
            connectedWallet={connectedWallet}
            onCharacterSelect={(character: CharacterLocation) => {
              // Focus map on the selected character
              if (mapRef.current) {
                const [y, x] = [character.position.y, character.position.x];
                mapRef.current.setView([y, x], 1, {
                  animate: true,
                  duration: 0.5,
                });
              }
            }}
            onClose={() => setShowCharacterPanel(false)}
          />
        </div>
      )}

      {/* Wallet Connection Prompt */}
      {!connectedWallet && (
        <button
          onClick={connectWallet}
          className="fixed top-4 right-4 z-50 px-6 py-3 bg-gold text-abyss font-wagdie font-bold rounded-lg border-2 border-gold hover:bg-ember transition-all tracking-wide"
        >
          Connect Wallet
        </button>
      )}

      {/* Connected Wallet Indicator */}
      {connectedWallet && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-shadow border-2 border-gold rounded-lg">
          <div className="w-2 h-2 bg-gold rounded-full animate-pulse"></div>
          <span className="font-wagdie text-sm text-bone">
            {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
          </span>
          <button
            onClick={() => {
              // Disconnect logic would go here
              window.location.reload();
            }}
            className="text-mist hover:text-bone transition-colors"
            aria-label="Disconnect wallet"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
