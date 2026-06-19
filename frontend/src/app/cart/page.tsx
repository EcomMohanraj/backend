'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2, ShieldCheck, HelpCircle, Sparkles } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'

interface StoreSettings {
  id: string
  storeName: string
  deliveryCharges: number
  taxPercentage: number
}

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, cartSubtotal, clearCart } = useCart()
  const { showToast } = useToast()
  
  const [settings, setSettings] = useState<StoreSettings>({
    id: 'default',
    storeName: 'Milky Mushrooms',
    deliveryCharges: 50,
    taxPercentage: 5
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const res = await fetch(`${apiUrl}/settings`)
        if (res.ok) {
          const data = await res.json()
          setSettings(data)
        }
      } catch (err) {
        console.warn('Failed to load store settings, using defaults:', err)
      }
    }
    loadSettings()
  }, [])

  const taxAmount = (cartSubtotal * settings.taxPercentage) / 100
  const grandTotal = cartSubtotal > 0 ? cartSubtotal + settings.deliveryCharges + taxAmount : 0

  const handleQtyChange = (productId: string, qty: number) => {
    updateQuantity(productId, qty)
  }

  const handleRemoveItem = (productId: string, name: string) => {
    removeFromCart(productId)
    showToast(`Removed ${name} from cart`, 'info')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header className="nav">
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} />
          <span>Continue Shopping</span>
        </Link>
        <span className="logo">Milky Mushrooms Cart</span>
      </header>

      {/* Cart Container */}
      <main style={{ flex: 1, padding: '3rem 2rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '2rem', background: 'linear-gradient(135deg, #FFF 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Shopping Cart
        </h1>

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🛒</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Your Cart is Empty</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>You have not added any spawn cultures or organic substrates to your basket.</p>
            <Link href="/" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem', borderRadius: '12px', display: 'inline-flex' }}>
              Explore Farm Store
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }} className="cart-layout">
            
            {/* Left: Cart Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  className="dashboard-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    flexWrap: 'wrap',
                    padding: '1.5rem'
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }}
                  />

                  {/* Product Details */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <Link href={`/products/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }} className="product-title-hover">
                        {item.name}
                      </h3>
                    </Link>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Price: ₹{item.price}</span>
                  </div>

                  {/* Quantity Controller */}
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
                    <button
                      onClick={() => handleQtyChange(item.product_id, item.quantity - 1)}
                      style={{ background: 'none', border: 'none', color: 'white', width: '30px', height: '30px', cursor: 'pointer', fontSize: '1.1rem' }}
                    >
                      -
                    </button>
                    <span style={{ width: '36px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>{item.quantity}</span>
                    <button
                      onClick={() => handleQtyChange(item.product_id, item.quantity + 1)}
                      style={{ background: 'none', border: 'none', color: 'white', width: '30px', height: '30px', cursor: 'pointer', fontSize: '1.1rem' }}
                    >
                      +
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)' }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleRemoveItem(item.product_id, item.name)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '8px',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={18} />
                  </button>

                </div>
              ))}

              {/* Clear Cart Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  onClick={() => { clearCart(); showToast('Basket cleared', 'info'); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Clear All Items
                </button>
              </div>
            </div>

            {/* Right: Summary Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="dashboard-card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  Order Summary
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Items Subtotal:</span>
                    <span style={{ fontWeight: 600 }}>₹{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>GST / Tax ({settings.taxPercentage}%):</span>
                    <span style={{ fontWeight: 600 }}>₹{taxAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Delivery Charges:</span>
                    <span style={{ fontWeight: 600 }}>₹{settings.deliveryCharges.toFixed(2)}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Grand Total:</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Link href="/checkout" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary" style={{ marginTop: '2rem', padding: '0.9rem' }}>
                    Proceed to Checkout
                  </button>
                </Link>
              </div>

              {/* Guarantees */}
              <div className="dashboard-card" style={{ padding: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <ShieldCheck size={28} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Secure Checkout Process</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>Your transaction details are encrypted using local security standards.</p>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      <style jsx global>{`
        @media (min-width: 992px) {
          .cart-layout {
            grid-template-columns: 2fr 1fr;
          }
        }
      `}</style>

    </div>
  )
}
