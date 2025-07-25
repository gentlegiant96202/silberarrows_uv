import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'Used Car Sales CRM',
  description: 'Comprehensive CRM system for used car sales management',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <div className="min-h-screen bg-black">
          <Providers>
          {children}
          </Providers>
        </div>
        <SpeedInsights />
      </body>
    </html>
  )
} 