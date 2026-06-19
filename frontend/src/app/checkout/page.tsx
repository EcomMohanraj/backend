'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Check, Loader2, ShieldCheck, CreditCard } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'

// Zod validation schema for Address
const addressSchema = z.object({
  address: z.string().min(5, 'Address details must be at least 5 characters long'),
  city: z.string().min(2, 'City name is too short'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits')
})

type AddressFormValues = z.infer<typeof addressSchema>

interface SavedAddress {
  id: string
  address: string
  city: string
  pincode: string
  isDefault: boolean
}

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, cartSubtotal, clearCart } = useCart()
  const { showToast } = useToast()

  // State Management
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  
  // Razorpay mock modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentProcessing, setPaymentProcessing] = useState(false)

  // Store setting rules
  const [settings, setSettings] = useState({
    deliveryCharges: 50,
    taxPercentage: 5
  })

  // React Hook Form for new Address
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema)
  })

  useEffect(() => {
    // Redirect if cart is empty
    if (cart.length === 0) {
      router.push('/cart')
      return
    }

    async function loadCheckoutData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        
        // 1. Fetch store settings
        const settingsRes = await fetch(`${apiUrl}/settings`)
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json()
          setSettings(settingsData)
        }

        // 2. Fetch customer addresses (validates session too)
        const addrRes = await fetch(`${apiUrl}/addresses`, { credentials: 'include' })
        if (!addrRes.ok) {
          router.push('/login?error=Please sign in to complete your checkout.')
          return
        }

        const addrData = await addrRes.json()
        setAddresses(addrData)
        
        // Auto select default address
        const defaultAddr = addrData.find((a: SavedAddress) => a.isDefault)
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id)
        } else if (addrData.length > 0) {
          setSelectedAddressId(addrData[0].id)
        }
      } catch (err) {
        console.error('Checkout initialization failed:', err)
        showToast('Checkout loading failed. Verify the backend connection.', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadCheckoutData()
  }, [cart, router])

  const taxAmount = (cartSubtotal * settings.taxPercentage) / 100
  const grandTotal = cartSubtotal + settings.deliveryCharges + taxAmount

  // Handle adding new address
  const handleAddNewAddress = async (data: AddressFormValues) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const res = await fetch(`${apiUrl}/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          address: data.address,
          city: data.city,
          pincode: data.pincode,
          isDefault: addresses.length === 0 // default if first address
        }),
        credentials: 'include'
      })

      if (!res.ok) {
        throw new Error('Failed to save address')
      }

      const newAddress = await res.json()
      
      // Reload address list
      const addrRes = await fetch(`${apiUrl}/addresses`, { credentials: 'include' })
      const addrData = await addrRes.json()
      setAddresses(addrData)
      setSelectedAddressId(newAddress.id)
      
      showToast('Address added successfully!', 'success')
      reset()
      setShowAddressForm(false)
    } catch (err) {
      console.error(err)
      showToast('Failed to add address.', 'error')
    }
  }

  // Trigger payment gateway mockup
  const handleCheckoutSubmit = () => {
    if (!selectedAddressId) {
      showToast('Please select or add a shipping address.', 'warning')
      return
    }
    setShowPaymentModal(true)
  }

  // Confirm mock payment outcome
  const processMockPayment = async (status: 'success' | 'fail') => {
    setPaymentProcessing(true)
    
    // Simulate gateway response delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (status === 'fail') {
      showToast('Razorpay payment failed. Transaction declined.', 'error')
      setPaymentProcessing(false)
      setShowPaymentModal(false)
      return
    }

    // Success transaction
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const selectedAddr = addresses.find(a => a.id === selectedAddressId)
      const fullAddressString = `${selectedAddr?.address}, ${selectedAddr?.city} - ${selectedAddr?.pincode}`

      const response = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          amount: grandTotal,
          address: fullAddressString,
          payment_id: `pay_mock_${Math.random().toString(36).substring(2, 10)}`,
          status: 'paid',
          items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price
          }))
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Order submission failed.')
      }

      showToast('Payment successful! Order placed.', 'success')
      clearCart()
      router.push('/dashboard?message=Order placed successfully! Trace status below.')
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to record checkout order.', 'error')
      setPaymentProcessing(false)
      setShowPaymentModal(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="spinner" style={{ width: '2.5rem', height: '2.5rem', color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Preparing checkout details...</p>
      </div>
    )
  }

  const activeAddress = addresses.find(a => a.id === selectedAddressId)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header className="nav">
        <Link href="/cart" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} />
          <span>Back to Cart</span>
        </Link>
        <span className="logo">Milky Mushrooms Checkout</span>
      </header>

      {/* Checkout Content */}
      <main style={{ flex: 1, padding: '3rem 2rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '2.5rem', background: 'linear-gradient(135deg, #FFF 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Secure Checkout
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }} className="checkout-layout">
          
          {/* Left: Addresses and payments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Shipping Address list */}
            <div className="dashboard-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Select Delivery Address</h2>
                {!showAddressForm && (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="btn-secondary"
                    style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Plus size={14} /> Add New
                  </button>
                )}
              </div>

              {showAddressForm ? (
                <form onSubmit={handleSubmit(handleAddNewAddress)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>New Address Form</h3>
                  
                  {/* Address Box */}
                  <div className="input-group">
                    <label className="input-label" htmlFor="address-details">Street Address</label>
                    <input
                      id="address-details"
                      type="text"
                      className="input-field"
                      placeholder="Flat/House no, Street Name, Landmark"
                      {...register('address')}
                      disabled={isSubmitting}
                    />
                    {errors.address && <span style={{ color: '#F87171', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.address.message}</span>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* City */}
                    <div className="input-group">
                      <label className="input-label" htmlFor="city-field">City</label>
                      <input
                        id="city-field"
                        type="text"
                        className="input-field"
                        placeholder="Palani"
                        {...register('city')}
                        disabled={isSubmitting}
                      />
                      {errors.city && <span style={{ color: '#F87171', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.city.message}</span>}
                    </div>

                    {/* Pincode */}
                    <div className="input-group">
                      <label className="input-label" htmlFor="pincode-field">Pincode</label>
                      <input
                        id="pincode-field"
                        type="text"
                        className="input-field"
                        placeholder="624601"
                        {...register('pincode')}
                        disabled={isSubmitting}
                      />
                      {errors.pincode && <span style={{ color: '#F87171', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.pincode.message}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="btn-secondary"
                      style={{ width: 'auto', padding: '0.6rem 1.5rem', borderRadius: '12px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary"
                      style={{ width: 'auto', padding: '0.6rem 1.5rem', borderRadius: '12px' }}
                    >
                      {isSubmitting ? <Loader2 className="spinner" /> : 'Save Address'}
                    </button>
                  </div>
                </form>
              ) : null}

              {addresses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>No delivery address recorded.</p>
                  <button onClick={() => setShowAddressForm(true)} className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1.5rem', borderRadius: '12px' }}>
                    Add First Address
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {addresses.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => setSelectedAddressId(a.id)}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '16px',
                        border: '1px solid',
                        borderColor: selectedAddressId === a.id ? 'var(--primary)' : 'var(--border-color)',
                        background: selectedAddressId === a.id ? 'rgba(16, 185, 129, 0.04)' : 'rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: selectedAddressId === a.id ? 'var(--primary)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '2px',
                        flexShrink: 0
                      }}>
                        {selectedAddressId === a.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                          {a.address}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {a.city} - {a.pincode}
                        </p>
                        {a.isDefault && (
                          <span className="badge badge-customer" style={{ fontSize: '0.65rem', marginTop: '0.5rem', padding: '0.1rem 0.5rem' }}>Default</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Summary options */}
            <div className="dashboard-card" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                Payment Method
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.25rem',
                border: '1px solid var(--primary)',
                borderRadius: '16px',
                background: 'rgba(16, 185, 129, 0.04)'
              }}>
                <CreditCard size={24} style={{ color: 'var(--primary)' }} />
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Razorpay Secure Gateway</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pay instantly via UPI, Cards, NetBanking, or Wallet.</p>
                </div>
                <div style={{ marginLeft: 'auto', background: 'var(--primary)', color: '#020617', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={12} strokeWidth={3} />
                </div>
              </div>
            </div>

          </div>

          {/* Right: Checkout items summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="dashboard-card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                Review Order
              </h3>

              {/* Mini Cart List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {cart.map((item) => (
                  <div key={item.product_id} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <img src={item.image} alt={item.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600 }} className="info-value">{item.name}</p>
                      <p style={{ color: 'var(--text-muted)' }}>Qty: {item.quantity} x ₹{item.price}</p>
                    </div>
                    <span style={{ fontWeight: 600 }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Price summary math */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                  <span>₹{cartSubtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>GST / Tax ({settings.taxPercentage}%):</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Delivery Fee:</span>
                  <span>₹{settings.deliveryCharges.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                  <strong style={{ fontSize: '1rem' }}>Order Total:</strong>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>₹{grandTotal.toFixed(2)}</strong>
                </div>
              </div>

              {/* Selected address review */}
              {activeAddress && (
                <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Shipping To</span>
                  <strong>{activeAddress.address}</strong>, {activeAddress.city} - {activeAddress.pincode}
                </div>
              )}

              <button
                onClick={handleCheckoutSubmit}
                disabled={submittingOrder || addresses.length === 0}
                className="btn-primary"
                style={{ marginTop: '2rem', padding: '0.9rem' }}
              >
                Pay & Place Order
              </button>
            </div>

            <div className="dashboard-card" style={{ padding: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <ShieldCheck size={28} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Fully Compliant Portal</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>Secure SSL gateway endpoints. Verified customer ledger.</p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Razorpay Mock Popup Overlay */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem'
        }}>
          <div className="auth-card" style={{ maxWidth: '400px', border: '1px solid #10b981', boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', color: 'var(--primary)' }}>
                <CreditCard size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Razorpay Checkout</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Transaction Amount: <strong>₹{grandTotal.toFixed(2)}</strong></p>
            </div>

            {paymentProcessing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0' }}>
                <Loader2 className="spinner" style={{ width: '2rem', height: '2rem', color: 'var(--primary)' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Securing transaction node...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.5' }}>
                  This is a secure billing sandbox. Select the desired simulation status for this transaction.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    onClick={() => processMockPayment('success')}
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  >
                    Simulate Payment Success
                  </button>
                  <button
                    onClick={() => processMockPayment('fail')}
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: '#FFF' }}
                  >
                    Simulate Payment Fail
                  </button>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="btn-secondary"
                  >
                    Abort Transaction
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <style jsx global>{`
        @media (min-width: 992px) {
          .checkout-layout {
            grid-template-columns: 2fr 1.2fr;
          }
        }
      `}</style>

    </div>
  )
}
