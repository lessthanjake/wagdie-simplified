import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'WAGDIE Lore & History | Official Narrative',
  description: 'Follow the official WAGDIE narrative through tweets and announcements. Explore the dark fantasy lore, character stories, and world history of the dying realm.',
  keywords: ['WAGDIE lore', 'WAGDIE story', 'dark fantasy narrative', 'NFT lore', 'WAGDIE history'],
  openGraph: {
    title: 'WAGDIE Lore & History',
    description: 'Follow the official WAGDIE narrative. Explore the dark fantasy lore and world history.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WAGDIE Lore & History',
    description: 'Follow the official WAGDIE narrative and explore the dark fantasy lore.',
  },
  alternates: {
    canonical: '/lore',
  },
}

export default function LoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
