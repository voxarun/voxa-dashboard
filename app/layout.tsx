import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Voxa Dashboard',
  description: 'AI Command Centre for Takeaway Restaurants',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
