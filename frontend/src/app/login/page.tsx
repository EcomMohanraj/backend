'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { KeyRound, Mail, AlertCircle, CheckCircle2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // If redirected with messages/errors in URL query
    const errParam = searchParams.get('error')
    const msgParam = searchParams.get('message')
    if (errParam) setError(errParam)
    if (msgParam) setMessage(msgParam)
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (!email || !password) {
      setError('Please fill in all fields.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      // Requirement 4: Prevent login until email is verified.
      if (data?.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        setError('Please verify your email address before logging in. Check your inbox for the verification link.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      console.error('Login error:', err)
      setError('An unexpected error occurred during sign in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="alert alert-success">
          <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div className="input-group">
          <label className="input-label" htmlFor="email">Email Address</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Mail size={18} />
            </span>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="input-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
            <Link href="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>
              Forgot Password?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <KeyRound size={18} />
            </span>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              disabled={loading}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1.5rem' }}>
          {loading ? <div className="spinner" /> : 'Sign In'}
        </button>
      </form>
    </>
  )
}

export default function Login() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span className="logo">Milky Mushrooms</span>
          </Link>
          <h2 className="auth-title" style={{ marginTop: '1rem' }}>Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your organic mushroom dashboard</p>
        </div>

        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div className="spinner" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link href="/register" className="auth-link">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  )
}
