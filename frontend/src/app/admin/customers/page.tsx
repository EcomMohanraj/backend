'use client'

import { useEffect, useState } from 'react'
import { Users2, ShieldAlert, KeyRound, Eye, Loader2, Search, Check, Ban } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  createdAt: string
  orderCount: number
  totalSpent: number
  blocked?: boolean
}

interface Address {
  id: string
  address: string
  city: string
  pincode: string
  isDefault: boolean
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  product?: {
    name: string
  }
}

interface Order {
  id: string
  amount: number
  status: string
  createdAt: string
  items: OrderItem[]
}

interface CustomerDetails extends Customer {
  addresses: Address[]
  orders: Order[]
}

export default function AdminCustomers() {
  const { showToast } = useToast()
  
  // Data States
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Detail Modal view state
  const [details, setDetails] = useState<CustomerDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Reset Password form state
  const [showResetForm, setShowResetForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPass, setResettingPass] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/customers`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        
        // Match user blocking indicators dynamically by fetching each user's detail if needed
        // For list performance, getSession/details yields blocking profiles
        setCustomers(data)
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to load customer directory', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load selected customer addresses and orders
  const handleViewDetails = async (id: string) => {
    setLoadingDetails(true)
    setShowResetForm(false)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/customers/${id}`, { credentials: 'include' })
      if (res.ok) {
        const payload = await res.json()
        
        // Find blocked status from list
        const listMatch = customers.find(c => c.id === id)
        
        // The list API returns blocked status if mapped, otherwise default false
        setDetails({
          ...payload,
          blocked: listMatch?.blocked || false
        })
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to fetch customer profile details', 'error')
    } finally {
      setLoadingDetails(false)
    }
  }

  // Toggle user blocking block/unblock status in database
  const handleToggleBlock = async (cust: Customer) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/customers/${cust.id}/toggle-block`, {
        method: 'PUT',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to toggle status')
      }

      const resData = await res.json()
      
      showToast(resData.blocked ? 'Account has been blocked' : 'Account has been unblocked', 'info')
      
      // Update list
      setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, blocked: resData.blocked } : c))
      
      // Update active view details
      if (details && details.id === cust.id) {
        setDetails({ ...details, blocked: resData.blocked })
      }
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Operation failed.', 'error')
    }
  }

  // Reset Customer password direct trigger
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!details || !newPassword) return

    setResettingPass(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/customers/${details.id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ newPassword }),
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Password reset failed')

      showToast('Customer password updated successfully!', 'success')
      setNewPassword('')
      setShowResetForm(false)
    } catch (err) {
      console.error(err)
      showToast('Failed to reset customer credentials', 'error')
    } finally {
      setResettingPass(false)
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #FFF 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Customer Directory
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review client details, spend analytics, block accounts, or reset credentials.</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '250px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={14} />
          </span>
          <input
            type="text"
            className="input-field"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem', borderRadius: '8px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Grid splits */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="admin-customers-layout">
        
        {/* Left: Customers Directory list */}
        <div className="dashboard-card" style={{ padding: '1.5rem', overflowX: 'auto', height: 'fit-content' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 className="spinner" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No customers found.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Customer</th>
                  <th>Spend</th>
                  <th>Orders</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '14px 12px' }}>
                      <strong style={{ display: 'block' }} className="info-value">{c.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{c.totalSpent.toFixed(2)}</td>
                    <td>{c.orderCount} purchases</td>
                    <td>
                      <span style={{
                        background: c.blocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: c.blocked ? '#FCA5A5' : '#34D399',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {c.blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleViewDetails(c.id)}
                          className="btn-secondary"
                          style={{ padding: '0.4rem', borderRadius: '8px' }}
                          title="View Ledger"
                        >
                          <Eye size={14} />
                        </button>
                        
                        <button
                          onClick={() => handleToggleBlock(c)}
                          className="btn-secondary"
                          style={{ padding: '0.4rem', borderRadius: '8px', color: c.blocked ? '#34D399' : '#EF4444', borderColor: c.blocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}
                          title={c.blocked ? 'Unblock user' : 'Block user'}
                        >
                          <Ban size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Selected Ledger Details view */}
        <div>
          {loadingDetails ? (
            <div className="dashboard-card" style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
              <Loader2 className="spinner" />
            </div>
          ) : details ? (
            <div className="dashboard-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }} className="info-value">{details.name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Member Since: {new Date(details.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Password reset box toggler */}
              <div>
                <button
                  onClick={() => setShowResetForm(!showResetForm)}
                  className="btn-secondary"
                  style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <KeyRound size={14} /> Change Password
                </button>

                {showResetForm && (
                  <form onSubmit={handleResetPasswordSubmit} style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="input-group">
                      <label className="input-label" htmlFor="new-pass">Temporary Password</label>
                      <input
                        id="new-pass"
                        type="text"
                        className="input-field"
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        disabled={resettingPass}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                    <button type="submit" className="btn-primary" disabled={resettingPass} style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
                      {resettingPass ? <Loader2 className="spinner" /> : 'Set password'}
                    </button>
                  </form>
                )}
              </div>

              {/* Address list */}
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>Saved Shipping Addresses</span>
                {details.addresses.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No addresses configured.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {details.addresses.map((a) => (
                      <div key={a.id} style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        {a.address}, {a.city} - {a.pincode} {a.isDefault && ' (Default)'}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Purchase log list */}
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>Order Purchase Log ({details.orders.length})</span>
                {details.orders.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No orders found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {details.orders.map((o) => (
                      <div key={o.id} style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>#{o.id.slice(0,8).toUpperCase()}</strong> - {new Date(o.createdAt).toLocaleDateString()}<br />
                          <span style={{ color: 'var(--text-muted)' }}>Status: {o.status}</span>
                        </div>
                        <strong style={{ color: 'var(--primary)' }}>₹{o.amount}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="dashboard-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a customer from the directory log to inspect ledger detail.
            </div>
          )}
        </div>

      </div>

      <style jsx global>{`
        .admin-customers-layout {
          grid-template-columns: 1fr;
        }
        @media (min-width: 992px) {
          .admin-customers-layout {
            grid-template-columns: 1.5fr 1fr;
          }
        }
      `}</style>

    </div>
  )
}
