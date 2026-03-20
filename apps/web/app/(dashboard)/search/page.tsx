'use client'

// app/(dashboard)/search/page.tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, FileText, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'

interface SearchResult {
  chunkId: string
  documentId: string
  documentTitle: string
  content: string
  similarity: number
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(5)

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

  const similarityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400'
    if (score >= 0.6) return 'text-yellow-400'
    return 'text-muted-foreground'
  }

  const similarityLabel = (score: number) => {
    if (score >= 0.8) return 'High'
    if (score >= 0.6) return 'Medium'
    return 'Low'
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto max-w-3xl mx-auto w-full">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Semantic Search</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Search across your knowledge base using AI
        </p>
      </div>

      {/* Search form */}
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

        {/* Top K selector */}
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

      {/* Results */}
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
            <p className="text-xs text-muted-foreground">
              Try a different query or upload more documents
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {searchMutation.data.length} results for &quot;{query}&quot;
            </p>

            {searchMutation.data.map((result, index) => (
              <div
                key={result.chunkId}
                className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors space-y-3"
              >
                {/* Header */}
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
                    <span className={`text-xs font-medium ${similarityColor(result.similarity)}`}>
                      {similarityLabel(result.similarity)}
                    </span>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {(result.similarity * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                  {result.content}
                </p>

                {/* Rank */}
                <div className="flex items-center gap-1.5">
                  <div className="h-1 flex-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${result.similarity * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    #{index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Empty state */
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
  )
}