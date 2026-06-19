'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface CartItem {
  id: string
  product_id: string
  name: string
  slug: string
  image: string
  price: number
  quantity: number
  stock: number
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  cartCount: number
  cartSubtotal: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('milky_cart')
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error('Failed to parse cart data', e)
      }
    }
    setLoaded(true)
  }, [])

  // Save cart to localStorage when changed
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('milky_cart', JSON.stringify(cart))
    }
  }, [cart, loaded])

  const addToCart = (product: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product_id === product.product_id)
      if (existingItem) {
        const newQty = Math.min(existingItem.quantity + quantity, product.stock)
        return prevCart.map((item) =>
          item.product_id === product.product_id
            ? { ...item, quantity: newQty }
            : item
        )
      }
      return [...prevCart, { ...product, quantity: Math.min(quantity, product.stock) }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product_id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: Math.min(quantity, item.stock) }
          : item
      )
    )
  }

  const clearCart = () => {
    setCart([])
  }

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0)
  const cartSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartSubtotal }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
