/**
 * Knowledge API Route
 * GET /api/eliza/characters/[tokenId]/knowledge - List knowledge documents
 * POST /api/eliza/characters/[tokenId]/knowledge - Upload knowledge document
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  appendKnowledgeDocument,
  getKnowledgeDocuments,
  getKnowledgeRecordByTokenId,
  replaceKnowledgeDocuments,
  toKnowledgeDocumentSummary,
} from '@/lib/eliza/knowledge'
import { FIELD_LIMITS } from '@/types/eliza'
import { randomUUID } from 'crypto'

interface RouteParams {
  params: Promise<{ tokenId: string }>
}

// Maximum file size: 50KB as per spec
const MAX_FILE_SIZE = 50 * 1024

// Allowed file types
const ALLOWED_TYPES = [
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv',
]

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.csv']

/**
 * GET /api/eliza/characters/[tokenId]/knowledge
 * Returns list of knowledge documents for a character
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { tokenId } = await params

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      )
    }

    const record = await getKnowledgeRecordByTokenId(tokenId)

    if (!record) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    const character = record.character as Record<string, unknown>
    const documents = getKnowledgeDocuments(character).map(toKnowledgeDocumentSummary)

    return NextResponse.json({ documents }, { status: 200 })
  } catch (error) {
    console.error('[Knowledge API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge documents' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/eliza/characters/[tokenId]/knowledge
 * Upload a new knowledge document
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { tokenId } = await params

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024}KB` },
        { status: 400 }
      )
    }

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const isValidExtension = ALLOWED_EXTENSIONS.includes(fileExtension)
    const isValidType = ALLOWED_TYPES.includes(file.type) || file.type === ''

    if (!isValidExtension && !isValidType) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Read file content
    const content = await file.text()

    // Get current character using canonical record lookup
    const record = await getKnowledgeRecordByTokenId(tokenId)

    if (!record) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    const character = record.character as Record<string, unknown>
    const currentKnowledge = getKnowledgeDocuments(character)

    // Check document limit
    if (currentKnowledge.length >= FIELD_LIMITS.maxKnowledgeDocs) {
      return NextResponse.json(
        { error: `Maximum ${FIELD_LIMITS.maxKnowledgeDocs} documents allowed` },
        { status: 400 }
      )
    }

    // Create new knowledge document
    const newDocument = {
      id: randomUUID(),
      path: file.name,
      content,
    }

    await replaceKnowledgeDocuments(
      record,
      appendKnowledgeDocument(currentKnowledge, newDocument)
    )

    // Return the new document (without full content)
    return NextResponse.json(
      {
        id: newDocument.id,
        path: newDocument.path,
        filename: newDocument.path,
        content: newDocument.content,
        size: content.length,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Knowledge API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to upload knowledge document' },
      { status: 500 }
    )
  }
}
