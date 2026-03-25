'use client'

// components/auth-guard.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, fetchMe } = useAuthStore()
  const [ready, setReady] = useState(isAuthenticated) // ← nếu đã auth thì ready ngay

  useEffect(() => {
    if (isAuthenticated) {
      // Đã có state persist → không cần verify lại
      setReady(true)
      return
    }

    // Chưa auth → thử verify cookie với BE
    fetchMe().finally(() => setReady(true))
  }, [])

  // Chưa xong → spinner (không render gì, không nháy)
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Xong mà không auth → redirect
  if (!isAuthenticated) {
    router.replace('/login')
    return null
  }

  return <>{children}</>
}
