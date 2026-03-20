'use client'

// components/chat/chat-window.tsx
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SendHorizontal, Loader2, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  createdAt: string
}

export function ChatWindow({ chatId }: { chatId: string }) {
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      const { data } = await api.get(`/chats/${chatId}/messages`)
      return data
    },
    enabled: !!chatId,
  })

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post(`/chats/${chatId}/messages`, { content })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
    onError: () => toast.error('Failed to send message'),
  })

  // Auto scroll xuống cuối khi có message mới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const content = input.trim()
    if (!content || sendMutation.isPending) return
    setInput('')
    sendMutation.mutate(content)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">How can I help you?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ask anything about your documents
              </p>
            </div>
          </div>
        ) : (
          messages
            .filter((m: Message) => m.role !== 'SYSTEM')
            .map((msg: Message) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3 max-w-3xl',
                  msg.role === 'USER' ? 'ml-auto flex-row-reverse' : '',
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5',
                  msg.role === 'USER'
                    ? 'bg-primary'
                    : 'bg-secondary border border-border',
                )}>
                  {msg.role === 'USER'
                    ? <User className="w-3.5 h-3.5 text-primary-foreground" />
                    : <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                  }
                </div>

                {/* Bubble */}
                <div className={cn(
                  'px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[80%]',
                  msg.role === 'USER'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-secondary text-foreground rounded-tl-sm',
                )}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
        )}

        {/* Loading bubble khi đang chờ AI */}
        {sendMutation.isPending && (
          <div className="flex gap-3 max-w-3xl">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary border border-border shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-secondary">
              <div className="flex gap-1 items-center h-5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your documents... (Enter to send)"
            disabled={sendMutation.isPending}
            rows={1}
            className="resize-none min-h-[44px] max-h-32 bg-secondary border-border text-sm"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="h-11 w-11 shrink-0"
          >
            <SendHorizontal className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}