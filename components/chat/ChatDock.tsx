'use client'

import { memo } from 'react'
import { useChatDock } from '@/contexts/ChatDockContext'
import { ChatSidebar } from './ChatSidebar'

function ChatDockComponent() {
  const { isOpen, target, closeChat } = useChatDock()

  if (!target) return null

  return (
    <ChatSidebar
      key={target.tokenId}
      tokenId={target.tokenId}
      characterName={target.characterName}
      characterId={target.characterId}
      isOpen={isOpen}
      onClose={closeChat}
    />
  )
}

export const ChatDock = memo(ChatDockComponent)