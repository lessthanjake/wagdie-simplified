/**
 * Knowledge Document API Route
 * GET /api/eliza/characters/[tokenId]/knowledge/[documentId] - Get document
 * DELETE /api/eliza/characters/[tokenId]/knowledge/[documentId] - Delete document
 */

import { NextRequest, NextResponse } from 'next/server'
import { getElizaClient } from '@/lib/eliza/client'

interface RouteParams {
  params: Promise<{ tokenId: string; documentId: string }>
}

/**
 * GET /api/eliza/characters/[tokenId]/knowledge/[documentId]
 * Returns a specific knowledge document with full content
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { tokenId, documentId } = await params

    if (!tokenId || !documentId) {
      return NextResponse.json(
        { error: 'Token ID and Document ID are required' },
        { status: 400 }
      )
    }

    const client = getElizaClient()
    const character = await client.characters.get(tokenId)

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    const document = (character.knowledge || []).find((doc) => doc.id === documentId)

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        id: document.id,
        path: document.path,
        filename: document.path,
        content: document.content,
        size: document.content?.length || 0,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Knowledge API] GET document error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/eliza/characters/[tokenId]/knowledge/[documentId]
 * Deletes a specific knowledge document
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { tokenId, documentId } = await params

    if (!tokenId || !documentId) {
      return NextResponse.json(
        { error: 'Token ID and Document ID are required' },
        { status: 400 }
      )
    }

    const client = getElizaClient()
    const character = await client.characters.get(tokenId)

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    const currentKnowledge = character.knowledge || []
    const documentIndex = currentKnowledge.findIndex((doc) => doc.id === documentId)

    if (documentIndex === -1) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Remove the document
    const updatedKnowledge = currentKnowledge.filter((doc) => doc.id !== documentId)

    // Update character
    await client.characters.update(tokenId, {
      knowledge: updatedKnowledge,
    })

    return NextResponse.json(
      { success: true, message: 'Document deleted' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Knowledge API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete knowledge document' },
      { status: 500 }
    )
  }
}
