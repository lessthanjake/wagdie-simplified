'use client';

import { useState, useEffect } from 'react';

export function useWallet() {
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Mock wallet connection for demo purposes
  // In production, this would integrate with wagmi/viem
  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      // Simulate wallet connection
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock wallet address (in production, get from wallet provider)
      const mockWalletAddress = '0x1234567890abcdef1234567890abcdef12345678';
      setConnectedWallet(mockWalletAddress);
      console.log('[useWallet] Connected wallet:', mockWalletAddress);
    } catch (error) {
      console.error('[useWallet] Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setConnectedWallet(null);
    console.log('[useWallet] Disconnected wallet');
  };

  // Auto-connect for demo (optional)
  useEffect(() => {
    // Uncomment to auto-connect in demo
    // connectWallet();
  }, []);

  return {
    connectedWallet,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
}
