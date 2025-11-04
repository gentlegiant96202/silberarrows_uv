import Script from 'next/script';
import LeasingTrackingInit from '@/components/leasing/LeasingTrackingInit';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function ShowroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Google Tag Manager Script - Scoped to Leasing */}
      <Script
        id="google-tag-manager-leasing"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-NMCTNTPB');
            
            // Push leasing section identifier to dataLayer
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
              'section': 'leasing_showroom',
              'event': 'leasing_page_load'
            });
          `,
        }}
      />

      {/* Google Tag Manager (noscript) */}
      <noscript>
        <iframe
          src="https://www.googletagmanager.com/ns.html?id=GTM-NMCTNTPB"
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>

      {/* Initialize Leasing-Specific Tracking (GCLID capture) */}
      <LeasingTrackingInit />

      {children}
    </>
  );
}

