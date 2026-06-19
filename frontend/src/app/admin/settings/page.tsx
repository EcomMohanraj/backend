'use client'

import { useEffect, useState } from 'react'
import { Settings, Save, Loader2, Info } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

export default function AdminSettings() {
  const { showToast } = useToast()

  // Form States
  const [storeName, setStoreName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [email, setEmail] = useState('')
  const [deliveryCharges, setDeliveryCharges] = useState('')
  const [taxPercentage, setTaxPercentage] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const res = await fetch(`${apiUrl}/settings`)
        if (res.ok) {
          const data = await res.json()
          setStoreName(data.storeName)
          setContactNumber(data.contactNumber)
          setEmail(data.email)
          setDeliveryCharges(data.deliveryCharges.toString())
          setTaxPercentage(data.taxPercentage.toString())
        }
      } catch (err) {
        console.error(err)
        showToast('Failed to load store settings', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeName || !contactNumber || !email || !deliveryCharges || !taxPercentage) {
      showToast('All settings fields are required.', 'warning')
      return
    }

    setSaving(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const res = await fetch(`${apiUrl}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          storeName,
          contactNumber,
          email,
          deliveryCharges: Number(deliveryCharges),
          taxPercentage: Number(taxPercentage)
        }),
        credentials: 'include'
      })

      if (!res.ok) {
        throw new Error('Failed to save settings')
      }

      showToast('Store settings updated successfully!', 'success')
    } catch (err) {
      console.error(err)
      showToast('Failed to save store settings.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Loader2 className="spinner" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #FFF 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Store Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage portal title text, shipping fees, tax values, and support contact details.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="admin-settings-layout">
        
        {/* Settings form */}
        <div className="dashboard-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} style={{ color: 'var(--primary)' }} /> Edit Configuration
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
            
            <div className="input-group">
              <label className="input-label" htmlFor="store-name-input">Store Name</label>
              <input
                id="store-name-input"
                type="text"
                className="input-field"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                disabled={saving}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="contact-input">Contact Phone</label>
                <input
                  id="contact-input"
                  type="text"
                  className="input-field"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="email-input">Store Email</label>
                <input
                  id="email-input"
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="delivery-input">Flat Delivery Fee (₹)</label>
                <input
                  id="delivery-input"
                  type="number"
                  className="input-field"
                  value={deliveryCharges}
                  onChange={(e) => setDeliveryCharges(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="tax-input">Tax Percentage (%)</label>
                <input
                  id="tax-input"
                  type="number"
                  className="input-field"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={saving} style={{ width: 'auto', padding: '0.75rem 2rem', marginTop: '1rem' }}>
              {saving ? <Loader2 className="spinner" /> : (
                <>
                  <Save size={16} /> Save Configurations
                </>
              )}
            </button>

          </form>
        </div>

        {/* Informative block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <Info size={22} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem' }}>Store Configurations Scope</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Updating these settings will instantly modify checkout tax percentages, delivery surcharges, and order invoice calculations globally for all customers.
              </p>
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`
        .admin-settings-layout {
          grid-template-columns: 1fr;
        }
        @media (min-width: 992px) {
          .admin-settings-layout {
            grid-template-columns: 1.8fr 1fr;
          }
        }
      `}</style>
    </div>
  )
}
