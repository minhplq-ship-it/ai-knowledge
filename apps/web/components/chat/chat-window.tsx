'use client'

// components/chat/chat-window.tsx
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  SendHorizontal,
  Loader2,
  Bot,
  User,
  FileText,
  X,
  BookOpen,
  Globe,
  Layers2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useChatStore, type SearchMode } from '@/stores/chat.store'

interface Source {
  chunkId: string
  documentId: string
  documentTitle: string
  content: string
  similarity: number
}

interface Message {
  id: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  createdAt: string
  metadata?: { sources?: Source[]; searchMode?: SearchMode }
}

// ─── Search Mode Selector ────────────────────────────────────────────────────

const MODES: {
  value: SearchMode
  label: string
  icon: React.ElementType
  tooltip: string
}[] = [
  {
    value: 'document',
    label: 'Tài liệu',
    icon: BookOpen,
    tooltip: 'Chỉ tìm trong Knowledge Base',
  },
  {
    value: 'hybrid',
    label: 'Hybrid',
    icon: Layers2,
    tooltip: 'KB trước, fallback web nếu không có kết quả',
  },
  {
    value: 'web',
    label: 'Web',
    icon: Globe,
    tooltip: 'Tìm kiếm web real-time',
  },
]

function SearchModeSelector() {
  const { searchMode, setSearchMode } = useChatStore()

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary border border-border">
      {MODES.map(({ value, label, icon: Icon, tooltip }) => (
        <button
          key={value}
          title={tooltip}
          onClick={() => setSearchMode(value)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
            searchMode === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="w-3 h-3" />
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Source Modal ────────────────────────────────────────────────────────────

function SourceModal({
  source,
  index,
  onClose,
}: {
  source: Source
  index: number
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {source.documentTitle}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nguồn {index + 1} &middot;{' '}
                <span
                  className={cn(
                    'font-medium',
                    source.similarity >= 0.8
                      ? 'text-green-400'
                      : source.similarity >= 0.6
                        ? 'text-yellow-400'
                        : 'text-muted-foreground',
                  )}
                >
                  {(source.similarity * 100).toFixed(1)}% match
                </span>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 shrink-0"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {source.content}
          </p>
        </div>

        <div className="px-5 py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-32 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${source.similarity * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {(source.similarity * 100).toFixed(1)}% similarity
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Citations ───────────────────────────────────────────────────────────────

function Citations({ sources }: { sources: Source[] }) {
  const [selected, setSelected] = useState<{
    source: Source
    index: number
  } | null>(null)

  return (
    <>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <span className="text-xs text-muted-foreground self-center">
          Nguồn:
        </span>
        {sources.map((source, i) => (
          <button
            key={`source-${i}`}
            onClick={() => setSelected({ source, index: i })}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors text-xs text-primary font-medium"
          >
            <FileText className="w-3 h-3" />
            {source.documentTitle.length > 20
              ? source.documentTitle.slice(0, 20) + '...'
              : source.documentTitle}
            <Badge
              variant="secondary"
              className="text-xs h-4 px-1 font-mono ml-0.5"
            >
              {(source.similarity * 100).toFixed(0)}%
            </Badge>
          </button>
        ))}
      </div>

      {selected && (
        <SourceModal
          source={selected.source}
          index={selected.index}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

// ─── Chat Window ─────────────────────────────────────────────────────────────

export function ChatWindow({ chatId }: { chatId: string }) {
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const { searchMode } = useChatStore()

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      const { data } = await api.get(`/chats/${chatId}/messages`)
      return data as Message[]
    },
    enabled: !!chatId,
  })

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post(`/chats/${chatId}/messages`, {
        content,
        searchMode, // ← truyền mode hiện tại vào body
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
    onError: () => toast.error('Failed to send message'),
  })

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
      {/* Header — search mode selector */}
      <div className="flex items-center justify-end px-4 py-2.5 border-b border-border shrink-0">
        <SearchModeSelector />
      </div>

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
            .filter((m) => m.role !== 'SYSTEM')
            .map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3 max-w-3xl',
                  msg.role === 'USER' ? 'ml-auto flex-row-reverse' : '',
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5',
                    msg.role === 'USER'
                      ? 'bg-primary'
                      : 'bg-secondary border border-border',
                  )}
                >
                  {msg.role === 'USER' ? (
                    <User className="w-3.5 h-3.5 text-primary-foreground" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>

                <div
                  className={cn(
                    'max-w-[80%]',
                    msg.role === 'USER' ? 'items-end' : 'items-start',
                  )}
                >
                  <div
                    className={cn(
                      'px-4 py-3 rounded-2xl text-sm leading-relaxed',
                      msg.role === 'USER'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-secondary text-foreground rounded-tl-sm',
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Citations */}
                  {msg.role === 'ASSISTANT' &&
                    msg.metadata?.sources &&
                    msg.metadata.sources.length > 0 && (
                      <Citations sources={msg.metadata.sources} />
                    )}

                  {/* Search mode badge — hiện nhỏ dưới mỗi message AI */}
                  {msg.role === 'ASSISTANT' && msg.metadata?.searchMode && (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-muted-foreground/60 capitalize">
                        via {msg.metadata.searchMode}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
        )}

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
