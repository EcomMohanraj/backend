'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { LogOut, User, Mail, Phone, Calendar, ShieldCheck, Edit3, Save, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react'

interface BackendUser {
  id: string
  name: string
  email: string
  role: string
  phone?: string
  created_at: string
}

export default function Dashboard() {
  const router = useRouter()
  const [sessionUser, setSessionUser] = useState<any>(null)
  const [profile, setProfile] = useState<BackendUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  
  // Form edit states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          router.push('/login')
          return
        }

        setSessionUser(session.user)

        // Fetch local database profile from the Express backend using the Supabase JWT
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const res = await fetch(`${apiUrl}/auth/session`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!res.ok) {
          throw new Error('Failed to fetch user session from Express backend')
        }

        const data = await res.json()
        if (data.success && data.user) {
          setProfile(data.user)
          setName(data.user.name)
          setPhone(data.user.phone || '')
        }
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err)
        setError('Failed to fetch PostgreSQL profile sync. Is the backend server running?')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      
      // Sign out from Supabase (clears local session cookies)
      await supabase.auth.signOut()

      // Inform Express backend to clear cookies if necessary
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      await fetch(`${apiUrl}/auth/logout`, { method: 'POST' }).catch(() => {})

      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Logout error:', err)
      router.push('/login')
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError(null)
    setSuccessMsg(null)

    if (!name) {
      setError('Name is required.')
      setUpdating(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('Session expired. Please log in again.')
        setUpdating(false)
        return
      }

      // 1. Update Supabase Auth metadata
      const { error: supabaseUpdateError } = await supabase.auth.updateUser({
        data: { name, phone }
      })

      if (supabaseUpdateError) {
        setError(supabaseUpdateError.message)
        setUpdating(false)
        return
      }

      // 2. Update local PostgreSQL database profile via backend API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/auth/session`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ name, phone })
      })

      if (!res.ok) {
        throw new Error('Backend failed to update profile')
      }

      // Refresh database profile details
      const profileRes = await fetch(`${apiUrl}/auth/session`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const profileData = await profileRes.json()
      if (profileData.success) {
        setProfile(profileData.user)
      }

      setSuccessMsg('Profile updated successfully.')
      setEditMode(false)
    } catch (err: any) {
      console.error('Update profile error:', err)
      setError('An error occurred while saving profile changes.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{ width: '2.5rem', height: '2.5rem', borderWidth: '3px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Verifying secure session...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Navigation header */}
      <header className="nav">
        <span className="logo">Milky Mushrooms Portal</span>
        <div className="nav-user">
          <span className="nav-email">{sessionUser?.email}</span>
          <button className="nav-logout" onClick={handleLogout}>
            <LogOut size={18} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main dashboard content */}
      <main className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Customer Portal</h1>
          <p className="dashboard-subtitle">Manage your credentials, view profile syncs, and review orders</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success">
            <CheckCircle size={20} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="dashboard-grid">
          {/* Main profile card */}
          <div className="dashboard-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={22} style={{ color: 'var(--primary)' }} />
                Account Profile
              </h2>
              {!editMode ? (
                <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: 'auto' }} onClick={() => setEditMode(true)}>
                  <Edit3 size={14} />
                  Edit Profile
                </button>
              ) : (
                <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: 'auto', borderColor: '#EF4444', color: '#FCA5A5' }} onClick={() => { setEditMode(false); setError(null); }}>
                  Cancel
                </button>
              )}
            </div>

            {!editMode ? (
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Full Name</span>
                  <span className="info-value">{profile?.name || 'Not Configured'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email Address</span>
                  <span className="info-value">{profile?.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone Number</span>
                  <span className="info-value">{profile?.phone || 'None Provided'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Account Role</span>
                  <div>
                    <span className={`badge badge-${profile?.role === 'admin' ? 'admin' : 'customer'}`}>
                      {profile?.role || 'customer'}
                    </span>
                  </div>
                </div>
                <div className="info-item">
                  <span className="info-label">Member Since</span>
                  <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
                    {profile ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Loading'}
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile}>
                <div className="input-group">
                  <label className="input-label" htmlFor="edit-name">Full Name</label>
                  <input
                    id="edit-name"
                    type="text"
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={updating}
                    required
                  />
                </div>
                
                <div className="input-group">
                  <label className="input-label" htmlFor="edit-phone">Phone Number</label>
                  <input
                    id="edit-phone"
                    type="text"
                    className="input-field"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={updating}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={updating} style={{ width: 'auto', padding: '0.65rem 1.5rem', marginTop: '1rem' }}>
                  {updating ? <div className="spinner" /> : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Sidebar status card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="dashboard-card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} style={{ color: 'var(--primary)' }} />
                Security Status
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                Your session is secured using Supabase JSON Web Tokens (JWT). The database profile and authorization scopes are validated in the PostgreSQL database.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.15)', padding: '0.75rem', borderRadius: '12px', color: '#6EE7B7', fontSize: '0.85rem' }}>
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                <span>Synchronized with PostgreSQL</span>
              </div>
            </div>

            <div className="dashboard-card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={20} style={{ color: '#A78BFA' }} />
                Recent Orders
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                You have no active orders. Order high-quality Calocybe Indica spawns and fresh substrates directly from the farm shop.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
