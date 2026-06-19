'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Loader2, Sparkles, UploadCloud, AlertCircle } from 'lucide-react'
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
  categoryId: string
}

export default function AdminProducts() {
  const { showToast } = useToast()
  
  // Data State
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Form toggles
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showBulkUpload, setShowBulkUpload] = useState(false)

  // Edit / Add Form States
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)

  // Bulk Upload state
  const [csvText, setCsvText] = useState('')
  const [bulkUploading, setBulkUploading] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/products`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to load products list', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Pre-fill edit form
  const handleStartEdit = (p: Product) => {
    setEditingProduct(p)
    setName(p.name)
    setSlug(p.slug)
    setDescription(p.description)
    setImage(p.image)
    setPrice(p.price.toString())
    setStock(p.stock.toString())
    setCategory(p.category)
    setShowAddForm(true)
  }

  const handleCloseForm = () => {
    setShowAddForm(false)
    setEditingProduct(null)
    setName('')
    setSlug('')
    setDescription('')
    setImage('')
    setPrice('')
    setStock('')
    setCategory('')
  }

  // Add or Edit save
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !slug || !description || !image || !price || !stock || !category) {
      showToast('Please fill all fields', 'warning')
      return
    }

    setSaving(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const payload = {
        name,
        slug,
        description,
        image,
        price: Number(price),
        stock: Number(stock),
        category
      }

      const method = editingProduct ? 'PUT' : 'POST'
      const url = editingProduct ? `${apiUrl}/products/${editingProduct.id}` : `${apiUrl}/products`

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload),
        credentials: 'include'
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to save product')
      }

      showToast(editingProduct ? 'Product details updated!' : 'Product created successfully!', 'success')
      handleCloseForm()
      loadProducts()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to save product details.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This action is permanent.')) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/products/${id}`, {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Deletion failed')

      showToast('Product deleted.', 'info')
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error(err)
      showToast('Failed to delete product.', 'error')
    }
  }

  // Parse and run CSV upload recursively
  const handleBulkUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvText.trim()) {
      showToast('Paste CSV data first', 'warning')
      return
    }

    setBulkUploading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const lines = csvText.split('\n')
      
      let uploadedCount = 0
      let failedCount = 0

      // Skip header row if it contains 'name'
      const startIdx = lines[0].toLowerCase().includes('name') ? 1 : 0

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Split by comma ignoring commas inside quotes
        const columns = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',')
        if (columns.length < 7) {
          failedCount++
          continue
        }

        const cleanCols = columns.map(col => col.replace(/^"|"$/g, '').trim())

        const payload = {
          name: cleanCols[0],
          slug: cleanCols[1],
          description: cleanCols[2],
          image: cleanCols[3],
          price: Number(cleanCols[4]),
          stock: Number(cleanCols[5]),
          category: cleanCols[6]
        }

        const res = await fetch(`${apiUrl}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify(payload),
          credentials: 'include'
        })

        if (res.ok) {
          uploadedCount++
        } else {
          failedCount++
        }
      }

      showToast(`Bulk upload complete! Created ${uploadedCount} items. (Failed: ${failedCount})`, 'success')
      setCsvText('')
      setShowBulkUpload(false)
      loadProducts()
    } catch (err) {
      console.error(err)
      showToast('Bulk uploading encounter error.', 'error')
    } finally {
      setBulkUploading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #FFF 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Product Inventory
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Add, edit, adjust stock, or bulk upload Calocybe indica products.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowBulkUpload(!showBulkUpload)}
            className="btn-secondary"
            style={{ width: 'auto', padding: '0.65rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <UploadCloud size={16} /> Bulk Upload
          </button>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
            style={{ width: 'auto', padding: '0.65rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Create Product
          </button>
        </div>
      </div>

      {/* CSV Bulk uploader textarea */}
      {showBulkUpload && (
        <form onSubmit={handleBulkUploadSubmit} className="dashboard-card" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Bulk Upload Products (CSV Parser)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Provide comma-separated fields in the text box below. Ensure the following header columns are mapped: <br />
            <code>name,slug,description,image,price,stock,category</code>
          </p>
          <textarea
            className="input-field"
            rows={6}
            placeholder='Fresh Spawn Bed,fresh-spawn-bed,"High yield sorghum spawn grain",https://images.unsplash.com/...,120,50,Spawn'
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            disabled={bulkUploading}
            style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
            required
          />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" onClick={() => setShowBulkUpload(false)} className="btn-secondary" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={bulkUploading} style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
              {bulkUploading ? <Loader2 className="spinner" /> : 'Run CSV Parser'}
            </button>
          </div>
        </form>
      )}

      {/* Form Overlay Modal (Add or Edit Product) */}
      {showAddForm && (
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
          <div className="auth-card" style={{ maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 800 }}>
              {editingProduct ? 'Modify Product Details' : 'Create New Product'}
            </h3>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="input-group">
                <label className="input-label" htmlFor="p-name">Product Name</label>
                <input
                  id="p-name"
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (!editingProduct) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
                    }
                  }}
                  disabled={saving}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="p-slug">URL Slug</label>
                <input
                  id="p-slug"
                  type="text"
                  className="input-field"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="p-desc">Description</label>
                <textarea
                  id="p-desc"
                  className="input-field"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="p-img">Image URL</label>
                <input
                  id="p-img"
                  type="text"
                  className="input-field"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="p-price">Price (₹)</label>
                  <input
                    id="p-price"
                    type="number"
                    className="input-field"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="p-stock">Stock Units</label>
                  <input
                    id="p-stock"
                    type="number"
                    className="input-field"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="p-cat">Category</label>
                <select
                  id="p-cat"
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={saving}
                  required
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">-- Choose Category --</option>
                  <option value="Fresh">Fresh</option>
                  <option value="Dried">Dried</option>
                  <option value="Spawn">Spawn</option>
                  <option value="Powder">Powder</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={handleCloseForm} className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1.5rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving} style={{ width: 'auto', padding: '0.6rem 1.5rem' }}>
                  {saving ? <Loader2 className="spinner" /> : 'Save Product'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Main product log list table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="spinner" />
        </div>
      ) : products.length === 0 ? (
        <div className="dashboard-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertCircle size={36} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No products in catalog list.</p>
        </div>
      ) : (
        <div className="dashboard-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                    <div>
                      <strong style={{ display: 'block' }} className="info-value">{p.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.slug}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-customer" style={{ textTransform: 'capitalize' }}>{p.category}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{p.price.toFixed(2)}</td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      color: p.stock <= 5 ? '#EF4444' : 'var(--text-primary)'
                    }}>
                      {p.stock} units
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleStartEdit(p)}
                        className="btn-secondary"
                        style={{ padding: '0.4rem', borderRadius: '8px' }}
                        title="Edit product"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="btn-secondary"
                        style={{ padding: '0.4rem', borderRadius: '8px', color: '#EF4444', borderColor: 'rgba(239,68,68,0.2)' }}
                        title="Delete product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
