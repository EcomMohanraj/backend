'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    if (!email) {
      setError('Please provide your email address.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
      setEmail('')
    } catch (err: any) {
      console.error('Reset password request error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span className="logo">Milky Mushrooms</span>
          </Link>
          <h2 className="auth-title" style={{ marginTop: '1rem' }}>Reset Password</h2>
          <p className="auth-subtitle">We will send you a recovery link to access your account</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="alert alert-success" style={{ flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
              <strong style={{ fontWeight: 600 }}>Reset Email Sent!</strong>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#A7F3D0' }}>
              If an account is registered with this email, you will receive a secure password recovery link shortly. Please check your inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleResetRequest}>
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

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1.5rem' }}>
              {loading ? <div className="spinner" /> : 'Send Recovery Link'}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <ArrowLeft size={16} />
          <Link href="/login" className="auth-link">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
