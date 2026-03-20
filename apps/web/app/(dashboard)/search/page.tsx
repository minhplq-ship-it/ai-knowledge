'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, FileText, SlidersHorizontal, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SearchResult {
  chunkId: string
  documentId: string
  documentTitle: string
  content: string
  similarity: number
}

function ChunkModal({
  result,
  index,
  onClose,
}: {
  result: SearchResult
  index: number
  onClose: () => void
}) {
  const color = (s: number) =>
    s >= 0.8 ? 'text-green-400' : s >= 0.6 ? 'text-yellow-400' : 'text-muted-foreground'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{result.documentTitle}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Result #{index + 1} &middot;{' '}
                <span className={cn('font-medium', color(result.similarity))}>
                  {(result.similarity * 100).toFixed(1)}% match
                </span>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {result.content}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-32 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${result.similarity * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {(result.similarity * 100).toFixed(1)}% similarity
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-7"
            onClick={() => { window.location.href = '/documents' }}
          >
            <ExternalLink className="w-3 h-3" />
            View document
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(5)
  const [selected, setSelected] = useState<{ result: SearchResult; index: number } | null>(null)

  const searchMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/documents/search', { query, topK })
      return data as SearchResult[]
    },
    onError: () => toast.error('Search failed'),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    searchMutation.mutate()
  }

  const color = (s: number) =>
    s >= 0.8 ? 'text-green-400' : s >= 0.6 ? 'text-yellow-400' : 'text-muted-foreground'

  const label = (s: number) =>
    s >= 0.8 ? 'High' : s >= 0.6 ? 'Medium' : 'Low'

  return (
    <>
      <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto max-w-3xl mx-auto w-full">
        <div>
          <h1 className="text-xl font-semibold">Semantic Search</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Search across your knowledge base using AI
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything about your documents..."
                className="pl-9 h-11 bg-secondary border-border"
                disabled={searchMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              disabled={!query.trim() || searchMutation.isPending}
              className="h-11 px-5"
            >
              {searchMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : 'Search'
              }
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Results:</span>
            {[3, 5, 10].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTopK(k)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  topK === k
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </form>

        {searchMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Searching knowledge base...</p>
          </div>
        ) : searchMutation.data ? (
          searchMutation.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Search className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No results found</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {searchMutation.data.length} results &mdash;{' '}
                <span className="text-primary">click to read full content</span>
              </p>

              {searchMutation.data.map((result, index) => (
                <div
                  key={result.chunkId}
                  onClick={() => setSelected({ result, index })}
                  className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 hover:border-primary/30 transition-all cursor-pointer group space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 shrink-0">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium truncate">
                        {result.documentTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium ${color(result.similarity)}`}>
                        {label(result.similarity)}
                      </span>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {(result.similarity * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 group-hover:text-foreground/70 transition-colors">
                    {result.content}
                  </p>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-1">
                      <div className="h-1 flex-1 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${result.similarity * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        #{index + 1}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to read more
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Search your knowledge base</p>
              <p className="text-xs text-muted-foreground mt-1">
                Results are ranked by semantic similarity
              </p>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <ChunkModal
          result={selected.result}
          index={selected.index}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}