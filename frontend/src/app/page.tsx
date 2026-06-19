'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart, Heart, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Leaf, Eye, Star, Loader2, Sparkles, Phone, Mail } from 'lucide-react'
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
  created_at: string
}

export default function StoreHome() {
  const { addToCart, cartCount } = useCart()
  const { toggleWishlist, isInWishlist } = useWishlist()
  const { showToast } = useToast()

  // State definitions
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>(['All', 'Fresh', 'Dried', 'Spawn', 'Powder'])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters and Sorting
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [priceRange, setPriceRange] = useState(1000)
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(8)

  // Session State
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Search Suggestions State
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    // Check if session token exists
    const hasLocalActive = document.cookie.includes('milky_session_active=true') || document.cookie.includes('milky_access_token')
    setIsLoggedIn(hasLocalActive)

    async function fetchProducts() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const res = await fetch(`${apiUrl}/products`)
        if (!res.ok) {
          throw new Error('Failed to load products')
        }
        const data = await res.json()
        setProducts(data)
      } catch (err: any) {
        console.error('Error loading products:', err)
        setError('Unable to reach backend. Serving simulated products.')
        // Fallback simulated products if server is down
        setProducts([
          {
            id: 'p1',
            name: 'Premium Fresh Milky Mushrooms',
            slug: 'premium-fresh-milky-mushrooms',
            description: 'Freshly harvested organic Milky Mushrooms (Calocybe indica) directly from our farm beds.',
            image: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&q=80&w=600',
            price: 240,
            stock: 100,
            category: 'Fresh',
            nutrition: { protein: '3.1g', calories: '22 kcal' },
            created_at: new Date().toISOString()
          },
          {
            id: 'p2',
            name: 'Dehydrated Milky Mushroom Slices',
            slug: 'dehydrated-milky-mushroom-slices',
            description: 'Premium sundried Milky Mushroom slices with intense earthy aroma.',
            image: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&q=80&w=600',
            price: 350,
            stock: 5,
            category: 'Dried',
            nutrition: { protein: '26.5g', calories: '280 kcal' },
            created_at: new Date().toISOString()
          },
          {
            id: 'p3',
            name: 'Milky Mushroom Cultivation Spawn',
            slug: 'milky-mushroom-spawn',
            description: 'High-quality, laboratory-grown, fully colonized grain spawn of Calocybe indica.',
            image: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&q=80&w=600',
            price: 120,
            stock: 200,
            category: 'Spawn',
            nutrition: { usage: 'Spawn colonization' },
            created_at: new Date().toISOString()
          },
          {
            id: 'p4',
            name: 'Organic Milky Mushroom Powder',
            slug: 'organic-milky-mushroom-powder',
            description: '100% pure organic Milky Mushroom powder. Ground from dried, selected mushrooms.',
            image: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&q=80&w=600',
            price: 450,
            stock: 30,
            category: 'Powder',
            nutrition: { protein: '28.0g', calories: '310 kcal' },
            created_at: new Date().toISOString()
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Dynamic Search Suggestions
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSuggestions([])
      return
    }
    const matching = products
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(p => p.name)
      .slice(0, 5)
    setSuggestions(matching)
  }, [searchTerm, products])

  // Filter and Sort logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase()
    const matchesPrice = p.price <= priceRange
    return matchesSearch && matchesCategory && matchesPrice
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price
    if (sortBy === 'price-high') return b.price - a.price
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Pagination calculations
  const totalItems = sortedProducts.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage)

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast('Product is currently out of stock!', 'error')
      return
    }
    addToCart({
      id: product.id,
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      price: product.price,
      stock: product.stock
    }, 1)
    showToast(`Added ${product.name} to cart!`, 'success')
  }

  const handleWishlistToggle = (product: Product) => {
    toggleWishlist({
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      price: product.price,
      stock: product.stock
    })
    const isNowIn = !isInWishlist(product.id)
    showToast(isNowIn ? `Added ${product.name} to wishlist!` : `Removed ${product.name} from wishlist!`, isNowIn ? 'success' : 'info')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Banner Navigation */}
      <header className="nav" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Leaf size={24} style={{ color: 'var(--primary)' }} />
          <span className="logo">Milky Mushrooms</span>
        </Link>

        {/* Global Search Input Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', display: 'none' }} className="search-desktop">
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={16} />
          </span>
          <input
            type="text"
            className="input-field"
            placeholder="Search Calocybe indica products..."
            style={{ paddingLeft: '2.5rem', borderRadius: '9999px', fontSize: '0.85rem' }}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              marginTop: '6px',
              zIndex: 10,
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden'
            }}>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setSearchTerm(s)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Header Right Actions */}
        <div className="nav-user">
          <Link href="/cart" style={{ textDecoration: 'none', position: 'relative', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-10px',
                background: 'var(--primary)',
                color: '#020617',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.7rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {cartCount}
              </span>
            )}
          </Link>
          
          {isLoggedIn ? (
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <span className="btn-secondary" style={{ padding: '0.45rem 1rem', borderRadius: '9999px', fontSize: '0.85rem' }}>Portal Dashboard</span>
            </Link>
          ) : (
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <span className="btn-primary" style={{ padding: '0.45rem 1.2rem', borderRadius: '9999px', fontSize: '0.85rem' }}>Sign In</span>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Banner Grid Section */}
      <section style={{
        padding: '6rem 2rem 4rem 2rem',
        textAlign: 'center',
        background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.08) 0%, transparent 60%)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)', padding: '0.5rem 1.25rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem' }}>
          <Sparkles size={14} />
          Certified Organic Farm Cultivation
        </div>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1rem', lineHeight: '1.1', background: 'linear-gradient(135deg, #FFF 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Pure Organic Milky Mushrooms
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '680px', margin: '0 auto 2rem auto', lineHeight: '1.6' }}>
          Harvested at peak maturity, our fresh Calocybe indica mushrooms offer delicious firm textures, deep nutrition levels, and zero artificial substrates. Order direct from our spawns.
        </p>
      </section>

      {/* Main E-Commerce Content Section */}
      <main style={{ flex: 1, padding: '3rem 2rem', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
        
        {/* Dynamic Search Bar Mobile */}
        <div style={{ position: 'relative', width: '100%', marginBottom: '2rem' }} className="search-mobile">
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={16} />
          </span>
          <input
            type="text"
            className="input-field"
            placeholder="Search organic mushrooms..."
            style={{ paddingLeft: '2.5rem', borderRadius: '12px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && (
          <div className="alert alert-success" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.85rem' }}>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* Top Control Bar filters */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '1.5rem',
            marginBottom: '1rem'
          }}>
            {/* Category selection filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: selectedCategory === cat ? 'var(--primary)' : 'var(--border-color)',
                    background: selectedCategory === cat ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    color: selectedCategory === cat ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sorting & limit selectors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <ArrowUpDown size={16} />
                <span>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.35rem 1.5rem 0.35rem 0.5rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="newest">Newest Arrival</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              {/* Price range filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Filter size={16} />
                <span>Max Price: ₹{priceRange}</span>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={priceRange}
                  onChange={(e) => { setPriceRange(Number(e.target.value)); setCurrentPage(1); }}
                  style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
              </div>
            </div>
          </div>

          {/* Product Grid section */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '2rem' }}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="dashboard-card" style={{ height: '350px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
                  <div style={{ width: '100%', height: '180px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)', animation: 'spin 1.5s infinite linear' }} />
                  </div>
                  <div style={{ height: '20px', width: '70%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
                  <div style={{ height: '14px', width: '90%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <div style={{ height: '24px', width: '30%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
                    <div style={{ height: '36px', width: '40%', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍄</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Products Found</h3>
              <p style={{ color: 'var(--text-muted)' }}>Try adjusting your pricing sliders or search parameters.</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '2rem' }}>
                {paginatedProducts.map((p) => {
                  const hasStock = p.stock > 0
                  const isLowStock = p.stock > 0 && p.stock <= 5
                  const inWish = isInWishlist(p.id)

                  return (
                    <div key={p.id} className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', padding: '1.25rem' }}>
                      
                      {/* Card Image Wrapper */}
                      <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '16px', overflow: 'hidden', marginBottom: '1rem' }}>
                        <img
                          src={p.image}
                          alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                          <span className="badge badge-customer" style={{ textTransform: 'capitalize' }}>{p.category}</span>
                        </div>
                        
                        {/* Wishlist toggle button */}
                        <button
                          onClick={() => handleWishlistToggle(p)}
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(15, 23, 42, 0.7)',
                            backdropFilter: 'blur(8px)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '34px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: inWish ? '#EF4444' : 'var(--text-secondary)',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <Heart size={16} fill={inWish ? '#EF4444' : 'none'} />
                        </button>
                      </div>

                      {/* Card Body */}
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Link href={`/products/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: '1.3' }} className="product-title-hover">
                              {p.name}
                            </h3>
                          </Link>
                        </div>

                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {p.description}
                        </p>

                        {/* Nutrition pill summaries */}
                        {p.nutrition && Object.keys(p.nutrition).length > 0 && (
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                            {Object.entries(p.nutrition).slice(0, 2).map(([key, val]) => (
                              <span key={key} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                {key}: {val}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Stock alert indicators */}
                        <div style={{ marginBottom: '1rem' }}>
                          {!hasStock ? (
                            <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 600 }}>Out of Stock</span>
                          ) : isLowStock ? (
                            <span style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 600 }}>Only {p.stock} left in stock!</span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>In Stock</span>
                          )}
                        </div>

                        {/* Card footer prices and actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Price</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>₹{p.price}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Link href={`/products/${p.slug}`} style={{ textDecoration: 'none' }}>
                              <button className="btn-secondary" style={{ padding: '0.5rem', borderRadius: '12px' }}>
                                <Eye size={16} />
                              </button>
                            </Link>
                            <button
                              onClick={() => handleAddToCart(p)}
                              disabled={!hasStock}
                              className="btn-primary"
                              style={{ padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.85rem' }}
                            >
                              Add To Cart
                            </button>
                          </div>
                        </div>

                      </div>

                    </div>
                  )
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '3rem' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary"
                    style={{ width: 'auto', padding: '0.5rem 1rem', borderRadius: '12px' }}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary"
                    style={{ width: 'auto', padding: '0.5rem 1rem', borderRadius: '12px' }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Footer contacts */}
      <footer style={{
        marginTop: 'auto',
        background: 'rgba(7, 9, 19, 0.9)',
        borderTop: '1px solid var(--border-color)',
        padding: '3rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Leaf size={20} style={{ color: 'var(--primary)' }} />
            <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.1rem' }}>Milky Mushrooms</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '500px' }}>
            Organic Calocybe indica mushrooms grown in controlled sterile labs, packing protein and earthy rich flavors. Delivery details supported across standard timelines.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={14} /> +91 99887 76655</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={14} /> contact@milkymushrooms.com</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.04)', width: '100%', paddingTop: '1.5rem' }}>
            © {new Date().getFullYear()} Milky Mushrooms. Handcrafted for standard organic farming.
          </div>
        </div>
      </footer>
    </div>
  )
}
