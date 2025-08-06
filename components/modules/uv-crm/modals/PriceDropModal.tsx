import React, { useState } from 'react';
import { TrendingDown, X, Tag } from 'lucide-react';

interface Car {
  id: string;
  stock_number: string;
  model_year: number;
  vehicle_model: string;
  colour: string;
  advertised_price_aed: number;
  status: string;
  sale_status: string;
}

interface Props {
  car: Car;
  onClose: () => void;
  onSuccess: () => void;
}

const PriceDropModal: React.FC<Props> = ({ car, onClose, onSuccess }) => {
  const [wasPrice, setWasPrice] = useState('');
  const [nowPrice, setNowPrice] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [monthlyPayment, setMonthlyPayment] = useState(0);

  const calculateMonthlyPayment = (price: number) => {
    // Example: 20% down, 60 months, 0% interest
    const downPayment = price * 0.2;
    const financed = price - downPayment;
    return Math.round(financed / 60);
  };

  const savings = wasPrice && nowPrice ? Math.max(0, parseFloat(wasPrice) - parseFloat(nowPrice)) : 0;

  // Clean, modular image generation
  const generatePriceDropImage = async (): Promise<string> => {
    return new Promise(async (resolve) => {
      const canvasWidth = 720;
      const canvasHeight = 1280;
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d')!;

      // Background
      const gradient = ctx.createRadialGradient(
        canvasWidth / 2, canvasHeight / 2, 0,
        canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) / 2
      );
      gradient.addColorStop(0, '#1a1a1a');
      gradient.addColorStop(0.7, '#000000');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Try to load car image
      let primaryImageUrl = '';
      try {
        const response = await fetch(`/api/car-media/${car.id}/primary`);
        const data = await response.json();
        primaryImageUrl = data.primaryImageUrl;
      } catch {}

      // Draw car image if available
      if (primaryImageUrl) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const aspect = img.width / img.height;
          const imgWidth = canvasWidth;
          const imgHeight = imgWidth / aspect;
          ctx.drawImage(img, 0, 0, imgWidth, imgHeight > 400 ? 400 : imgHeight);
          drawOverlay();
        };
        img.onerror = drawOverlay;
        img.src = primaryImageUrl;
      } else {
        drawOverlay();
      }

      function drawOverlay() {
        const padding = 30;
        const overlayWidth = canvasWidth - (padding * 2);
        const overlayHeight = 280;
        const minImageHeight = 180;
        const remaining = canvasHeight - overlayHeight;
        const topImageHeight = Math.max(Math.floor(remaining / 2), minImageHeight);
        const overlayY = topImageHeight;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(padding, overlayY, overlayWidth, overlayHeight);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(padding, overlayY, overlayWidth, overlayHeight);
        let textY = overlayY + 40;
        const centerX = canvasWidth / 2;
        // Title
        ctx.font = 'bold 45px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = '#E50012';
        ctx.textAlign = 'center';
        ctx.fillText('PRICE DROP ALERT!', centerX, textY);
        // Car details
        textY += 55;
        const leftX = padding + 25;
        const rightX = padding + overlayWidth / 2 + 25;
        ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('Vehicle Details:', leftX, textY);
        ctx.fillText('Price Information:', rightX, textY);
        textY += 35;
        ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = '#cccccc';
        ctx.fillText(`${car.model_year} ${car.vehicle_model}`, leftX, textY);
        ctx.fillText(`Was: AED ${wasPrice}`, rightX, textY);
        ctx.fillText(`Now: AED ${nowPrice}`, rightX, textY + 30);
        ctx.fillText(`Save: AED ${savings}`, rightX, textY + 60);
        // Contact info
        textY = overlayY + overlayHeight - 35;
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('Call or WhatsApp: +971 4 380 5515', centerX, textY);
        resolve(canvas.toDataURL('image/png', 1.0));
      }
    });
  };

  const handleSubmit = async () => {
    setIsGenerating(true);
    try {
      const imageUrl = await generatePriceDropImage();
      // Simulate API call
      setTimeout(() => {
        setIsGenerating(false);
        onSuccess();
      }, 1000);
    } catch {
      setIsGenerating(false);
    }
  };

  React.useEffect(() => {
    if (nowPrice) {
      setMonthlyPayment(calculateMonthlyPayment(parseFloat(nowPrice)));
    }
  }, [nowPrice]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-gray-800 to-black rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create Price Drop Campaign</h2>
              <p className="text-sm text-white/60">{car.stock_number} - {car.model_year} {car.vehicle_model}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors" disabled={isGenerating}>
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Content */}
        <div className="p-6">
          {/* Price Input Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Was Price */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white/80">Original Price</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-white/60 text-sm font-medium">AED</span>
                </div>
                <input
                  type="number"
                  value={wasPrice}
                  onChange={(e) => setWasPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-3 pl-12 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent backdrop-blur-sm"
                  placeholder="0"
                  disabled={isGenerating}
                />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 backdrop-blur-sm">
                <p className="text-xs text-white/60 mb-1">Current Monthly Payment</p>
                <p className="text-sm font-semibold text-white">
                  AED {calculateMonthlyPayment(parseFloat(wasPrice) || 0).toLocaleString()}/mo
                </p>
                <p className="text-xs text-white/40">(20% down, 60 months)</p>
              </div>
            </div>
            {/* Now Price */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white/80">New Price <span className="text-red-400">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-white/60 text-sm font-medium">AED</span>
                </div>
                <input
                  type="number"
                  value={nowPrice}
                  onChange={(e) => setNowPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-3 pl-12 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent backdrop-blur-sm"
                  placeholder="Enter new price"
                  disabled={isGenerating}
                />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 backdrop-blur-sm">
                <p className="text-xs text-white/60 mb-1">New Monthly Payment</p>
                <p className="text-sm font-semibold text-green-400">
                  AED {monthlyPayment.toLocaleString()}/mo
                </p>
                <p className="text-xs text-white/40">(20% down, 60 months)</p>
              </div>
            </div>
          </div>
          {/* Savings Summary */}
          {nowPrice && savings > 0 && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4 mb-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-medium text-green-400">Price Drop Summary</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-white/60">Total Savings</p>
                  <p className="text-lg font-bold text-green-400">AED {savings.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-white/60">Monthly Savings</p>
                  <p className="text-lg font-bold text-green-400">
                    AED {(calculateMonthlyPayment(parseFloat(wasPrice)) - monthlyPayment).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/60">Discount %</p>
                  <p className="text-lg font-bold text-green-400">
                    {((savings / parseFloat(wasPrice)) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Description */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
            <p className="text-xs text-white/60 mb-2">What happens next?</p>
            <ul className="text-xs text-white/80 space-y-1">
              <li>• A story-format (9:16) marketing image will be generated</li>
              <li>• Image will include car photo, pricing details, and monthly payment</li>
              <li>• A marketing task will be created in the INTAKE column</li>
              <li>• Task title: "Price Drop - {car.model_year} {car.vehicle_model}"</li>
            </ul>
          </div>
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/20 text-white px-4 py-3 rounded-lg transition-colors font-medium"
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!nowPrice || parseFloat(nowPrice) >= parseFloat(wasPrice) || isGenerating}
              className="flex-1 bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 disabled:from-gray-800/50 disabled:to-black/50 text-white px-4 py-3 rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <TrendingDown className="w-5 h-4" />
                  Create Price Drop
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceDropModal; 