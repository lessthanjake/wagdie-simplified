/**
 * KnowledgeEditor Component
 * Editor for knowledge document uploads - RAG integration support
 */

'use client'

import { memo, useCallback, useRef, useState } from 'react'
import { FIELD_LIMITS } from '@/types/eliza'
import type { KnowledgeDocument } from '@/types/eliza'

interface KnowledgeEditorProps {
  /** Array of knowledge documents */
  documents: KnowledgeDocument[]
  /** Whether upload is in progress */
  isUploading?: boolean
  /** Callback when upload is triggered */
  onUpload: (file: File) => Promise<void>
  /** Callback when document is removed */
  onRemove: (documentId: string) => void
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Whether the editor is read-only */
  readOnly?: boolean
  /** Error message */
  error?: string | null
}

function KnowledgeEditorComponent({
  documents,
  isUploading = false,
  onUpload,
  onRemove,
  disabled = false,
  readOnly = false,
  error = null,
}: KnowledgeEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const canUpload = documents.length < FIELD_LIMITS.maxKnowledgeDocs && !readOnly && !disabled

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
        alert('Only .txt and .md files are supported')
        return
      }

      // Validate file size
      if (file.size > FIELD_LIMITS.maxKnowledgeSize) {
        alert(`File must be under ${FIELD_LIMITS.maxKnowledgeSize / 1024}KB`)
        return
      }

      await onUpload(file)
    },
    [onUpload]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFileSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)

      if (!canUpload || isUploading) return

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [canUpload, isUploading, handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-xl font-display text-neutral-400">
          Knowledge Documents
        </label>
        <span className="text-xs text-neutral-500">
          {documents.length} / {FIELD_LIMITS.maxKnowledgeDocs} documents
        </span>
      </div>

      {/* Documents list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-700 rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* File icon */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-neutral-800 rounded">
                  <svg
                    className="w-4 h-4 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>

                {/* File info */}
                <div className="min-w-0">
                  <p className="text-sm text-neutral-200 truncate">{doc.filename}</p>
                  <p className="text-xs text-neutral-500">
                    {formatFileSize(doc.size)} &bull; {formatDate(doc.uploadedAt)}
                  </p>
                </div>
              </div>

              {/* Remove button */}
              {!readOnly && !disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(doc.id)}
                  className="flex-shrink-0 p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                  aria-label={`Remove ${doc.filename}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {canUpload && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative p-6 border-2 border-dashed rounded-lg text-center transition-colors
            ${
              dragActive
                ? 'border-soul-500 bg-soul-500/5'
                : 'border-neutral-700 hover:border-neutral-500'
            }
            ${isUploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            onChange={handleInputChange}
            disabled={disabled || isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Upload knowledge document"
          />

          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <>
                <div className="w-8 h-8 border-2 border-soul-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-neutral-400">Uploading...</p>
              </>
            ) : (
              <>
                <svg
                  className="w-8 h-8 text-neutral-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-md text-neutral-400">
                  <span className="text-soul-400 hover:text-soul-300">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-sm text-neutral-500">
                  .txt or .md files up to {FIELD_LIMITS.maxKnowledgeSize / 1024}KB
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {/* Help text */}
      <p className="text-md text-neutral-500">
        Knowledge documents provide reference material for RAG (retrieval-augmented generation).
        The AI can draw from this content when answering questions.
      </p>
    </div>
  )
}

export const KnowledgeEditor = memo(KnowledgeEditorComponent)
