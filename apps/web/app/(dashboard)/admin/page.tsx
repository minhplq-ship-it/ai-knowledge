'use client'

// app/(dashboard)/admin/page.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Users,
  FileText,
  Trash2,
  Loader2,
  Shield,
  Search,
  Ban,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type Tab = 'users' | 'documents'

interface User {
  id: string
  name: string
  email: string
  role: string
  isVerified: boolean
  createdAt: string
  _count: { documents: number; chats: number }
}

interface Document {
  id: string
  title: string
  createdAt: string
  user?: { email: string }
}

export default function AdminPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('users')
  const [search, setSearch] = useState('')

  // Redirect nếu không phải ADMIN
  if (user && user.role !== 'ADMIN') {
    router.replace('/chat')
    return null
  }

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users')
      return data as User[]
    },
    enabled: tab === 'users',
  })

  // Fetch documents
  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['admin', 'documents'],
    queryFn: async () => {
      const { data } = await api.get('/admin/documents?limit=50')
      return data
    },
    enabled: tab === 'documents',
  })

  const documents: Document[] = docsData?.data ?? []

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User deleted')
    },
    onError: () => toast.error('Failed to delete user'),
  })

  // Delete document
  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'documents'] })
      toast.success('Document deleted')
    },
    onError: () => toast.error('Failed to delete document'),
  })

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage users and documents</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total users</span>
          </div>
          <p className="text-2xl font-semibold">{users.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total documents</span>
          </div>
          <p className="text-2xl font-semibold">{documents.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit">
        {(['users', 'documents'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch('') }}
            className={cn(
              'flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
              tab === t
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'users'
              ? <Users className="w-3.5 h-3.5" />
              : <FileText className="w-3.5 h-3.5" />
            }
            {t}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === 'users' ? 'Search by name or email...' : 'Search documents...'}
          className="pl-9 bg-secondary border-border"
        />
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        usersLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors group"
              >
                {/* Avatar */}
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0 text-sm font-semibold text-primary">
                  {u.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    {u.role === 'ADMIN' && (
                      <Badge className="text-xs h-4 px-1.5">Admin</Badge>
                    )}
                    {!u.isVerified && (
                      <Badge variant="secondary" className="text-xs h-4 px-1.5 text-yellow-500">
                        Unverified
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {u._count.documents} docs · {u._count.chats} chats ·{' '}
                    joined {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Delete — không cho xóa chính mình */}
                {u.id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    onClick={() => deleteUserMutation.mutate(u.id)}
                    disabled={deleteUserMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}

                {u.id === user?.id && (
                  <Badge variant="outline" className="text-xs shrink-0">You</Badge>
                )}
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Ban className="w-6 h-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            )}
          </div>
        )
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        docsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors group"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  onClick={() => deleteDocMutation.mutate(doc.id)}
                  disabled={deleteDocMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}

            {filteredDocs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <FileText className="w-6 h-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No documents found</p>
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}