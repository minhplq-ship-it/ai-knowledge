// app/(dashboard)/chat/page.tsx
import { ChatList } from '@/components/chat/chat-list'

export default function ChatPage() {
  return (
    <div className="flex h-full">
      <ChatList />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">Select a chat</p>
          <p className="text-xs text-muted-foreground">
            Or create a new one with the + button
          </p>
        </div>
      </div>
    </div>
  )
}