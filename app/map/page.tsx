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

      {/* Character List Toggle Button - Responsive with enhanced accessibility */}
      <button
        onClick={() => setShowCharacterPanel(!showCharacterPanel)}
        className={`fixed top-4 left-4 z-50 flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg border-2 font-wagdie font-bold tracking-wide transition-all min-h-[44px] focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-abyss ${
          showCharacterPanel
            ? 'bg-gold text-abyss border-gold'
            : 'bg-shadow text-gold border-gold hover:bg-gold/10'
        }`}
        aria-label="Toggle character list panel"
        aria-expanded={showCharacterPanel}
        aria-controls="character-list-panel"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && showCharacterPanel) {
            setShowCharacterPanel(false);
          }
        }}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span className="hidden xs:inline text-sm sm:text-base">My Characters</span>
        <span className="xs:hidden text-sm sm:text-base">Chars</span>
        {connectedWallet && (
          <div className="w-2 h-2 bg-gold rounded-full animate-pulse" aria-label="Wallet connected"></div>
        )}
      </button>

      {/* Character List Panel - Responsive positioning */}
      {showCharacterPanel && (
        <div
          id="character-list-panel"
          className="fixed top-20 left-4 right-4 sm:left-4 sm:right-auto sm:max-w-sm z-40"
          role="dialog"
          aria-label="Character list"
          aria-modal="false"
        >
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

      {/* Wallet Connection Prompt - Responsive with accessibility */}
      {!connectedWallet && (
        <button
          onClick={connectWallet}
          className="fixed top-4 right-4 z-50 px-3 sm:px-6 py-2 sm:py-3 bg-gold text-abyss font-wagdie font-bold rounded-lg border-2 border-gold hover:bg-ember transition-all tracking-wide min-h-[44px] text-sm sm:text-base focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-abyss"
          aria-label="Connect wallet to view your characters"
        >
          Connect Wallet
        </button>
      )}

      {/* Connected Wallet Indicator - Responsive with accessibility */}
      {connectedWallet && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 bg-shadow border-2 border-gold rounded-lg min-h-[44px]"
          role="status"
          aria-label="Connected wallet status"
        >
          <div className="w-2 h-2 bg-gold rounded-full animate-pulse" aria-hidden="true"></div>
          <span className="font-wagdie text-xs sm:text-sm text-bone hidden xs:inline" aria-label={`Wallet address: ${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`}>
            {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
          </span>
          <span className="font-wagdie text-xs sm:text-sm text-bone xs:hidden" aria-label={`Wallet: ${connectedWallet.slice(0, 4)}...${connectedWallet.slice(-2)}`}>
            {connectedWallet.slice(0, 4)}...{connectedWallet.slice(-2)}
          </span>
          <button
            onClick={() => {
              // Disconnect logic would go here
              window.location.reload();
            }}
            className="text-mist hover:text-bone transition-colors p-1 focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-abyss rounded"
            aria-label="Disconnect wallet"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
