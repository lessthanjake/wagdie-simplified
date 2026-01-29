import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse 6,666 WAGDIE Characters | WAGDIE',
  description: 'Explore the complete collection of 6,666 unique WAGDIE NFT characters. Filter by traits, origins, alignments, and equipment. View character sheets, stats, and lore.',
  keywords: ['WAGDIE characters', 'NFT collection', 'dark fantasy NFT', 'character browser', 'WAGDIE traits'],
  openGraph: {
    title: 'Browse 6,666 WAGDIE Characters',
    description: 'Explore the complete collection of unique WAGDIE NFT characters with detailed traits and lore.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse 6,666 WAGDIE Characters',
    description: 'Explore the complete collection of unique WAGDIE NFT characters.',
  },
  alternates: {
    canonical: '/characters',
  },
}

export default function CharactersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
