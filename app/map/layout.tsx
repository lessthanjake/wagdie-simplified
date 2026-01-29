import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'WAGDIE World Map | Explore Locations & Staking',
  description: 'Explore the interactive WAGDIE world map. Discover locations, stake your characters, track fallen warriors, and witness the dark realm unfold.',
  keywords: ['WAGDIE map', 'world map', 'NFT staking', 'WAGDIE locations', 'character staking'],
  openGraph: {
    title: 'WAGDIE World Map',
    description: 'Explore the interactive WAGDIE world map. Stake characters and discover locations.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WAGDIE World Map',
    description: 'Explore the interactive WAGDIE world map and stake your characters.',
  },
  alternates: {
    canonical: '/map',
  },
}

export default function MapLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
