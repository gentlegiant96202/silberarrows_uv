import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/shared/Providers'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'Used Car Sales CRM',
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
    <html lang="en" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Windows detection and scaling adjustment
              (function() {
                const isWindows = navigator.platform.indexOf('Win') > -1;
                const isHighDPI = window.devicePixelRatio > 1.5;
                
                if (isWindows) {
                  document.documentElement.classList.add('windows-os');
                  
                  // Apply scaling based on DPI
                  if (isHighDPI) {
                    document.documentElement.classList.add('windows-high-dpi');
                  }
                  
                  // Set CSS custom properties for dynamic scaling
                  document.documentElement.style.setProperty('--windows-scale', isHighDPI ? '0.9' : '0.95');
                }
              })();
            `,
          }}
        />
      </head>
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