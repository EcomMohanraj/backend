'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, ShoppingBag, FolderKanban, Users2, FileSpreadsheet, Settings, LogOut, ArrowLeft, Loader2, Leaf } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function verifyAdmin() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const res = await fetch(`${apiUrl}/auth/session`, { credentials: 'include' })
        
        if (!res.ok) {
          router.push('/login?error=Please log in.')
          return
        }

        const data = await res.json()
        if (data.success && (data.user?.role === 'admin' || data.user?.role === 'super-admin')) {
          setIsAdmin(true)
        } else {
          showToast('Access Denied: Administrative privileges required.', 'error')
          router.push('/dashboard')
        }
      } catch (err) {
        console.error(err)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    verifyAdmin()
  }, [router])

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {})
      document.cookie = 'milky_session_active=; path=/; max-age=0'
      showToast('Logged out successfully', 'success')
      router.push('/login')
    } catch (e) {
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="spinner" style={{ width: '2.5rem', height: '2.5rem', color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Verifying administrator clearance...</p>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }} className="admin-root">
      
      {/* Sidebar navigation */}
      <aside style={{
        width: '260px',
        background: 'rgba(7, 9, 19, 0.95)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem 1.5rem',
        position: 'sticky',
        top: 0,
        height: '100vh',
        flexShrink: 0
      }} className="admin-sidebar">
        
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
          <Leaf size={24} style={{ color: 'var(--primary)' }} />
          <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.25rem', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Milky Admin
          </span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <Link href="/admin" style={{ textDecoration: 'none' }}>
            <span className="admin-nav-link">
              <LayoutDashboard size={18} /> Dashboard
            </span>
          </Link>

          <Link href="/admin/products" style={{ textDecoration: 'none' }}>
            <span className="admin-nav-link">
              <FolderKanban size={18} /> Products CRUD
            </span>
          </Link>

          <Link href="/admin/orders" style={{ textDecoration: 'none' }}>
            <span className="admin-nav-link">
              <ShoppingBag size={18} /> Orders Board
            </span>
          </Link>

          <Link href="/admin/customers" style={{ textDecoration: 'none' }}>
            <span className="admin-nav-link">
              <Users2 size={18} /> Customers List
            </span>
          </Link>

          <Link href="/admin/reports" style={{ textDecoration: 'none' }}>
            <span className="admin-nav-link">
              <FileSpreadsheet size={18} /> Reports Export
            </span>
          </Link>

          <Link href="/admin/settings" style={{ textDecoration: 'none' }}>
            <span className="admin-nav-link">
              <Settings size={18} /> Store Settings
            </span>
          </Link>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span className="admin-nav-link" style={{ color: 'var(--text-secondary)' }}>
              <ArrowLeft size={16} /> Back to Store
            </span>
          </Link>
          
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              width: '100%',
              textAlign: 'left',
              color: '#F87171',
              fontSize: '0.9rem',
              fontWeight: 600,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>

      </aside>

      {/* Main panel viewport */}
      <main style={{ flex: 1, padding: '3rem', overflowY: 'auto', background: '#02040a' }}>
        {children}
      </main>

      <style jsx global>{`
        .admin-nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.25s;
        }
        .admin-nav-link:hover {
          background: rgba(255, 255, 255, 0.04);
          color: var(--primary);
        }
        @media (max-width: 768px) {
          .admin-root {
            flex-direction: column;
          }
          .admin-sidebar {
            width: 100% !important;
            height: auto !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border-color) !important;
            position: relative !important;
          }
        }
      `}</style>

    </div>
  )
}
