'use client'

// src/components/layout/sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  BookOpen,
  Search,
  LogOut,
  Bot,
  Plus,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/knowledge', icon: BookOpen, label: 'Knowledge Sources' },
  { href: '/search', icon: Search, label: 'Search' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <aside
      className="flex flex-col w-64 h-full border-r shrink-0"
      style={{
        backgroundColor: 'hsl(var(--sidebar))',
        borderColor: 'hsl(var(--sidebar-border))',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">
          AI Knowledge
        </span>
      </div>

      <Separator style={{ backgroundColor: 'hsl(var(--sidebar-border))' }} />

      {/* New Chat button */}
      <div className="px-3 py-3">
        <Button
          asChild
          variant="outline"
          className="w-full justify-start gap-2 text-sm font-normal h-9 border-dashed"
          style={{ borderColor: 'hsl(var(--sidebar-border))' }}
        >
          <Link href="/chat/new">
            <Plus className="w-4 h-4" />
            New chat
          </Link>
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto py-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {/* Admin link — chỉ hiện nếu là ADMIN */}
        {user?.role === 'ADMIN' && (
          <>
            <Separator
              className="my-2"
              style={{ backgroundColor: 'hsl(var(--sidebar-border))' }}
            />
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Shield className="w-4 h-4 shrink-0" />
              Admin
            </Link>
          </>
        )}
      </nav>

      {/* User info + logout */}
      <Separator style={{ backgroundColor: 'hsl(var(--sidebar-border))' }} />
      <div className="px-3 py-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-muted-foreground hover:text-foreground shrink-0"
            onClick={logout}
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
