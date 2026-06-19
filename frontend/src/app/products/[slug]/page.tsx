'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, Heart, Star, Leaf, Sparkles, Loader2, MessageSquare, AlertCircle } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useToast } from '@/context/ToastContext'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  image: string
  price: number
  stock: number
  category: string
  nutrition: Record<string, string>
}

interface Review {
  id: string
  rating: number
  comment: string
  createdAt: string
  customer?: {
    name: string
  }
}

export default function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const slug = resolvedParams.slug

  const { addToCart } = useCart()
  const { toggleWishlist, isInWishlist } = useWishlist()
  const { showToast } = useToast()

  // States
  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  
  // Review form states
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [userLoggedIn, setUserLoggedIn] = useState(false)

  useEffect(() => {
    // Check if user is logged in (needed to post reviews)
    const hasLocalActive = document.cookie.includes('milky_session_active=true') || document.cookie.includes('milky_access_token')
    setUserLoggedIn(hasLocalActive)

    async function loadProductAndReviews() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        
        // 1. Fetch product
        const prodRes = await fetch(`${apiUrl}/products/${slug}`)
        if (!prodRes.ok) throw new Error('Product not found')
        const prodData = await prodRes.json()
        setProduct(prodData)

        // 2. Fetch reviews
        const revRes = await fetch(`${apiUrl}/reviews?productId=${prodData.id}`)
        if (revRes.ok) {
          const revData = await revRes.json()
          setReviews(revData)
        }
      } catch (err) {
        console.error('Error fetching product details:', err)
        showToast('Failed to load product details.', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadProductAndReviews()
  }, [slug])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="spinner" style={{ width: '2.5rem', height: '2.5rem', color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading product details...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1.5rem', padding: '1rem', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#EF4444' }} />
        <h2 style={{ fontSize: '1.5rem' }}>Product Not Found</h2>
        <p style={{ color: 'var(--text-muted)' }}>The product you are looking for does not exist or has been removed.</p>
        <Link href="/" className="btn-primary" style={{ width: 'auto', padding: '0.65rem 1.5rem', borderRadius: '12px' }}>
          Back to Storefront
        </Link>
      </div>
    )
  }

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      price: product.price,
      stock: product.stock
    }, qty)
    showToast(`Added ${qty} x ${product.name} to cart!`, 'success')
  }

  const handleWishlistToggle = () => {
    toggleWishlist({
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      price: product.price,
      stock: product.stock
    })
    const isNowIn = !isInWishlist(product.id)
    showToast(isNowIn ? `Added to wishlist!` : `Removed from wishlist!`, isNowIn ? 'success' : 'info')
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) {
      setReviewError('Review comment cannot be empty.')
      return
    }

    setSubmittingReview(true)
    setReviewError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const res = await fetch(`${apiUrl}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: product.id,
          rating,
          comment
        }),
        credentials: 'include'
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to submit review')
      }

      showToast('Thank you! Your review has been submitted.', 'success')
      setComment('')
      
      // Reload reviews
      const revRes = await fetch(`${apiUrl}/reviews?productId=${product.id}`)
      if (revRes.ok) {
        const revData = await revRes.json()
        setReviews(revData)
      }
    } catch (err: any) {
      console.error('Submit review error:', err)
      setReviewError(err.message || 'An error occurred while submitting review.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header bar */}
      <header className="nav">
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} />
          <span>Back to Store</span>
        </Link>
        <span className="logo">Milky Mushrooms</span>
      </header>

      {/* Main product detail container */}
      <main style={{ flex: 1, padding: '3rem 2rem', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
        
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{product.category}</span>
          <span>/</span>
          <span style={{ color: 'var(--primary)' }}>{product.name}</span>
        </div>

        {/* Product view split grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3.5rem', marginBottom: '4rem' }} className="product-grid-layout">
          
          {/* Left: Product Image */}
          <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'fit-content' }}>
            <img
              src={product.image}
              alt={product.name}
              style={{ width: '100%', maxHeight: '450px', objectFit: 'cover' }}
            />
          </div>

          {/* Right: Product Details info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div>
              <span className="badge badge-customer" style={{ marginBottom: '0.75rem', textTransform: 'capitalize' }}>{product.category}</span>
              <h1 style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: '1.2', background: 'linear-gradient(135deg, #FFF 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {product.name}
              </h1>
            </div>

            {/* Ratings average */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', color: '#FBBF24' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.round(Number(avgRating)) ? '#FBBF24' : 'none'} />
                ))}
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{avgRating}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>({reviews.length} customer reviews)</span>
            </div>

            {/* Price section */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>₹{product.price}</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>per pack / unit</span>
            </div>

            {/* Description */}
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
              {product.description}
            </p>

            {/* Nutrition details tabs */}
            {product.nutrition && Object.keys(product.nutrition).length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Leaf size={14} style={{ color: 'var(--primary)' }} />
                  Nutritional / Growth Specification
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  {Object.entries(product.nutrition).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{key}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions: Quantity + Cart / Wishlist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Quantity:</span>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
                  <button
                    onClick={() => setQty(prev => Math.max(prev - 1, 1))}
                    style={{ background: 'none', border: 'none', color: 'white', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    -
                  </button>
                  <span style={{ width: '40px', textAlign: 'center', fontWeight: 600 }}>{qty}</span>
                  <button
                    onClick={() => setQty(prev => Math.min(prev + 1, product.stock))}
                    style={{ background: 'none', border: 'none', color: 'white', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    +
                  </button>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{product.stock} units available</span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.9rem', borderRadius: '12px' }}
                >
                  <ShoppingCart size={18} style={{ marginRight: '0.5rem' }} />
                  Add to Shopping Cart
                </button>
                
                <button
                  onClick={handleWishlistToggle}
                  className="btn-secondary"
                  style={{ width: '50px', padding: 0, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isInWishlist(product.id) ? '#EF4444' : 'var(--text-primary)' }}
                >
                  <Heart size={20} fill={isInWishlist(product.id) ? '#EF4444' : 'none'} />
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* Bottom Reviews section */}
        <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={22} style={{ color: 'var(--primary)' }} />
            Customer Reviews ({reviews.length})
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }} className="reviews-split-layout">
            
            {/* Left reviews list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {reviews.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
                  <p style={{ color: 'var(--text-muted)' }}>There are no reviews for this product yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{r.customer?.name || 'Anonymous Farmer'}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', color: '#FBBF24', marginBottom: '0.75rem' }}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} size={14} fill={idx < r.rating ? '#FBBF24' : 'none'} />
                      ))}
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {r.comment}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Right review submit form */}
            <div className="dashboard-card" style={{ height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Write a Customer Review</h3>
              
              {!userLoggedIn ? (
                <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '12px', padding: '1rem', color: '#FDE047', fontSize: '0.85rem' }}>
                  Please <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link> to submit a rating review for this organic product.
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit}>
                  
                  {reviewError && (
                    <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                      <span>{reviewError}</span>
                    </div>
                  )}

                  {/* Rating Selector */}
                  <div className="input-group">
                    <span className="input-label">Product Rating</span>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          style={{ background: 'none', border: 'none', color: '#FBBF24', cursor: 'pointer', padding: '4px' }}
                        >
                          <Star size={24} fill={star <= rating ? '#FBBF24' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="input-group">
                    <label className="input-label" htmlFor="comment-field">Review Comments</label>
                    <textarea
                      id="comment-field"
                      className="input-field"
                      placeholder="Share your experience cultivating or cooking this mushroom spawn..."
                      rows={4}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      style={{ resize: 'vertical', fontFamily: 'inherit' }}
                      disabled={submittingReview}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submittingReview}
                    style={{ marginTop: '0.5rem' }}
                  >
                    {submittingReview ? <Loader2 className="spinner" /> : 'Submit Review'}
                  </button>

                </form>
              )}

            </div>

          </div>

        </section>

      </main>

      {/* Styles responsive injection */}
      <style jsx global>{`
        @media (min-width: 768px) {
          .product-grid-layout {
            grid-template-columns: 1fr 1.2fr;
          }
          .reviews-split-layout {
            grid-template-columns: 1.5fr 1fr;
          }
        }
      `}</style>

    </div>
  )
}
