import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Spread Infection | WAGDIE Mechanics',
  description: 'Burn corpses for Strange Mushrooms and spread the plague across the WAGDIE realm. Participate in the infection mechanics and shape the dark narrative.',
  keywords: ['WAGDIE infection', 'spread mechanics', 'burn corpses', 'Strange Mushrooms', 'WAGDIE gameplay'],
  openGraph: {
    title: 'Spread Infection | WAGDIE',
    description: 'Burn corpses and spread the plague across the WAGDIE realm.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spread Infection | WAGDIE',
    description: 'Burn corpses and spread the plague across the WAGDIE realm.',
  },
  alternates: {
    canonical: '/spread',
  },
}

export default function SpreadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
