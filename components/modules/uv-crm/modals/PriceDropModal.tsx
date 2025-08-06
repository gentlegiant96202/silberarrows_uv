"use client";

import { useState } from 'react';
import { X, DollarSign, Tag, TrendingDown } from 'lucide-react';

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

export default function PriceDropModal({ car, onClose, onSuccess }: Props) {
  const [wasPrice, setWasPrice] = useState(car.advertised_price_aed.toString());
  const [nowPrice, setNowPrice] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Calculate monthly payment for new price (20% down)
  const calculateMonthlyPayment = (price: number) => {
    if (!price || price <= 0) return 0;
    const principal = price * 0.8; // 20% down
    const r = 0.03 / 12; // 3% annual rate, monthly
    const n = 60; // 60 months
    return Math.round(principal * r / (1 - Math.pow(1 + r, -n)));
  };

  const monthlyPayment = calculateMonthlyPayment(parseFloat(nowPrice) || 0);
  const savings = parseFloat(wasPrice) - parseFloat(nowPrice);

  const handleSubmit = async () => {
    if (!nowPrice || parseFloat(nowPrice) >= parseFloat(wasPrice)) {
      alert('Please enter a valid new price that is lower than the original price');
      return;
    }

    setIsGenerating(true);
    try {
      // Generate image on client side
      const imageDataUrl = await generatePriceDropImage();
      
      // Create marketing task with generated image
      const response = await fetch('/api/create-price-drop-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carId: car.id,
          stockNumber: car.stock_number,
          carTitle: `${car.model_year} ${car.vehicle_model}`,
          wasPrice: parseFloat(wasPrice),
          nowPrice: parseFloat(nowPrice),
          monthlyPayment,
          savings,
          imageDataUrl
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        throw new Error('Failed to create price drop task');
      }
    } catch (error) {
      console.error('Error creating price drop task:', error);
      alert('Failed to create price drop task. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePriceDropImage = async (): Promise<string> => {
    return new Promise(async (resolve) => {
      // Story format dimensions (9:16 ratio)
      const canvasWidth = 720;
      const canvasHeight = 1280;
      
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d')!;

      // Black gradient background
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
      try {
        const response = await fetch(`/api/car-media/${car.id}/primary`);
        const data = await response.json();
        const primaryImageUrl = data.primaryImageUrl;
        const secondImageUrl = data.secondImageUrl;
        
        // Define function that can be used in multiple contexts
        const drawTwoColumnOverlay = () => {
          const padding = 30;
          const overlayWidth = canvasWidth - (padding * 2);
          // Fixed overlay height and positioning
          const overlayHeight = 280; // Fixed height for text overlay
          const minImageHeight = 180;
          const remaining = canvasHeight - overlayHeight;
          const topImageHeight = Math.max(Math.floor(remaining / 2), minImageHeight);
          const overlayY = topImageHeight;
          
          // Draw the black overlay box
          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.fillRect(padding, overlayY, overlayWidth, overlayHeight);
          
          // Add subtle border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.strokeRect(padding, overlayY, overlayWidth, overlayHeight);
          
          // Start text positioning
          let textY = overlayY + 40;
          const centerX = canvasWidth / 2;
          
          // Title - now in center with better styling
          ctx.font = 'bold 45px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = '#E50012'; // Price drop red
          ctx.textAlign = 'center';
          ctx.fillText('PRICE DROP ALERT!', centerX, textY);
          
          // Car details in two columns
          textY += 55;
          const leftX = padding + 25;
          const rightX = padding + columnWidth + 25;
          
          // Left column header
          ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.fillText('Vehicle Details:', leftX, textY);
          
          // Right column header  
          ctx.textAlign = 'left';
          ctx.fillText('Price Information:', rightX, textY);
          
          // Left column content
          textY += 35;
          ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = '#cccccc';
          ctx.textAlign = 'left';
          
          const leftColumnData = [
            `${data.year || 'N/A'} ${data.make || 'N/A'} ${data.model || 'N/A'}`,
            `Mileage: ${data.mileage ? data.mileage.toLocaleString() : 'N/A'} km`,
            `Body: ${data.body_type || 'N/A'}`,
            `Transmission: ${data.transmission || 'N/A'}`
          ];
          
          leftColumnData.forEach((text, index) => {
            ctx.fillText(text, leftX, textY + (index * 25));
          });
          
          // Right column content
          ctx.textAlign = 'left';
          
          // Was price
          ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = '#ff6b6b';
          ctx.fillText(`Was: AED ${parseFloat(wasPrice).toLocaleString()}`, rightX, textY);
          
          // Now price  
          ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = '#4ecdc4';
          ctx.fillText(`Now: AED ${parseFloat(nowPrice).toLocaleString()}`, rightX, textY + 30);
          
          // Savings
          const savings = parseFloat(wasPrice) - parseFloat(nowPrice);
          ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = '#45b7d1';
          ctx.fillText(`Save: AED ${savings.toLocaleString()}`, rightX, textY + 60);
          
          // Monthly payment savings
          const oldMonthly = calculateMonthlyPayment(parseFloat(wasPrice));
          const newMonthly = calculateMonthlyPayment(parseFloat(nowPrice));
          const monthlySavings = oldMonthly - newMonthly;
          ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = '#96CEB4';
          ctx.fillText(`Monthly Savings: AED ${monthlySavings.toLocaleString()}`, rightX, textY + 85);
          
          // 4. Financing call-to-action
          textY = overlayY + overlayHeight - 70;
          ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = '#ffeaa7';
          ctx.textAlign = 'center';
          ctx.fillText('Financing Available - No Down Payment!', centerX, textY);
          
          // 5. Contact Info at bottom
          textY = overlayY + overlayHeight - 35;
          ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText('Call or WhatsApp: +971 4 380 5515', centerX, textY);
          // Convert canvas to data URL
          resolve(canvas.toDataURL('image/png', 1.0));
        };
        
        if (primaryImageUrl) {
          // Load both images
          const primaryImage = new Image();
          const secondImage = new Image();
          primaryImage.crossOrigin = 'anonymous';
          secondImage.crossOrigin = 'anonymous';
          
          let imagesLoaded = 0;
          const totalImages = secondImageUrl ? 2 : 1;


          function onImageLoad() {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
              drawCompleteLayout();
            }
          }
          
          function drawCompleteLayout() {
            // Layout configuration
            const availableHeight = canvasHeight;
            const topImageHeight = Math.floor(availableHeight * 0.35); // 35% for top image
            const bottomImageHeight = Math.floor(availableHeight * 0.35); // 35% for bottom image
            const overlayHeight = Math.floor(availableHeight * 0.3); // 30% for overlay in center (more space for larger text)
            
            // Clear canvas
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            
            // Draw background gradient
            const gradient = ctx.createRadialGradient(
              canvasWidth / 2, canvasHeight / 2, 0,
              canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) / 2
            );
            gradient.addColorStop(0, '#1a1a1a');
            gradient.addColorStop(0.5, '#0a0a0a');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            
            // Calculate positions
            const topImageY = 0;
            const overlayY = topImageHeight;
            const bottomImageY = topImageHeight + overlayHeight;
            
            // Draw top image (primary) - full width, aspect ratio maintained
            if (primaryImage.complete) {
              const topAspectRatio = primaryImage.width / primaryImage.height;
              let topDrawWidth, topDrawHeight;
              
              // Always fit to available space while maintaining aspect ratio
              const widthBasedHeight = canvasWidth / topAspectRatio;
              const heightBasedWidth = topImageHeight * topAspectRatio;
              
              if (widthBasedHeight <= topImageHeight) {
                // Fit to width
                topDrawWidth = canvasWidth;
                topDrawHeight = widthBasedHeight;
              } else {
                // Fit to height
                topDrawHeight = topImageHeight;
                topDrawWidth = heightBasedWidth;
              }
              
              // Position images to stick to edges
              const topX = (canvasWidth - topDrawWidth) / 2;
              const topY = 0; // Stick to top edge
              
              ctx.save();
              ctx.shadowColor = 'rgba(255, 255, 255, 0.1)';
              ctx.shadowBlur = 20;
              // Use high-quality image rendering
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(primaryImage, topX, topY, topDrawWidth, topDrawHeight);
              ctx.restore();
            }
            
            // Draw bottom image (second or primary if no second) - full width, aspect ratio maintained
            const bottomImg = secondImage.complete ? secondImage : primaryImage;
            if (bottomImg.complete) {
              const bottomAspectRatio = bottomImg.width / bottomImg.height;
              let bottomDrawWidth, bottomDrawHeight;
              
              // Always fit to available space while maintaining aspect ratio
              const widthBasedHeight = canvasWidth / bottomAspectRatio;
              const heightBasedWidth = bottomImageHeight * bottomAspectRatio;
              
              if (widthBasedHeight <= bottomImageHeight) {
                // Fit to width
                bottomDrawWidth = canvasWidth;
                bottomDrawHeight = widthBasedHeight;
              } else {
                // Fit to height
                bottomDrawHeight = bottomImageHeight;
                bottomDrawWidth = heightBasedWidth;
              }
              
              const bottomX = (canvasWidth - bottomDrawWidth) / 2;
              const bottomY = canvasHeight - bottomDrawHeight; // Stick to bottom edge
              
              ctx.save();
              ctx.shadowColor = 'rgba(255, 255, 255, 0.1)';
              ctx.shadowBlur = 20;
              // Use high-quality image rendering
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(bottomImg, bottomX, bottomY, bottomDrawWidth, bottomDrawHeight);
              ctx.restore();
            }
            
            // Draw pricing overlay in center
            drawTwoColumnOverlay();
          }
          
          primaryImage.onload = onImageLoad;
          primaryImage.onerror = onImageLoad;
          
          if (secondImageUrl) {
            secondImage.onload = onImageLoad;
            secondImage.onerror = onImageLoad;
            secondImage.src = secondImageUrl;
          }
          
          primaryImage.src = primaryImageUrl;
        } else {
          drawTwoColumnOverlay();
        }
      } catch (error) {
        console.log('Error loading car image:', error);
        drawTwoColumnOverlay();
      }
      // --- COMPLETELY NEW TEXT OVERLAY SYSTEM ---
      // Fixed overlay height and positioning
      const overlayHeight = 280; // Fixed height for text overlay
      const minImageHeight = 180;
      const remaining = canvasHeight - overlayHeight;
      const topImageHeight = Math.max(Math.floor(remaining / 2), minImageHeight);
      const overlayY = topImageHeight;
      
      // Draw the black overlay box
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(padding, overlayY, overlayWidth, overlayHeight);
      
      // Add subtle border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(padding, overlayY, overlayWidth, overlayHeight);
      
      // Text positioning variables
      const centerX = canvasWidth / 2;
      const leftColX = padding + 40;
      const rightColX = centerX + 20;
      let textY = overlayY + 50; // Start position
      
      // 1. PRICE DROP Title
      ctx.font = 'bold 56px Impact, "Arial Black", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('PRICE DROP', centerX, textY);
      textY += 50;
      
      // 2. Car Model
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'center';
      ctx.fillText(`${car.model_year} ${car.vehicle_model}`.toUpperCase(), centerX, textY);
      textY += 45;
      
      // 3. LEFT COLUMN - Pricing
      ctx.textAlign = 'left';
      
      // Was Price (with strikethrough)
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#ff6b6b';
      const wasText = `AED ${parseFloat(wasPrice).toLocaleString()}`;
      ctx.fillText(wasText, leftColX, textY);
      // Strikethrough
      const wasMetrics = ctx.measureText(wasText);
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(leftColX, textY - 8);
      ctx.lineTo(leftColX + wasMetrics.width, textY - 8);
      ctx.stroke();
      
      // Now Price
      ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#4ade80';
      ctx.fillText(`AED ${parseFloat(nowPrice).toLocaleString()}`, leftColX, textY + 35);
      
      // Save Amount
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.fillText(`Save AED ${savings.toLocaleString()}`, leftColX, textY + 65);
      
      // 4. RIGHT COLUMN - Monthly Payment
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('MONTHLY PAYMENT', rightColX, textY);
      
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#4ade80';
      ctx.fillText(`AED ${monthlyPayment.toLocaleString()}/mo`, rightColX, textY + 35);
      
      ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#a0a0a0';
      ctx.fillText('(20% down, 60 months)', rightColX, textY + 60);
      
      // 5. Contact Info at bottom
      textY = overlayY + overlayHeight - 35;
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('Call or WhatsApp: +971 4 380 5515', centerX, textY);
      // Convert canvas to data URL
      resolve(canvas.toDataURL('image/png', 1.0));
    });
  };


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
          <button 
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            disabled={isGenerating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Price Input Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Was Price */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white/80">
                Original Price
              </label>
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
              <label className="block text-sm font-medium text-white/80">
                New Price <span className="text-red-400">*</span>
              </label>
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
                  <TrendingDown className="w-4 h-4" />
                  Create Price Drop
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 