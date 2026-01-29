import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SkipLink } from '@/components/ui'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://wagdie.com'

// JSON-LD Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'WAGDIE',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/images/wagdielogo.png`,
      },
      sameAs: [
        'https://twitter.com/WAGDIE_ETH',
        'https://discord.gg/wagdie',
        'https://opensea.io/collection/we-are-all-going-to-die',
      ],
      description: 'Community-driven dark fantasy NFT project where your choices shape the narrative.',
    },
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: 'WAGDIE - We Are All Going to Die',
      description: 'WAGDIE NFT Community Platform - Explore characters, lore, and participate in the dark fantasy world.',
      publisher: {
        '@id': `${BASE_URL}/#organization`,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${BASE_URL}/characters?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'CollectionPage',
      '@id': `${BASE_URL}/characters#collection`,
      url: `${BASE_URL}/characters`,
      name: 'WAGDIE Character Collection',
      description: 'Browse all 6,666 unique WAGDIE NFT characters.',
      isPartOf: {
        '@id': `${BASE_URL}/#website`,
      },
      about: {
        '@type': 'CreativeWork',
        name: 'WAGDIE NFT Collection',
        description: 'A collection of 6,666 unique dark fantasy NFT characters on Ethereum.',
      },
    },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'WAGDIE - We Are All Going to Die',
  description: 'WAGDIE NFT Community Platform - Connect your wallet to explore characters, lore, and participate in the dark fantasy world where your choices shape the narrative.',
  keywords: ['WAGDIE', 'NFT', 'Ethereum', 'Dark Fantasy', 'Community', 'Web3', 'Gaming'],
  authors: [{ name: 'WAGDIE Community' }],
  openGraph: {
    title: 'WAGDIE - We Are All Going to Die',
    description: 'Community-driven dark fantasy NFT project where your choices shape the narrative',
    type: 'website',
    siteName: 'WAGDIE',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WAGDIE - We Are All Going to Die',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WAGDIE - We Are All Going to Die',
    description: 'Community-driven dark fantasy NFT project',
    images: ['/images/og-image.png'],
    creator: '@WAGDIE_ETH',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex flex-col min-h-screen bg-soul-950 text-neutral-300 selection:bg-soul-blood selection:text-white">
        <Providers>
          <SkipLink />
          <Header />
          <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
