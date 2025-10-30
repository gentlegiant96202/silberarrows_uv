import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/shared/Providers'
import { SpeedInsights } from '@vercel/speed-insights/next'
import LayoutWrapper from '@/components/shared/LayoutWrapper'
import ModuleTransitionOverlay from '@/components/shared/ModuleTransitionOverlay'
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'SilberArrows',
  description: 'Comprehensive CRM system for used car sales management',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/mobile-manifest.json" />
        
        {/* PWA Icons */}
        <link rel="icon" href="/MAIN LOGO.png" />
        <link rel="apple-touch-icon" href="/MAIN LOGO.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/MAIN LOGO.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/MAIN LOGO.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/MAIN LOGO.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/MAIN LOGO.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/MAIN LOGO.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/MAIN LOGO.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/MAIN LOGO.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/MAIN LOGO.png" />
        <link rel="apple-touch-icon" sizes="57x57" href="/MAIN LOGO.png" />
        
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SilberCRM" />
        <meta name="application-name" content="SilberCRM" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="theme-color" content="#000000" />
        
        {/* Prevent iOS Safari from clearing localStorage */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="antialiased">
        <div className="min-h-screen bg-black">
          <Providers>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </Providers>
        </div>
        <ModuleTransitionOverlay />
        <SpeedInsights />
      </body>
    </html>
  )
} 