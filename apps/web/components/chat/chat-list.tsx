'use client'

// components/chat/chat-list.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Plus, MessageSquare, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface Chat {
  id: string
  title: string
  createdAt: string
  messages: { content: string; role: string }[]
}

export function ChatList() {
  const router = useRouter()
  const params = useParams()
  const activeChatId = params?.id as string
  const queryClient = useQueryClient()

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data } = await api.get('/chats')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/chats', {})
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      router.push(`/chat/${data.id}`)
    },
    onError: () => toast.error('Failed to create chat'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/chats/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      if (activeChatId === id) router.push('/chat')
    },
    onError: () => toast.error('Failed to delete chat'),
  })

  return (
    <div className="flex flex-col w-64 h-full border-r border-border shrink-0 bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium">Chats</span>
        <Button
          size="icon"
          variant="ghost"
          className="w-7 h-7"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Plus className="w-4 h-4" />
          }
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <MessageSquare className="w-6 h-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No chats yet</p>
          </div>
        ) : (
          chats.map((chat: Chat) => (
            <div
              key={chat.id}
              onClick={() => router.push(`/chat/${chat.id}`)}
              className={cn(
                'group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                activeChatId === chat.id
                  ? 'bg-secondary'
                  : 'hover:bg-secondary/50',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{chat.title}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {chat.messages?.[0]?.content
                    ? chat.messages[0].content.slice(0, 40) + '...'
                    : formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })
                  }
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteMutation.mutate(chat.id)
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}