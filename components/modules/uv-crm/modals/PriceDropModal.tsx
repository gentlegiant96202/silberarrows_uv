import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface PriceDropModalProps {
  car: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PriceDropModal: React.FC<PriceDropModalProps> = ({ car, isOpen, onClose, onSuccess }) => {
  const [originalPrice, setOriginalPrice] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize price when modal opens
  useEffect(() => {
    if (isOpen && car?.advertised_price_aed) {
      setOriginalPrice(car.advertised_price_aed.toString());
    }
  }, [isOpen, car]);

  // Calculate monthly payments
  const calculateMonthly = (price: number) => {
    if (!price || price <= 0) return { zero: 0, twenty: 0 };
    const r = 0.03 / 12; // 3% annual rate
    const n = 60; // 60 months
    const principal0 = price; // 0% down
    const principal20 = price * 0.8; // 20% down
    
    const calc = (p: number) => Math.round(p * r / (1 - Math.pow(1 + r, -n)));
    return {
      zero: calc(principal0),
      twenty: calc(principal20)
    };
  };

  const originalMonthly = calculateMonthly(parseFloat(originalPrice) || 0);
  const newMonthly = calculateMonthly(parseFloat(newPrice) || 0);

  // Load Acumin font
  const loadAcuminFont = useCallback(async () => {
    if (document.fonts.check('12px "Acumin Variable Concept"')) {
      return true;
    }

    try {
      const font = new FontFace('Acumin Variable Concept', 'url(/Acumin Variable Concept.ttf)');
      await font.load();
      document.fonts.add(font);
      return true;
    } catch (error) {
      console.log('Acumin font not available, using fallback');
      return false;
    }
  }, []);

  // Generate 4:5 image
  const generate45Image = useCallback(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    // Get social media images
    const { data: mediaData, error: mediaError } = await supabase
      .from('car_media')
      .select('kind, url, sort_order')
      .eq('car_id', car.id)
      .order('sort_order');

    if (mediaError) throw new Error('Failed to fetch media');

    const socialMediaImages = mediaData?.filter((m: any) => m.kind === 'social_media') || [];
    const imageUrl = socialMediaImages[0]?.url;

    if (!imageUrl) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a1a1a');
      gradient.addColorStop(1, '#0a0a0a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const imgAspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imgAspect > canvasAspect) {
        drawHeight = canvas.height;
        drawWidth = drawHeight * imgAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgAspect;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      }
      
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }

    const savings = parseFloat(originalPrice) - parseFloat(newPrice);
    
    const textGradient = ctx.createLinearGradient(0, canvas.height - 300, 0, canvas.height);
    textGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    textGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    ctx.fillStyle = textGradient;
    ctx.fillRect(0, canvas.height - 300, canvas.width, 300);

    await loadAcuminFont();
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    
    ctx.font = 'italic 60px "Acumin Variable Concept", Arial, sans-serif';
    ctx.fillText('PRICE DROP', canvas.width / 2, canvas.height - 220);
    
    ctx.font = 'italic 36px "Acumin Variable Concept", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`WAS AED ${parseInt(originalPrice).toLocaleString()}`, canvas.width / 2, canvas.height - 160);
    
    const wasText = ctx.measureText(`WAS AED ${parseInt(originalPrice).toLocaleString()}`);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo((canvas.width - wasText.width) / 2, canvas.height - 170);
    ctx.lineTo((canvas.width + wasText.width) / 2, canvas.height - 170);
    ctx.stroke();
    
    ctx.fillStyle = 'white';
    ctx.font = 'italic 54px "Acumin Variable Concept", Arial, sans-serif';
    ctx.fillText(`NOW AED ${parseInt(newPrice).toLocaleString()}`, canvas.width / 2, canvas.height - 100);
    
    ctx.font = 'italic 36px "Acumin Variable Concept", Arial, sans-serif';
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`SAVE AED ${savings.toLocaleString()}`, canvas.width / 2, canvas.height - 40);

    return canvas.toDataURL('image/png').split(',')[1];
  }, [car, originalPrice, newPrice, loadAcuminFont]);

  // Generate story image
  const generateStoryImage = useCallback(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const { data: mediaData, error: mediaError } = await supabase
      .from('car_media')
      .select('kind, url, sort_order')
      .eq('car_id', car.id)
      .order('sort_order');

    if (mediaError) throw new Error('Failed to fetch media');

    const socialMediaImages = mediaData?.filter((m: any) => m.kind === 'social_media') || [];
    const imageUrl = socialMediaImages[1]?.url || socialMediaImages[0]?.url;

    if (!imageUrl) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a1a1a');
      gradient.addColorStop(1, '#0a0a0a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const imgAspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imgAspect > canvasAspect) {
        drawHeight = canvas.height;
        drawWidth = drawHeight * imgAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgAspect;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      }
      
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }

    const centerY = canvas.height / 2;
    const savings = parseFloat(originalPrice) - parseFloat(newPrice);
    
    const overlayGradient = ctx.createRadialGradient(canvas.width / 2, centerY, 0, canvas.width / 2, centerY, 400);
    overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, centerY - 200, canvas.width, 400);

    await loadAcuminFont();
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    const leftX = canvas.width / 2 - 180;
    const rightX = canvas.width / 2 + 180;
    
    ctx.font = 'italic 28px "Acumin Variable Concept", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('WAS', leftX, centerY - 40);
    ctx.font = 'italic 32px "Acumin Variable Concept", Arial, sans-serif';
    ctx.fillText(`AED ${parseInt(originalPrice).toLocaleString()}`, leftX, centerY);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftX - 80, centerY - 10);
    ctx.lineTo(leftX + 80, centerY - 10);
    ctx.stroke();
    
    ctx.fillStyle = 'white';
    ctx.font = 'italic 28px "Acumin Variable Concept", Arial, sans-serif';
    ctx.fillText('NOW', rightX, centerY - 40);
    ctx.font = 'italic 32px "Acumin Variable Concept", Arial, sans-serif';
    ctx.fillText(`AED ${parseInt(newPrice).toLocaleString()}`, rightX, centerY);
    
    ctx.fillStyle = '#4ade80';
    ctx.font = 'italic 24px "Acumin Variable Concept", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`SAVE AED ${savings.toLocaleString()}`, canvas.width / 2, centerY + 60);

    return canvas.toDataURL('image/png').split(',')[1];
  }, [car, originalPrice, newPrice, loadAcuminFont]);

  const handleSubmit = async () => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      alert('Please enter a valid new price');
      return;
    }

    if (parseFloat(newPrice) >= parseFloat(originalPrice)) {
      alert('New price must be lower than original price');
      return;
    }

    setIsGenerating(true);

    try {
      // Update car price in inventory
      const updatePriceResponse = await fetch('/api/update-car-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId: car.id,
          newPrice: parseFloat(newPrice)
        }),
      });

      if (!updatePriceResponse.ok) {
        throw new Error('Failed to update car price');
      }

      // Generate both image formats
      const [image45, imageStory] = await Promise.all([
        generate45Image(),
        generateStoryImage()
      ]);

      // Create the price drop marketing task
      const response = await fetch('/api/create-price-drop-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId: car.id,
          carDetails: {
            stock_number: car.stock_number,
            model_year: car.model_year,
            vehicle_model: car.vehicle_model,
            colour: car.colour
          },
          pricing: {
            wasPrice: parseFloat(originalPrice),
            nowPrice: parseFloat(newPrice),
            savings: parseFloat(originalPrice) - parseFloat(newPrice)
          },
          images: {
            image45: image45,
            imageStory: imageStory
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create price drop task');
      }

      setIsGenerating(false);
      onSuccess();
    } catch (error) {
      setIsGenerating(false);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black/30 backdrop-blur-2xl border border-white/20 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden">
        {/* Gradient overlay for glass effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent pointer-events-none"></div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          disabled={isGenerating}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create Price Drop Campaign</h2>
              <p className="text-sm text-white/60">
                {car.stock_number} - {car.model_year} {car.brand} {car.vehicle_model}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price Fields - Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original Price */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">
                Original Price
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full h-14 px-4 bg-black/30 border border-white/20 rounded-xl text-white text-lg font-medium placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all backdrop-blur-sm"
                  placeholder="0"
                  disabled={isGenerating}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 4V2C7 1.45 7.45 1 8 1S9 1.55 9 2V4H15V2C15 1.45 15.45 1 16 1S17 1.55 17 2V4H20C21.1 4 22 4.9 22 6V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V6C2 4.9 2.9 4 4 4H7ZM20 8H4V20H20V8ZM16 14H8C7.45 14 7 13.55 7 13S7.45 12 8 12H16C16.55 12 17 12.45 17 13S16.55 14 16 14Z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* New Price */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">
                New Price <span className="text-orange-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full h-14 px-4 bg-black/30 border border-white/20 rounded-xl text-white text-lg font-medium placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all backdrop-blur-sm"
                  placeholder="Enter new price"
                  disabled={isGenerating}
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 4V2C7 1.45 7.45 1 8 1S9 1.55 9 2V4H15V2C15 1.45 15.45 1 16 1S17 1.55 17 2V4H20C21.1 4 22 4.9 22 6V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V6C2 4.9 2.9 4 4 4H7ZM20 8H4V20H20V8ZM16 14H8C7.45 14 7 13.55 7 13S7.45 12 8 12H16C16.55 12 17 12.45 17 13S16.55 14 16 14Z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Payment Calculations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Monthly Payment */}
            <div className="bg-black/20 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-white/60 mb-3">Current Monthly Payment</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm">AED {originalMonthly.zero.toLocaleString()}/mo</span>
                </div>
                <p className="text-xs text-white/40">(20% down, 60 months)</p>
              </div>
            </div>

            {/* New Monthly Payment */}
            <div className="bg-black/20 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-white/60 mb-3">New Monthly Payment</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-green-400 text-sm font-medium">AED {newMonthly.zero.toLocaleString()}/mo</span>
                </div>
                <p className="text-xs text-white/40">(20% down, 60 months)</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={onClose}
              className="flex-1 h-12 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-medium transition-all backdrop-blur-sm"
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
                              className="flex-1 h-12 bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              disabled={isGenerating || !newPrice || parseFloat(newPrice) >= parseFloat(originalPrice)}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Generating...
                </div>
              ) : (
                'Create Campaign'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceDropModal; 