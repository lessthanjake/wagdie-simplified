/**
 * ExamplesTab Component
 * Container for Example Messages and Post Examples editors
 */

'use client'

import { memo } from 'react'
import { ExampleMessagesEditor } from '../ExampleMessagesEditor'
import { PostExamplesEditor } from '../editors/PostExamplesEditor'
import type { ExampleMessage } from '@/types/eliza'

interface ExamplesTabProps {
  /** Example messages array */
  exampleMessages: ExampleMessage[]
  /** Post examples array */
  postExamples: string[]
  /** Callback when example messages change */
  onExampleMessagesChange: (value: ExampleMessage[]) => void
  /** Callback when post examples change */
  onPostExamplesChange: (value: string[]) => void
  /** Whether editors are disabled */
  disabled?: boolean
  /** Whether editors are read-only */
  readOnly?: boolean
}

function ExamplesTabComponent({
  exampleMessages,
  postExamples,
  onExampleMessagesChange,
  onPostExamplesChange,
  disabled = false,
  readOnly = false,
}: ExamplesTabProps) {
  return (
    <div
      role="tabpanel"
      id="tabpanel-examples"
      aria-labelledby="tab-examples"
      className="space-y-8 py-6"
    >
      {/* Introduction */}
      <div className="pb-4 border-b border-neutral-800">
        <h3 className="text-2xl font-display text-neutral-200 mb-2">
          Example Content
        </h3>
        <p className="text-md text-neutral-500">
          Provide examples of how your character communicates. Message examples train
          conversational patterns, while post examples shape social media content generation.
        </p>
      </div>

      {/* Example Messages Editor (existing component) */}
      <div>
        <h4 className="text-lg font-display text-neutral-400 mb-4">
          Conversation Examples
        </h4>
        <ExampleMessagesEditor
          value={exampleMessages}
          onChange={onExampleMessagesChange}
          disabled={disabled}
          readOnly={readOnly}
        />
      </div>

      {/* Post Examples Editor */}
      <PostExamplesEditor
        value={postExamples}
        onChange={onPostExamplesChange}
        disabled={disabled}
        readOnly={readOnly}
      />
    </div>
  )
}

export const ExamplesTab = memo(ExamplesTabComponent)
