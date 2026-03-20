// app/(dashboard)/chat/[id]/page.tsx
import { ChatList } from '@/components/chat/chat-list'
import { ChatWindow } from '@/components/chat/chat-window'
import { use } from 'react'

export default function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>  // ← đổi thành Promise
}) {
  const { id } = use(params)  // ← unwrap bằng use()

  return (
    <div className="flex h-full">
      <ChatList />
      <div className="flex-1 overflow-hidden">
        <ChatWindow chatId={id} />
      </div>
    </div>
  )
}