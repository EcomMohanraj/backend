import './global.css'
import type { Metadata } from 'next'

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
        {children}
      </body>
    </html>
  )
}
