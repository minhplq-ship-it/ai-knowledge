'use client'

// app/(dashboard)/knowledge/page.tsx
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  CloudUpload,
  File,
  Globe,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Document {
  id: string
  title: string
  createdAt: string
}

type CrawlScope = 'SINGLE_PAGE' | 'PATH_PREFIX' | 'SUBDOMAIN'
type CrawlStatus = 'PENDING' | 'CRAWLING' | 'READY' | 'ERROR'

interface WebSource {
  id: string
  url: string
  scope: CrawlScope
  pageLimit: number
  status: CrawlStatus
  crawledAt: string | null
  pageCount: number | null
  createdAt: string
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data } = await api.get('/documents')
      return data as Document[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Đã xóa tài liệu')
    },
    onError: () => toast.error('Xóa thất bại'),
  })

  const handleUpload = async (file: File) => {
    if (!file) return
    const allowed = ['application/pdf', 'text/plain', 'text/markdown']
    if (!allowed.includes(file.type) && !file.name.endsWith('.md')) {
      toast.error('Chỉ hỗ trợ PDF, TXT, MD')
      return
    }
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(`"${file.name}" đã upload, đang xử lý...`)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    } catch {
      toast.error('Upload thất bại')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-secondary/50',
        )}
      >
        <CloudUpload
          className={cn(
            'w-8 h-8 mx-auto mb-3 transition-colors',
            dragging ? 'text-primary' : 'text-muted-foreground',
          )}
        />
        <p className="text-sm font-medium">
          {dragging ? 'Thả file vào đây' : 'Kéo thả hoặc click để upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF, TXT, MD</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <FileText className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Chưa có tài liệu nào</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors group"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                <File className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(doc.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                Ready
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => deleteMutation.mutate(doc.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Web Crawl Tab ────────────────────────────────────────────────────────────

const SCOPE_OPTIONS: { value: CrawlScope; label: string; desc: string }[] = [
  {
    value: 'SINGLE_PAGE',
    label: 'Single page',
    desc: 'Chỉ crawl đúng URL này',
  },
  {
    value: 'PATH_PREFIX',
    label: 'Path prefix',
    desc: 'Crawl tất cả URL cùng path',
  },
  { value: 'SUBDOMAIN', label: 'Subdomain', desc: 'Crawl toàn bộ subdomain' },
]

const STATUS_CONFIG: Record<
  CrawlStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  PENDING: {
    label: 'Đang chờ',
    icon: Clock,
    className: 'text-muted-foreground',
  },
  CRAWLING: { label: 'Đang crawl', icon: Loader2, className: 'text-blue-400' },
  READY: { label: 'Sẵn sàng', icon: CheckCircle2, className: 'text-green-400' },
  ERROR: { label: 'Lỗi', icon: AlertCircle, className: 'text-destructive' },
}

function WebCrawlTab() {
  const queryClient = useQueryClient()
  const [url, setUrl] = useState('')
  const [scope, setScope] = useState<CrawlScope>('SUBDOMAIN')
  const [pageLimit, setPageLimit] = useState(200)

  const { data: webSources = [], isLoading } = useQuery({
    queryKey: ['web-sources'],
    queryFn: async () => {
      const { data } = await api.get('/web-sources')
      return (Array.isArray(data) ? data : data.items) as WebSource[]
    },
    // Poll mỗi 5s nếu có source đang CRAWLING
    refetchInterval: (query) => {
      const sources = query.state.data as WebSource[] | undefined
      return sources?.some(
        (s) => s.status === 'CRAWLING' || s.status === 'PENDING',
      )
        ? 5000
        : false
    },
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/web-sources', { url, scope, pageLimit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web-sources'] })
      toast.success('Bắt đầu crawl...')
      setUrl('')
    },
    onError: () => toast.error('Tạo web source thất bại'),
  })

  const recrawlMutation = useMutation({
    mutationFn: (id: string) => api.post(`/web-sources/${id}/recrawl`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web-sources'] })
      toast.success('Đã bắt đầu re-crawl')
    },
    onError: () => toast.error('Re-crawl thất bại'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/web-sources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web-sources'] })
      toast.success('Đã xóa web source')
    },
    onError: () => toast.error('Xóa thất bại'),
  })

  const handleSubmit = () => {
    if (!url.trim()) return
    createMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
        <p className="text-sm font-medium">Thêm website</p>

        <Input
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        {/* Scope selector */}
        <div className="flex gap-2">
          {SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setScope(opt.value)}
              title={opt.desc}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                scope === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Page limit */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Tối đa trang
          </span>
          <Input
            type="number"
            min={1}
            max={500}
            value={pageLimit}
            onChange={(e) => setPageLimit(Number(e.target.value))}
            className="h-8 text-xs w-24"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!url.trim() || createMutation.isPending}
          size="sm"
          className="gap-2 self-end"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Crawl
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : webSources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Globe className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Chưa có web source nào
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {webSources.map((source) => {
            const cfg = STATUS_CONFIG[source.status]
            const Icon = cfg.icon
            return (
              <div
                key={source.id}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors group"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                  <Globe className="w-4 h-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{source.url}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs h-4 px-1">
                      {
                        SCOPE_OPTIONS.find((o) => o.value === source.scope)
                          ?.label
                      }
                    </Badge>
                    {source.pageCount != null && (
                      <span className="text-xs text-muted-foreground">
                        {source.pageCount} trang
                      </span>
                    )}
                    {source.crawledAt && (
                      <span className="text-xs text-muted-foreground">
                        ·{' '}
                        {formatDistanceToNow(new Date(source.crawledAt), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium shrink-0',
                    cfg.className,
                  )}
                >
                  <Icon
                    className={cn(
                      'w-3.5 h-3.5',
                      source.status === 'CRAWLING' && 'animate-spin',
                    )}
                  />
                  {cfg.label}
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-muted-foreground hover:text-foreground"
                    onClick={() => recrawlMutation.mutate(source.id)}
                    disabled={
                      recrawlMutation.isPending || source.status === 'CRAWLING'
                    }
                    title="Re-crawl"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(source.id)}
                    disabled={deleteMutation.isPending}
                    title="Xóa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'documents' | 'web'

export default function KnowledgePage() {
  const [tab, setTab] = useState<Tab>('documents')

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Knowledge Sources</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản lý tài liệu và web source cho Knowledge Base
          </p>
        </div>

        {tab === 'documents' && (
          <Button
            size="sm"
            className="gap-2"
            onClick={() =>
              document.getElementById('file-upload-trigger')?.click()
            }
          >
            <Upload className="w-4 h-4" />
            Upload file
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary border border-border w-fit">
        {(
          [
            { value: 'documents', label: 'Tài liệu', icon: FileText },
            { value: 'web', label: 'Web crawl', icon: Globe },
          ] as { value: Tab; label: string; icon: React.ElementType }[]
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              tab === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'documents' ? <DocumentsTab /> : <WebCrawlTab />}
    </div>
  )
}
