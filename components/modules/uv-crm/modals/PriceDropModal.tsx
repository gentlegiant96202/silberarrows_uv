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
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize price when modal opens
  useEffect(() => {
    if (isOpen && car?.advertised_price_aed) {
      setOriginalPrice(car.advertised_price_aed.toString());
      // Reset states when modal opens
      setShowSuccess(false);
      setNewPrice('');
    }
  }, [isOpen, car]);

  // Auto-close modal after success
  useEffect(() => {
    if (showSuccess) {
      console.log('🎉 Success state triggered, starting 3-second timer...');
      const timer = setTimeout(() => {
        console.log('⏰ Timer expired, closing modal...');
        onClose();
      }, 3000); // Close after 3 seconds

      return () => {
        console.log('⏹️ Cleaning up timer...');
        clearTimeout(timer);
      };
    }
  }, [showSuccess, onClose]);

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

  // Server-side HTML template rendering with Playwright
  const generatePriceDropImages = async () => {
    try {
      setIsGenerating(true);
      console.log('🎨 Generating price drop images with Playwright...');
      
      // Get the first catalog image for this car
      console.log('📸 Fetching catalog image...');
      const { data: carMedia, error } = await supabase
        .from('car_media')
        .select('url, sort_order, kind')
        .eq('car_id', car.id)
        .eq('kind', 'catalog')
        .order('sort_order', { ascending: true })
        .limit(1);

      if (error) {
        console.error('❌ Error fetching car images:', error);
        throw new Error('Failed to fetch car images');
      }

      console.log('🔎 car_media results:', (carMedia || []).map(m => ({ kind: m.kind, sort_order: m.sort_order, url: m.url })));

      if (!carMedia || carMedia.length === 0) {
        throw new Error('No catalog images found for this car');
      }

      const firstImageUrl = carMedia[0]?.url;

      console.log('📷 Catalog image URL:', firstImageUrl);
      console.log('📊 Car details:', {
        id: car.id,
        year: car.model_year,
        model: car.vehicle_model,
        mileage: car.current_mileage_km || car.mileage_km,
        stockNumber: car.stock_number
      });

      const rendererBase = process.env.NEXT_PUBLIC_RENDERER_URL as string | undefined;
      const endpoint = rendererBase ? `${rendererBase.replace(/\/$/, '')}/render` : '/api/generate-price-drop-images';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carDetails: {
            year: car.model_year,
            model: car.vehicle_model,
            mileage: car.current_mileage_km ? `${car.current_mileage_km.toLocaleString()} KM` : 
                     car.mileage_km ? `${car.mileage_km.toLocaleString()} KM` : 'N/A',
            stockNumber: car.stock_number,
            horsepower: car.horsepower_hp ?? null
          },
          pricing: {
            wasPrice: parseFloat(originalPrice),
            nowPrice: parseFloat(newPrice),
            savings: parseFloat(originalPrice) - parseFloat(newPrice),
            monthlyPayment: calculateMonthly(parseFloat(newPrice) || 0).twenty
          },
          firstImageUrl,
          secondImageUrl: firstImageUrl
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate images');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Image generation failed');
      }

      console.log('✅ Successfully generated images with Playwright');
      return {
        image45: result.image45,
        imageStory: result.imageStory
      };
      
    } catch (error) {
      console.error('❌ Error generating images:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPrice || isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      console.log('🚀 Starting price drop process...');
      
      // Step 1: Update car price
      console.log('💰 Updating price:', car.stock_number, '->', `AED ${newPrice}`);
      const priceResponse = await fetch('/api/update-car-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carId: car.id,
          newPrice: parseFloat(newPrice),
        }),
      });

      if (!priceResponse.ok) {
        throw new Error('Failed to update car price');
      }

      // Step 2: Generate images using Playwright
      const { image45, imageStory } = await generatePriceDropImages();

      // Step 3: Create marketing task
      const savings = parseFloat(originalPrice) - parseFloat(newPrice);
      const taskResponse = await fetch('/api/create-price-drop-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carId: car.id,
          carDetails: {
            stock_number: car.stock_number,
            model_year: car.model_year,
            vehicle_model: car.vehicle_model
          },
          pricing: {
            wasPrice: parseFloat(originalPrice),
            nowPrice: parseFloat(newPrice),
            savings: savings
          },
          images: {
            image45,
            imageStory
          }
        }),
      });

      if (!taskResponse.ok) {
        throw new Error('Failed to create price drop task');
      }

      console.log('✅ Price drop images generated and task created successfully!');
      console.log('🔄 Setting showSuccess to true...');
      setShowSuccess(true);
      onSuccess(); // Call onSuccess prop
      
    } catch (error) {
      console.error('❌ Price drop generation failed:', error);
      alert(`Failed to generate price drop: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
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
          {showSuccess ? (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6 backdrop-blur-sm text-center text-white">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-green-400">Price Drop Campaign Created!</h3>
              <p className="text-sm text-white/80 mb-4">
                Your price drop campaign has been successfully created with both 4:5 and 9:16 story formats. 
                You can view it in your marketing dashboard.
              </p>
              <p className="text-xs text-white/60 mb-4">This modal will close automatically in 3 seconds...</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
              >
                Close Now
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceDropModal; 