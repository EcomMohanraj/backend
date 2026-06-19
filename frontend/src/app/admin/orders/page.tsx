'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, FileText, ShoppingBag, Eye, Calendar, User } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

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
  payment_id?: string
  address: string
  created_at: string
  customer?: {
    name: string
    email: string
    phone?: string
  }
  items: OrderItem[]
}

export default function AdminOrders() {
  const { showToast } = useToast()
  
  // Data States
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('All')

  // Detailed view overlay modal
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/orders`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to load orders list', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Update order status on backend
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const res = await fetch(`${apiUrl}/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to update order status')
      }

      showToast(`Order status updated to '${newStatus}'!`, 'success')
      
      // Update local state list
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
      if (activeOrder && activeOrder.id === id) {
        setActiveOrder({ ...activeOrder, status: newStatus })
      }
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update status', 'error')
    }
  }

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'delivered') return '#34d399'
    if (s === 'cancelled') return '#fca5a5'
    if (s === 'pending') return '#fde047'
    if (s === 'shipped') return '#c084fc'
    return '#93c5fd'
  }

  const filteredOrders = orders.filter(o => {
    if (filterStatus === 'All') return true
    return o.status.toLowerCase() === filterStatus.toLowerCase()
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #FFF 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Customer Orders
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Fulfill orders, dispatch shipments, or review timeline logs.</p>
        </div>

        {/* Status Category Filter */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['All', 'Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: filterStatus === status ? 'var(--primary)' : 'var(--border-color)',
                background: filterStatus === status ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                color: filterStatus === status ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="dashboard-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <ShoppingBag size={36} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No orders match the selected filter category.</p>
        </div>
      ) : (
        <div className="dashboard-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Order Date</th>
                <th>Update Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '14px 12px', fontWeight: 'bold' }}>#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td>
                    <div>
                      <strong style={{ display: 'block' }} className="info-value">{o.customer?.name || 'Guest User'}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.customer?.email}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--primary)' }}>₹{o.amount.toFixed(2)}</td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>
                    <select
                      value={o.status}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        color: getStatusColor(o.status),
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '0.3rem 1.5rem 0.3rem 0.5rem',
                        outline: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="packed">Packed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="returned">Returned</option>
                    </select>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setActiveOrder(o)}
                        className="btn-secondary"
                        style={{ padding: '0.4rem', borderRadius: '8px' }}
                        title="Quick View Details"
                      >
                        <Eye size={14} />
                      </button>
                      
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/orders/${o.id}/invoice`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                        style={{ padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
                        title="Print Invoice"
                      >
                        <FileText size={14} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal Overlay */}
      {activeOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem'
        }}>
          <div className="auth-card" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Order Detail View
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.875rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Customer</span>
                  <strong>{activeOrder.customer?.name}</strong><br />
                  {activeOrder.customer?.email}<br />
                  {activeOrder.customer?.phone || 'No phone'}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Logistics Metadata</span>
                  <strong>Status:</strong> {activeOrder.status}<br />
                  <strong>Payment ID:</strong> {activeOrder.payment_id || 'N/A'}<br />
                  <strong>Date:</strong> {new Date(activeOrder.created_at).toLocaleString()}
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Shipping Address</span>
                <p style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>{activeOrder.address}</p>
              </div>

              {/* Items Table */}
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Order Items</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeOrder.items.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                      <span>{item.product?.name || 'Deleted Product'} <strong>&times; {item.quantity}</strong></span>
                      <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem', fontSize: '1rem' }}>
                    <strong>Total Amount:</strong>
                    <strong style={{ color: 'var(--primary)' }}>₹{activeOrder.amount.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveOrder(null)}
                  className="btn-secondary"
                >
                  Close View
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}
