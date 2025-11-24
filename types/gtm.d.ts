// Google Tag Manager & Facebook Pixel types
interface Window {
  dataLayer: any[];
  fbq?: {
    (action: 'init', pixelId: string): void;
    (action: 'track', eventName: string, data?: Record<string, any>): void;
    callMethod?: (...args: any[]) => void;
    queue?: any[];
    loaded?: boolean;
    version?: string;
  };
  _fbq?: any;
}

