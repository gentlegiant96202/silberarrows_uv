// Google Tag Manager & Facebook Pixel types
interface Window {
  dataLayer: any[];
  fbq?: (action: string, event: string, data?: any) => void;
  _fbq?: any;
}

