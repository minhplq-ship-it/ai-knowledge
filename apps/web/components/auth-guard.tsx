'use client'

// src/components/auth-guard.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token, fetchMe, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!token) {
      router.replace('/login')
      return
    }
    fetchMe()
  }, [token])

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}