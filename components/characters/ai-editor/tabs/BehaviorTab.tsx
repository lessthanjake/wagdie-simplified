/**
 * BehaviorTab Component
 * Container for Topics, Adjectives, and Style editors - character behavior configuration
 */

'use client'

import { memo } from 'react'
import { TopicsEditor } from '../editors/TopicsEditor'
import { AdjectivesEditor } from '../editors/AdjectivesEditor'
import { StyleEditor } from '../editors/StyleEditor'
import type { StyleConfig } from '@/types/eliza'

interface BehaviorTabProps {
  /** Topics array values */
  topics: string[]
  /** Adjectives array values */
  adjectives: string[]
  /** Style configuration */
  style: StyleConfig
  /** Callback when topics change */
  onTopicsChange: (value: string[]) => void
  /** Callback when adjectives change */
  onAdjectivesChange: (value: string[]) => void
  /** Callback when style changes */
  onStyleChange: (value: StyleConfig) => void
  /** Whether editors are disabled */
  disabled?: boolean
  /** Whether editors are read-only */
  readOnly?: boolean
}

function BehaviorTabComponent({
  topics,
  adjectives,
  style,
  onTopicsChange,
  onAdjectivesChange,
  onStyleChange,
  disabled = false,
  readOnly = false,
}: BehaviorTabProps) {
  return (
    <div
      role="tabpanel"
      id="tabpanel-behavior"
      aria-labelledby="tab-behavior"
      className="space-y-8 py-6"
    >
      {/* Introduction */}
      <div className="pb-4 border-b border-neutral-800">
        <h3 className="text-2xl font-display text-neutral-200 mb-2">
          Character Behavior
        </h3>
        <p className="text-md text-neutral-500">
          Configure how your character behaves in conversations. Topics define areas of
          expertise, adjectives shape personality, and style rules control communication
          patterns across different contexts.
        </p>
      </div>

      {/* Topics and Adjectives side by side on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopicsEditor
          value={topics}
          onChange={onTopicsChange}
          disabled={disabled}
          readOnly={readOnly}
        />
        <AdjectivesEditor
          value={adjectives}
          onChange={onAdjectivesChange}
          disabled={disabled}
          readOnly={readOnly}
        />
      </div>

      {/* Style Editor */}
      <StyleEditor
        value={style}
        onChange={onStyleChange}
        disabled={disabled}
        readOnly={readOnly}
      />
    </div>
  )
}

export const BehaviorTab = memo(BehaviorTabComponent)
