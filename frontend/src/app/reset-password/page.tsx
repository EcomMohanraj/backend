'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
      setPassword('')
      setConfirmPassword('')

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?message=Password updated successfully. Please log in with your new password.')
      }, 3000)
    } catch (err: any) {
      console.error('Password reset submit error:', err)
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
          <h2 className="auth-title" style={{ marginTop: '1rem' }}>Enter New Password</h2>
          <p className="auth-subtitle">Provide a strong, secure new password for your account</p>
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
              <strong style={{ fontWeight: 600 }}>Password Updated!</strong>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#A7F3D0' }}>
              Your password has been changed successfully. Redirecting you to login page...
            </p>
          </div>
        ) : (
          <form onSubmit={handlePasswordUpdate}>
            <div className="input-group">
              <label className="input-label" htmlFor="password">New Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <KeyRound size={18} />
                </span>
                <input
                  id="password"
                  type="password"
                  className="input-field"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  disabled={loading}
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="confirmPassword">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <KeyRound size={18} />
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input-field"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  disabled={loading}
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1.5rem' }}>
              {loading ? <div className="spinner" /> : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
