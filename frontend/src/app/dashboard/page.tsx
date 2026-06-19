'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogOut, User, Mail, Phone, Calendar, ShieldCheck, Edit3, Save, CheckCircle, AlertCircle, ShoppingBag, MapPin, Heart, FileText, ChevronRight, RefreshCw, KeyRound, Loader2, Plus } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useToast } from '@/context/ToastContext'

interface BackendUser {
  id: string
  name: string
  email: string
  role: string
  phone?: string
  created_at: string
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  product?: {
    name: string
    image: string
    slug: string
  }
}

interface Order {
  id: string
  amount: number
  status: string
  payment_id?: string
  address: string
  created_at: string
  items: OrderItem[]
}

interface Address {
  id: string
  address: string
  city: string
  pincode: string
  isDefault: boolean
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToCart } = useCart()
  const { wishlist, removeFromWishlist } = useWishlist()
  const { showToast } = useToast()

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders' | 'wishlist'>('profile')

  // Data States
  const [profile, setProfile] = useState<BackendUser | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Profile Edit Form States
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Address Form States
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [newAddr, setNewAddr] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newPin, setNewPin] = useState('')
  const [savingAddr, setSavingAddr] = useState(false)

  // Global Alerts
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const msg = searchParams.get('message')
    if (msg) setSuccess(msg)
    
    async function loadDashboardData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        
        // 1. Fetch user session
        const sessionRes = await fetch(`${apiUrl}/auth/session`, { credentials: 'include' })
        if (!sessionRes.ok) {
          router.push('/login?error=Session expired. Please sign in again.')
          return
        }
        
        const sessionData = await sessionRes.json()
        if (sessionData.success && sessionData.user) {
          setProfile(sessionData.user)
          setName(sessionData.user.name)
          setPhone(sessionData.user.phone || '')

          // Route admin users directly to their console
          if (sessionData.user.role === 'admin' || sessionData.user.role === 'super-admin') {
            router.push('/admin')
            return
          }
        }

        // 2. Fetch addresses
        const addrRes = await fetch(`${apiUrl}/addresses`, { credentials: 'include' })
        if (addrRes.ok) {
          const addrData = await addrRes.json()
          setAddresses(addrData)
        }

        // 3. Fetch orders
        const ordersRes = await fetch(`${apiUrl}/orders`, { credentials: 'include' })
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          setOrders(ordersData)
        }

      } catch (err) {
        console.error(err)
        setError('Server connection failed. Profile details may be incomplete.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [router, searchParams])

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      await fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      }).catch(() => {})
      
      // Clear cookies
      document.cookie = 'milky_session_active=; path=/; max-age=0'
      showToast('Logged out successfully', 'success')
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error(err)
      router.push('/login')
    }
  }

  // Update Profile Name/Phone
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingProfile(true)
    setError(null)
    setSuccess(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/auth/session`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ name, phone }),
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Failed to update profile')
      
      showToast('Profile updated successfully!', 'success')
      setSuccess('Profile details saved.')
      
      // Refresh local profile state
      if (profile) {
        setProfile({ ...profile, name, phone })
      }
    } catch (err) {
      console.error(err)
      setError('Failed to save profile modifications.')
    } finally {
      setUpdatingProfile(false)
    }
  }

  // Address book management operations
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAddr || !newCity || !newPin) {
      showToast('Please fill all address fields', 'warning')
      return
    }
    if (!/^\d{6}$/.test(newPin)) {
      showToast('Pincode must be 6 digits', 'warning')
      return
    }

    setSavingAddr(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          address: newAddr,
          city: newCity,
          pincode: newPin,
          isDefault: addresses.length === 0
        }),
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Failed to save address')
      
      showToast('Address added to book', 'success')
      setNewAddr('')
      setNewCity('')
      setNewPin('')
      setShowAddrForm(false)

      // Refresh list
      const addrRes = await fetch(`${apiUrl}/addresses`, { credentials: 'include' })
      const addrData = await addrRes.json()
      setAddresses(addrData)
    } catch (err) {
      console.error(err)
      showToast('Failed to save address details', 'error')
    } finally {
      setSavingAddr(false)
    }
  }

  const handleDeleteAddress = async (id: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/addresses/${id}`, {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Failed to delete address')

      showToast('Address removed', 'info')
      setAddresses(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.error(err)
      showToast('Failed to delete address', 'error')
    }
  }

  // Wishlist item migration
  const handleMoveToCart = (item: any) => {
    if (item.stock <= 0) {
      showToast('Product is out of stock', 'error')
      return
    }
    addToCart({
      id: item.id,
      product_id: item.id,
      name: item.name,
      slug: item.slug,
      image: item.image,
      price: item.price,
      stock: item.stock
    }, 1)
    removeFromWishlist(item.id)
    showToast(`Moved ${item.name} to cart!`, 'success')
  }

  // Get status color styling
  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'delivered') return { bg: 'rgba(16, 185, 129, 0.1)', color: '#34d399', text: 'Delivered' }
    if (s === 'cancelled') return { bg: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', text: 'Cancelled' }
    if (s === 'pending') return { bg: 'rgba(245, 158, 11, 0.1)', color: '#fde047', text: 'Pending' }
    return { bg: 'rgba(59, 130, 246, 0.1)', color: '#93c5fd', text: status }
  }

  // Render Order Timeline Tracker
  const renderTimeline = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'cancelled') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(239,68,68,0.05)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertCircle size={16} />
          <span>This order has been cancelled. Inventory has been returned to stock.</span>
        </div>
      )
    }

    if (s === 'returned') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(148,163,184,0.05)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.15)' }}>
          <RefreshCw size={16} />
          <span>This order has been returned. Refund processed.</span>
        </div>
      )
    }

    const steps = ['pending', 'confirmed', 'packed', 'shipped', 'delivered']
    const currentIndex = steps.indexOf(s)

    return (
      <div style={{ margin: '1.5rem 0', padding: '0 0.5rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '1rem' }}>Order Tracking Timeline</span>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', position: 'relative' }}>
          
          {/* Connector Line */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: 0,
            right: 0,
            height: '3px',
            background: 'var(--border-color)',
            zIndex: 1
          }} />

          <div style={{
            position: 'absolute',
            top: '12px',
            left: 0,
            width: `${Math.max(0, (currentIndex / (steps.length - 1)) * 100)}%`,
            height: '3px',
            background: 'var(--primary)',
            zIndex: 2,
            transition: 'width 0.5s ease'
          }} />

          {/* Steps */}
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentIndex
            const isActive = idx === currentIndex
            
            return (
              <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, position: 'relative' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: isActive ? '#020617' : (isCompleted ? 'var(--primary)' : '#1e293b'),
                  border: `2px solid ${isCompleted ? 'var(--primary)' : 'var(--border-color)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? 'var(--primary)' : '#020617',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  transition: 'all 0.3s'
                }}>
                  {isCompleted ? <CheckCircle size={14} fill="currentColor" stroke="none" style={{ color: isActive ? 'var(--primary)' : '#020617' }} /> : (idx + 1)}
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--primary)' : (isCompleted ? 'var(--text-primary)' : 'var(--text-muted)'),
                  textTransform: 'capitalize',
                  marginTop: '0.5rem'
                }}>
                  {step}
                </span>
              </div>
            )
          })}

        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="spinner" style={{ width: '2.5rem', height: '2.5rem', color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading customer portal data...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation Header */}
      <header className="nav">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span className="logo">Milky Mushrooms Portal</span>
        </Link>
        <div className="nav-user">
          <span className="nav-email">{profile?.email}</span>
          <button className="nav-logout" onClick={handleLogout}>
            <LogOut size={16} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main style={{ flex: 1, padding: '3rem 2rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #FFF 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Welcome, {profile?.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Manage your address directories, purchase logs, and account profile settings.</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
            <CheckCircle size={20} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Workspace Layout Split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="portal-grid">
          
          {/* Left Panel Sidebar Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'profile' ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                color: activeTab === 'profile' ? '#020617' : 'var(--text-primary)',
                fontWeight: 700,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <User size={18} /> Profile Settings
            </button>
            
            <button
              onClick={() => setActiveTab('addresses')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'addresses' ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                color: activeTab === 'addresses' ? '#020617' : 'var(--text-primary)',
                fontWeight: 700,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <MapPin size={18} /> Address Book
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'orders' ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                color: activeTab === 'orders' ? '#020617' : 'var(--text-primary)',
                fontWeight: 700,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <ShoppingBag size={18} /> Order History ({orders.length})
            </button>

            <button
              onClick={() => setActiveTab('wishlist')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'wishlist' ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                color: activeTab === 'wishlist' ? '#020617' : 'var(--text-primary)',
                fontWeight: 700,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Heart size={18} /> Wishlist ({wishlist.length})
            </button>
          </div>

          {/* Right Main Panel Display */}
          <div className="dashboard-card" style={{ padding: '2.5rem' }}>
            
            {/* PROFILE SETTINGS TAB */}
            {activeTab === 'profile' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={22} style={{ color: 'var(--primary)' }} /> Profile Credentials
                </h2>

                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
                  <div className="input-group">
                    <label className="input-label" htmlFor="name-field">Full Name</label>
                    <input
                      id="name-field"
                      type="text"
                      className="input-field"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={updatingProfile}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label" htmlFor="email-display">Email Address</label>
                    <input
                      id="email-display"
                      type="email"
                      className="input-field"
                      value={profile?.email}
                      disabled
                      style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label" htmlFor="phone-field">Phone Number</label>
                    <input
                      id="phone-field"
                      type="text"
                      className="input-field"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={updatingProfile}
                    />
                  </div>

                  <button type="submit" className="btn-primary" disabled={updatingProfile} style={{ width: 'auto', padding: '0.75rem 2rem', marginTop: '1rem' }}>
                    {updatingProfile ? <Loader2 className="spinner" /> : (
                      <>
                        <Save size={16} /> Save profile
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ADDRESS BOOK TAB */}
            {activeTab === 'addresses' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={22} style={{ color: 'var(--primary)' }} /> Address Directories
                  </h2>
                  {!showAddrForm && (
                    <button
                      onClick={() => setShowAddrForm(true)}
                      className="btn-secondary"
                      style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Plus size={14} /> Add New Address
                    </button>
                  )}
                </div>

                {showAddrForm && (
                  <form onSubmit={handleAddAddress} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', maxWidth: '600px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Add Shipping Address</h3>
                    <div className="input-group">
                      <label className="input-label" htmlFor="street-input">Street Address</label>
                      <input
                        id="street-input"
                        type="text"
                        className="input-field"
                        placeholder="Street Name, Flat no."
                        value={newAddr}
                        onChange={(e) => setNewAddr(e.target.value)}
                        disabled={savingAddr}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="input-group">
                        <label className="input-label" htmlFor="city-input">City</label>
                        <input
                          id="city-input"
                          type="text"
                          className="input-field"
                          placeholder="Palani"
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          disabled={savingAddr}
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label" htmlFor="pincode-input">Pincode</label>
                        <input
                          id="pincode-input"
                          type="text"
                          className="input-field"
                          placeholder="624601"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          disabled={savingAddr}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <button type="button" onClick={() => setShowAddrForm(false)} className="btn-secondary" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary" disabled={savingAddr} style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
                        {savingAddr ? <Loader2 className="spinner" /> : 'Save Address'}
                      </button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '24px' }}>
                    <MapPin size={36} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>No Addresses Configured</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Configure shipping address nodes to complete order checkouts.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    {addresses.map((a) => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '16px', background: 'rgba(0,0,0,0.15)' }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.95rem' }} className="info-value">{a.address}</p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            {a.city} - {a.pincode}
                          </p>
                          {a.isDefault && (
                            <span className="badge badge-customer" style={{ fontSize: '0.65rem', marginTop: '0.5rem', padding: '0.1rem 0.5rem' }}>Default Shipping</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteAddress(a.id)}
                          className="nav-logout"
                          style={{ fontSize: '0.85rem', fontWeight: 600 }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ORDER HISTORY TAB */}
            {activeTab === 'orders' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShoppingBag size={22} style={{ color: 'var(--primary)' }} /> Purchase Ledgers
                </h2>

                {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '24px' }}>
                    <ShoppingBag size={36} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>No Purchase History</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>You have not recorded any spawn or product purchase orders yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {orders.map((o) => {
                      const stat = getStatusStyle(o.status)
                      
                      return (
                        <div
                          key={o.id}
                          style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '24px',
                            background: 'rgba(15, 23, 42, 0.3)',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Order Card Header */}
                          <div style={{
                            padding: '1.25rem 1.5rem',
                            background: 'rgba(255,255,255,0.02)',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '1rem'
                          }}>
                            <div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Order Reference</span>
                              <p style={{ fontSize: '0.9rem', fontWeight: 700 }} className="info-value">#{o.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Date Purchased</span>
                              <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{new Date(o.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Order Amount</span>
                              <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>₹{o.amount.toFixed(2)}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ background: stat.bg, color: stat.color, fontSize: '0.7rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: 700, textTransform: 'uppercase' }}>
                                {stat.text}
                              </span>
                              <a
                                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/orders/${o.id}/invoice`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem',
                                  background: 'rgba(255,255,255,0.05)',
                                  color: 'var(--text-primary)',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '9999px',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                <FileText size={12} /> Invoice
                              </a>
                            </div>
                          </div>

                          {/* Order Card Items List */}
                          <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                              {o.items.map((item) => (
                                <div key={item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                  {item.product?.image ? (
                                    <img src={item.product.image} alt={item.product.name} style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover' }} />
                                  ) : null}
                                  <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 600 }} className="info-value">{item.product?.name || 'Deleted Spawn Pack'}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹{item.price} &times; {item.quantity}</p>
                                  </div>
                                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            {/* Timeline status track visual */}
                            {renderTimeline(o.status)}

                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '1rem', marginTop: '1rem' }}>
                              <strong>Shipping Address:</strong> {o.address}
                            </div>
                          </div>

                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST TAB */}
            {activeTab === 'wishlist' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Heart size={22} style={{ color: '#EF4444' }} /> Favorites Wishlist
                </h2>

                {wishlist.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '24px' }}>
                    <Heart size={36} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Wishlist is Empty</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>You have not marked any organic products or spawns as favorites.</p>
                    <Link href="/" className="btn-secondary" style={{ width: 'auto', padding: '0.5rem 1.5rem', borderRadius: '12px', display: 'inline-flex' }}>
                      Browse Products
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                    {wishlist.map((item) => (
                      <div key={item.id} className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                        <img src={item.image} alt={item.name} style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '12px', marginBottom: '0.75rem' }} />
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem', lineHeight: '1.3', flex: 1 }}>{item.name}</h4>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '1rem' }}>₹{item.price}</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleMoveToCart(item)}
                            className="btn-primary"
                            style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem', borderRadius: '8px' }}
                          >
                            Move to Cart
                          </button>
                          <button
                            onClick={() => { removeFromWishlist(item.id); showToast('Removed from favorites', 'info'); }}
                            className="btn-secondary"
                            style={{ padding: '0.45rem', fontSize: '0.8rem', borderRadius: '8px', color: '#EF4444', borderColor: '#EF4444' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </main>

      <style jsx global>{`
        .portal-grid {
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .portal-grid {
            grid-template-columns: 240px 1fr;
          }
        }
      `}</style>

    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-light)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading Dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
