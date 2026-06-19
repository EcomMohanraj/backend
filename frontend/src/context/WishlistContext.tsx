'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface WishlistItem {
  id: string
  name: string
  slug: string
  image: string
  price: number
  stock: number
}

interface WishlistContextType {
  wishlist: WishlistItem[]
  toggleWishlist: (item: WishlistItem) => void
  isInWishlist: (id: string) => boolean
  removeFromWishlist: (id: string) => void
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('milky_wishlist')
    if (saved) {
      try {
        setWishlist(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse wishlist', e)
      }
    }
    setLoaded(true)
  }, [])

  // Save wishlist to localStorage when changed
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('milky_wishlist', JSON.stringify(wishlist))
    }
  }, [wishlist, loaded])

  const toggleWishlist = (product: WishlistItem) => {
    setWishlist((prev) => {
      const exists = prev.some((item) => item.id === product.id)
      if (exists) {
        return prev.filter((item) => item.id !== product.id)
      }
      return [...prev, product]
    })
  }

  const isInWishlist = (id: string) => {
    return wishlist.some((item) => item.id === id)
  }

  const removeFromWishlist = (id: string) => {
    setWishlist((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isInWishlist, removeFromWishlist }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}
