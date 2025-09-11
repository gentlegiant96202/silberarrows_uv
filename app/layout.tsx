import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/shared/Providers'
import { SpeedInsights } from '@vercel/speed-insights/next'
import LayoutWrapper from '@/components/shared/LayoutWrapper'

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
    <html lang="en" className="dark">
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
        {/* Snapshot overlay boot */}
        <div id="snapshot-overlay" style={{position:'fixed', inset:0 as any, backgroundSize:'cover', backgroundPosition:'center', zIndex:9998, display:'none'}} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try{
    var key='sa_last_snapshot';
    var overlay=document.getElementById('snapshot-overlay');
    // Show snapshot immediately on pageshow if available
    var showSnap=function(){
      try{
        var snap=localStorage.getItem(key);
        if(!snap||!overlay) return;
        overlay.style.backgroundImage='url('+snap+')';
        overlay.style.display='block';
        overlay.style.opacity='1';
      }catch(e){}
    };
    // Hide snapshot when app signals ready
    window.addEventListener('sa:appReady',function(){
      try{
        if(!overlay) return;
        overlay.style.transition='opacity 200ms ease-out';
        overlay.style.opacity='0';
        setTimeout(function(){ overlay.style.display='none'; overlay.style.backgroundImage=''; },220);
      }catch(e){}
    });
    // On tab show, reveal snapshot fast
    window.addEventListener('pageshow',function(ev){ if(ev.persisted){ showSnap(); } else { showSnap(); } });
    document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible'){ showSnap(); }});
    // On tab hide, capture snapshot using CSS paint (fast fallback):
    // We can't use html2canvas without extra weight; use a small canvas and draw current viewport via drawImage on video capture (skipped). Fallback: skip capture here.
  }catch(e){}
})();
`}}
        />
        <div className="min-h-screen bg-black">
          <Providers>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </Providers>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
// Signal that the app is ready to paint real content
window.dispatchEvent(new Event('sa:appReady'));
`}}
        />
        <SpeedInsights />
      </body>
    </html>
  )
} 