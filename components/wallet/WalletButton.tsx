'use client'

import React from 'react';
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image'

/**
 * WalletButton Component
 *
 * Displays wallet connection status and provides connect/disconnect functionality.
 * Uses image-based buttons for a custom aesthetic.
 */
export function WalletButton() {
  const { address, isConnected, isAuthenticating, connect, disconnect } = useAuth()

  /**
   * Truncate Ethereum address to "0x1234...5678" format
   */
  const truncateAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Loading state
  if (isAuthenticating) {
    return (
      <div className="relative w-[160px] h-[48px] flex items-center justify-center">
         <Image
          src="/images/walletbutton/button-connect.png"
          alt="Connecting"
          fill
          className="object-contain opacity-50"
        />
        <span className="relative z-10 flex items-center gap-2 text-bone font-wagdie text-sm">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Connecting...
        </span>
      </div>
    )
  }

  // Connected state - show address with disconnect button background
  if (isConnected && address) {
    return (
      <button
        className="relative w-[160px] h-[48px] group"
        onClick={disconnect}
        title="Click to disconnect"
      >
        <Image
          src="/images/walletbutton/button-disconnect.png"
          alt="Disconnect"
          fill
          className="object-contain transition-opacity duration-200 group-hover:opacity-90"
        />
        <span className="relative z-10 text-bone font-wagdie text-sm tracking-wider group-hover:text-gold transition-colors">
          {truncateAddress(address)}
        </span>
      </button>
    )
  }

  // Disconnected state - show connect button
  return (
    <button
      className="relative w-[160px] h-[48px] group"
      onClick={connect}
    >
      <Image
        src="/images/walletbutton/button-connect.png"
        alt="Connect Wallet"
        fill
        className="object-contain transition-opacity duration-200 group-hover:opacity-90"
      />
      <span className="relative z-10 text-abyss font-wagdie font-bold text-sm tracking-wider group-hover:text-black transition-colors uppercase mt-1 block">
        Connect Wallet
      </span>
    </button>
  )
}
