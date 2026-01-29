import type { Metadata } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://wagdie.com'

interface CharacterMetadata {
  token_id: number
  name?: string
  metadata?: {
    name?: string
    description?: string
    image?: string
  }
  image_url?: string
}

async function getCharacter(tokenId: string): Promise<CharacterMetadata | null> {
  try {
    // Use internal API route for metadata generation
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${apiUrl}/api/characters/${tokenId}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tokenId: string }>
}): Promise<Metadata> {
  const { tokenId } = await params
  const character = await getCharacter(tokenId)

  const characterName = character?.name || character?.metadata?.name || `Character #${tokenId}`
  const description = character?.metadata?.description ||
    `View ${characterName} - a unique WAGDIE NFT character. Explore stats, equipment, backstory, and on-chain history.`

  // Use local image path for OG image
  const imageUrl = `${BASE_URL}/images/characters/${tokenId}.png`

  return {
    title: `${characterName} (#${tokenId}) | WAGDIE Characters`,
    description,
    keywords: ['WAGDIE', 'NFT', characterName, `character ${tokenId}`, 'dark fantasy'],
    openGraph: {
      title: `${characterName} | WAGDIE Character #${tokenId}`,
      description,
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 512,
          height: 512,
          alt: characterName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${characterName} | WAGDIE #${tokenId}`,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `/characters/${tokenId}`,
    },
  }
}

export default function CharacterDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
