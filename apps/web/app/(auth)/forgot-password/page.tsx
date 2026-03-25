'use client'

// app/(auth)/forgot-password/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bot, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Step = 'email' | 'reset'

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Bước 1: nhập email → lấy câu hỏi bảo mật
  const handleGetQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    try {
      setLoading(true)
      const res = await api.post('/auth/forgot-password', { email })
      setSecurityQuestion(res.data.securityQuestion)
      setStep('reset')
    } catch {
      // Không tiết lộ email có tồn tại hay không
      toast.error('No account found with this email')
    } finally {
      setLoading(false)
    }
  }

  // Bước 2: trả lời câu hỏi + đặt mật khẩu mới
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!securityAnswer || !newPassword || !confirmPassword) return

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      await api.post('/auth/reset-password', {
        email,
        securityAnswer,
        newPassword,
      })
      toast.success('Password reset successfully!')
      router.push('/login')
    } catch {
      toast.error('Wrong security answer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {step === 'email' ? 'Forgot password?' : 'Reset password'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 'email'
                ? 'Enter your email to find your account'
                : 'Answer your security question to reset your password'}
            </p>
          </div>
        </div>

        {/* Bước 1: nhập email */}
        {step === 'email' && (
          <form onSubmit={handleGetQuestion} className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="h-10 bg-secondary border-border"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finding account...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        )}

        {/* Bước 2: câu hỏi bảo mật + mật khẩu mới */}
        {step === 'reset' && (
          <form onSubmit={handleReset} className="space-y-3">
            {/* Hiển thị câu hỏi bảo mật */}
            <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">
                Security question
              </p>
              <p className="text-sm font-medium">{securityQuestion}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="securityAnswer">
                Your answer
              </label>
              <Input
                id="securityAnswer"
                type="text"
                placeholder="Enter your answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                disabled={loading}
                required
                className="h-10 bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="newPassword">
                New password
              </label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                className="h-10 bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                className="h-10 bg-secondary border-border"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset password'
              )}
            </Button>

            {/* Quay lại bước 1 */}
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setSecurityQuestion('')
                setSecurityAnswer('')
              }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Use a different email
            </button>
          </form>
        )}

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
