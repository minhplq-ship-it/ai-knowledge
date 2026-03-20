'use client'

// app/(auth)/verify-email/page.tsx
import { Suspense, useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Bot, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!email) router.replace('/register')
    inputs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) inputs.current[index + 1]?.focus()
    if (next.every((d) => d !== '') && index === 5) {
      handleVerify(next.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      handleVerify(pasted)
    }
  }

  const handleVerify = async (code: string) => {
    if (code.length !== 6) return
    try {
      setLoading(true)
      await api.post('/auth/verify-email', { email, code })
      toast.success('Email verified! Please sign in.')
      router.replace('/login')
    } catch {
      toast.error('Invalid or expired code')
      setOtp(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      setResending(true)
      await api.post('/auth/resend-verification', { email })
      toast.success('New code sent to your email')
    } catch {
      toast.error('Failed to resend code')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              We sent a 6-digit code to
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{email}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={loading}
              className={cn(
                'w-11 h-14 text-center text-xl font-semibold rounded-xl border-2 bg-secondary',
                'focus:outline-none focus:border-primary transition-colors',
                digit ? 'border-primary' : 'border-border',
                loading && 'opacity-50 cursor-not-allowed',
              )}
            />
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Verifying...
          </div>
        )}

        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Didn&apos;t receive the code?</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={resending || loading}
            className="text-sm"
          >
            {resending ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending...</>
            ) : 'Resend code'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}