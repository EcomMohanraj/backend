'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DollarSign, ShoppingCart, Users, FolderOpen, AlertTriangle, ArrowUpRight, TrendingUp, Sparkles, AlertCircle, CheckCircle } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

interface Metrics {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  ordersToday: number
  ordersThisMonth: number
  lowStockCount: number
}

interface LowStockProduct {
  id: string
  name: string
  stock: number
  category: string
}

interface SalesDataPoint {
  date: string
  sales: number
}

interface TopProduct {
  name: string
  quantity: number
  revenue: number
  category: string
}

interface AnalyticsPayload {
  metrics: Metrics
  lowStockProducts: LowStockProduct[]
  dailySales: SalesDataPoint[]
  topSellingProducts: TopProduct[]
}

export default function AdminDashboard() {
  const { showToast } = useToast()
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        
        // 1. Load summary metrics
        const res = await fetch(`${apiUrl}/analytics`, { credentials: 'include' })
        if (res.ok) {
          const payload = await res.json()
          setData(payload)
        }

        // 2. Load recent orders
        const ordersRes = await fetch(`${apiUrl}/orders`, { credentials: 'include' })
        if (ordersRes.ok) {
          const ordersList = await ordersRes.json()
          setRecentOrders(ordersList.slice(0, 5)) // get top 5
        }
      } catch (err) {
        console.error(err)
        showToast('Failed to load metrics data.', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{ width: '2.5rem', height: '2.5rem', color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Compiling operational analytics...</p>
      </div>
    )
  }

  const metrics = data?.metrics || {
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    ordersToday: 0,
    ordersThisMonth: 0,
    lowStockCount: 0
  }

  const lowStock = data?.lowStockProducts || []
  const topProducts = data?.topSellingProducts || []
  const salesTimeline = data?.dailySales || []

  // Calculate highest sales point for chart scaling
  const maxSalesVal = salesTimeline.length > 0 
    ? Math.max(...salesTimeline.map(s => s.sales), 500)
    : 1000

  return (
    <div>
      {/* Welcome header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #FFF 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Store Management
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review revenue performance, trace orders, and track low stock alerts.</p>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sparkles size={14} /> Server Online
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Total Revenue */}
        <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', width: '50px', height: '50px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Revenue</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.1rem' }}>₹{metrics.totalRevenue.toFixed(2)}</h3>
          </div>
        </div>

        {/* Total Orders */}
        <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', width: '50px', height: '50px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA', flexShrink: 0 }}>
            <ShoppingCart size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Orders</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.1rem' }}>{metrics.totalOrders}</h3>
          </div>
        </div>

        {/* Total Customers */}
        <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', width: '50px', height: '50px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93C5FD', flexShrink: 0 }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Customers</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.1rem' }}>{metrics.totalCustomers}</h3>
          </div>
        </div>

        {/* Active Products */}
        <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', width: '50px', height: '50px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FBBF24', flexShrink: 0 }}>
            <FolderOpen size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Products</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.1rem' }}>{metrics.totalProducts}</h3>
          </div>
        </div>

      </div>

      {/* Main Charts / Layout Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2.5rem' }} className="admin-grid">
        
        {/* Left: Sales timeline CSS chart */}
        <div className="dashboard-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} style={{ color: 'var(--primary)' }} /> Daily Sales Revenue Timeline
          </h3>

          {salesTimeline.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', padding: '3rem 0' }}>
              <p style={{ color: 'var(--text-muted)' }}>No sales recorded during this window.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '240px', gap: '12px', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', marginTop: '1rem' }}>
              {salesTimeline.slice(-7).map((point, idx) => {
                const heightPercentage = Math.max(5, (point.sales / maxSalesVal) * 100)
                
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', minWidth: '45px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>₹{point.sales.toFixed(0)}</span>
                    <div style={{
                      width: '100%',
                      maxWidth: '30px',
                      height: `${heightPercentage}%`,
                      background: 'linear-gradient(180deg, var(--primary) 0%, rgba(16, 185, 129, 0.1) 100%)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.5s ease-out',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
                    }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{point.date}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Low Stock Warnings */}
        <div className="dashboard-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FBBF24' }}>
            <AlertTriangle size={20} /> Low Stock Warnings ({lowStock.length})
          </h3>

          {lowStock.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '1rem', borderRadius: '12px', color: '#6EE7B7' }}>
              <CheckCircle size={16} />
              <span style={{ fontSize: '0.85rem' }}>All spawn inventory thresholds are optimal.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {lowStock.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }} className="info-value">{item.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category: {item.category}</span>
                  </div>
                  <span style={{ background: '#EF4444', color: '#020617', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem' }}>
                    {item.stock} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Bottom split: Recent Orders & Top Selling Products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="admin-grid-bottom">
        
        {/* Recent Orders */}
        <div className="dashboard-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Recent Order Log</h3>
            <Link href="/admin/orders" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              View all orders <ArrowUpRight size={14} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No orders recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 0' }}>Order ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px 0', fontWeight: 'bold' }}>#{o.id.slice(0, 8).toUpperCase()}</td>
                      <td>{o.customer?.name || 'Guest'}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>₹{o.amount}</td>
                      <td>
                        <span style={{
                          background: o.status === 'delivered' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: o.status === 'delivered' ? '#34d399' : '#fde047',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          fontWeight: 700
                        }}>
                          {o.status}
                        </span>
                      </td>
                      <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top selling products */}
        <div className="dashboard-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', fontWeight: 700 }}>Top Selling Products</h3>

          {topProducts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No sales data calculated yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {topProducts.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <strong style={{ display: 'block' }} className="info-value">{p.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category: {p.category}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontWeight: 'bold' }}>{p.quantity} units sold</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>₹{p.revenue.toFixed(0)} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style jsx global>{`
        .admin-grid {
          grid-template-columns: 1fr;
        }
        .admin-grid-bottom {
          grid-template-columns: 1fr;
        }
        @media (min-width: 992px) {
          .admin-grid {
            grid-template-columns: 1.8fr 1fr;
          }
          .admin-grid-bottom {
            grid-template-columns: 1.2fr 1fr;
          }
        }
      `}</style>
    </div>
  )
}
