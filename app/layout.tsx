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
  viewportFit: 'cover'
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
              // Windows responsive scaling detection
              (function() {
                const isWindows = navigator.platform.indexOf('Win') > -1;
                const devicePixelRatio = window.devicePixelRatio || 1;
                const isHighDPI = devicePixelRatio >= 1.5;
                
                if (isWindows && isHighDPI) {
                  document.documentElement.style.setProperty('--windows-scale-detected', '1');
                  document.documentElement.classList.add('windows-high-dpi');
                  
                  // Adjust for extreme scaling (200%+)
                  if (devicePixelRatio >= 2) {
                    document.documentElement.classList.add('windows-very-high-dpi');
                  }
                }
                
                // Prevent zoom on Windows
                if (isWindows) {
                  document.addEventListener('wheel', function(e) {
                    if (e.ctrlKey) {
                      e.preventDefault();
                    }
                  }, { passive: false });
                  
                  document.addEventListener('keydown', function(e) {
                    if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '0')) {
                      e.preventDefault();
                    }
                  });
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