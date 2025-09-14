// Template utility functions

export const getFontFaceCSS = (): string => {
  return `
    @font-face {
      font-family: 'UAESymbol';
      src: url('data:font/woff2;base64,d09GMgABAAAAAAQYAA0AAAAACBAAAAPDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP0ZGVE0cBmAAgkIIBBEICoUUhCkBNgIkAxALCgAEIAWEEAcqG7YGUZQPTgfg47Apmy9iLmImDnGZy6goEb/MR/MYQbVG9uze3RO4ALBFhQoAVFiTQhIyGnVculgBokvV/WSX/+Yu3Al08BwCbQCpXXyYbdB9UFW6f3A5/X/6J1j6rE/3ezTw3xoLs7ZIgImtaUX58mgKJJRpgon2VjNR6jPw3PkpCCJqLwS8uH9zAuBt6/4L8i7/FfljnFKSjqSrOCbPjpcmhICkbMLIBNdp7uaEepj22efcvw5Wmt7ZAQQA+kPIyOgNgcmEAr0Z6Q8UCoHPdb1urXtAQFQEvU+ii99CwG/KpmMPSCNA1LUECtCICg/wHtCKsZEAFz29WmIpx8aWRoXYmKqaKVpzXGPx4xRWxDrOiI46Pi5gYZrFV1nRURULIOacOMpfNA0OOEB0VAaxbJpa9cACVLfusOrAHHCYEXJSxuFMOMlzYrjif0QefiT+CEVJTut5CY9Q3rhrOk6ORKxIhLENPyYHzM7gNTvhyNbOyA+5cTUcxsBAwbYEz4hnOLRLvUv+pPBYyZ4Ao4LQv8rP5M8wVD4AXnPeCDrOY975thcv4RW7Nbu1u8x3fSUbxRt09Qc4BtdqBO+N0k1vktptmTo3z4ok3bC7ANk6w/v5t4cixFb5r4Qx7hewSoO10Pvjr2OEkcAWoYLFurl/zmyEQtN/3YQZ64aAodj/C3GxW7lQ9zTZa4S7P03ykfeRY/qVJdqcKi7WqGtO35P6ItlvOnmk15N2cyckpvH93UXSirc66fagHa6uBbXJS23+ca7vZswQxF4Tj19ElEbnsnt11wOWtsq+/M3LL16ExpEvXqQ0u/l86v/ogX370tJ8DDgwBNdO3jo5y7Zk7uZsJ9gAmutT+WV6dzmMm3ypofBt4uWqfDr5Sk6+TXQxu7ASArJV/NeJSG8NITj3+0brGuvJ/xpx/nj6y9UXoFECgQ08keUZA/JLgemFNz8AIAsju1mgcPcFICEEpqMBaHdBAHrwh0Bosh4CSYPdEMiGuCdAoSmaBSh1RD5SbYmlhKJowkSgk6FbJpm020Jmc8yThW7bZKlvOHxOpTvixenSbUSvFk2a9SNc1HFF+PLmK4AHokavBs06wG+WBnWuXyVzUE1vQ3MHwCKd+rXo165BvQCwaNuFe3x9AMB8DZoMaK9owyvligAzdOUKcrFXk4bjM2neiNAOlWVfo69gnvx4dmvAk7EwzultaiC+tDcJJR3wesE32NPPs+WeekUXF3v1aeltHOHNmw+aN7fhdjfn7e1De1NPFcMEuNZXTQRCvkBEGrsAAA==') format('woff2');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
    
    .dirham-symbol {
      font-family: 'UAESymbol';
      font-size: inherit;
      color: inherit;
    }
    
    @font-face {
      font-family: 'Resonate';
      src: url('/Fonts/Resonate-Black.woff2?v=2') format('woff2');
      font-weight: 900;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Resonate';
      src: url('/Fonts/Resonate-Bold.woff2?v=2') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Resonate';
      src: url('/Fonts/Resonate-Medium.woff2?v=2') format('woff2');
      font-weight: 500;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Resonate';
      src: url('/Fonts/Resonate-Light.woff2?v=2') format('woff2');
      font-weight: 300;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Resonate';
      src: url('/Fonts/Resonate-Regular.woff2?v=2') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }`;
};

export const getAbsoluteLogoUrl = (): string => {
  // Always use a working absolute URL that both frontend and Railway can access
  // This ensures the logo loads in both preview and generated content
  return 'https://database.silberarrows.com/storage/v1/object/public/media-files/8bc3b696-bcb6-469e-9993-030fdc903ee5/9740bc7d-d555-4c9b-b0e0-d756e0b4c50d.png';
};

export const getCacheBustedImageUrl = (imageUrl: string): string => {
  const timestamp = Date.now();
  const isHttpUrl = (u?: string) => typeof u === 'string' && /^https?:\/\//.test(u);
  return isHttpUrl(imageUrl) 
    ? `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${timestamp}` 
    : imageUrl;
};

export const cleanMercedesTitle = (title: string): string => {
  return title
    .replace(/MERCEDES[-\s]*BENZ\s*/gi, '')
    .replace(/^AMG\s*/gi, 'AMG ');
};

export const formatMonthlyPayment = (monthlyPayment?: number): string => {
  if (monthlyPayment && monthlyPayment > 0) {
    return `<svg height="0.7em" viewBox="0 0 344.84 299.91" style="display: inline-block; vertical-align: baseline; margin-right: 6px; margin-bottom: -0.02em;" xmlns="http://www.w3.org/2000/svg"><path fill="#555555" d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg><span style="font-family: 'Inter', sans-serif; font-weight: 900; color: #555555;">${monthlyPayment.toLocaleString()}</span><span style="font-family: 'Inter', sans-serif; font-weight: 300; color: #555555;"> PER MONTH</span>`;
  } else {
    return '<span style="font-family: \'Resonate\', \'Inter\', sans-serif; font-weight: 300; color: #555555;">CASH PAYMENT</span>';
  }
};

export const getImageUrl = (
  uploadedFiles: any[], 
  existingMedia: any[], 
  fallbackUrl: string = '/MAIN LOGO.png'
): string => {
  // Priority: 1) New uploaded file (full quality), 2) Existing high-quality image URL, 3) Default logo
  // NOTE: Prioritize uploaded files over existing media to avoid 404 issues
  
  // First check for new uploaded files
  if (uploadedFiles[0]) {
    return URL.createObjectURL(uploadedFiles[0].file);
  }
  
  // Then check existing media for valid image files
  const existingImageFiles = existingMedia.filter(media => {
    if (typeof media === 'string') {
      return media.match(/\.(jpe?g|png|webp|gif)$/i);
    }
    return media.type?.startsWith('image/') || 
           media.name?.match(/\.(jpe?g|png|webp|gif)$/i) || 
           media.url?.match(/\.(jpe?g|png|webp|gif)$/i);
  });
  
  // Use the first valid existing image URL
  const existingImageUrl = existingImageFiles[0]?.url || 
                          (typeof existingImageFiles[0] === 'string' ? existingImageFiles[0] : null);
  
  if (existingImageUrl) {
    console.log('🔍 Using existing image URL:', existingImageUrl);
    
    // If using database.silberarrows.com domain, add fallback to storage proxy
    if (existingImageUrl.includes('database.silberarrows.com')) {
      // Return proxy URL that will try both domains
      return `/api/storage-proxy?url=${encodeURIComponent(existingImageUrl)}`;
    }
    
    return existingImageUrl;
  }
  
  console.log('⚠️ No valid images found, using fallback:', fallbackUrl);
  return fallbackUrl;
};
