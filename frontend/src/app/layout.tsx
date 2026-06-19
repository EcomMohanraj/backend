import './global.css'
import type { Metadata } from 'next'
import { CartProvider } from '@/context/CartContext'
import { WishlistProvider } from '@/context/WishlistContext'
import { ToastProvider } from '@/context/ToastContext'

export const metadata: Metadata = {
  title: 'Milky Mushrooms | Premium Organic Mushrooms',
  description: 'Secure customer order dashboard and organic mushroom farm store settings.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <CartProvider>
            <WishlistProvider>
              {children}
            </WishlistProvider>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
