"use client";
import { useState, useRef, useEffect } from 'react';
import { Upload, Download, Type, Move, RotateCcw } from 'lucide-react';

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: string;
}

interface InstagramPostEditorProps {
  initialImageUrl?: string;
  carData?: {
    id: string;
    stock_number: string;
    model_year: number;
    vehicle_model: string;
    colour: string;
    advertised_price_aed: number;
  };
  onSave?: (imageUrl: string) => void;
}

export default function InstagramPostEditor({ initialImageUrl, carData, onSave }: InstagramPostEditorProps) {
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl || '');
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize with car data if provided
  useEffect(() => {
    if (carData && textOverlays.length === 0) {
      const defaultOverlays: TextOverlay[] = [
        {
          id: '1',
          text: `${carData.model_year} ${carData.vehicle_model}`,
          x: 50,
          y: 4,
          fontSize: 18,
          color: '#000000',
          fontWeight: 'bold'
        },
        {
          id: '2', 
          text: `AED ${carData.advertised_price_aed.toLocaleString()}`,
          x: 50,
          y: 97,
          fontSize: 22,
          color: '#d4af37',
          fontWeight: 'bold'
        },
        {
          id: '3',
          text: `Stock: ${carData.stock_number}`,
          x: 85,
          y: 4,
          fontSize: 10,
          color: '#666666',
          fontWeight: 'normal'
        }
      ];
      setTextOverlays(defaultOverlays);
    }
  }, [carData]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setProcessedImageUrl('');
    }
  };

  const addTextOverlay = () => {
    const newText: TextOverlay = {
      id: Date.now().toString(),
      text: 'Your Text Here',
      x: 50,
      y: 50,
      fontSize: 24,
      color: '#ffffff',
      fontWeight: 'bold'
    };
    setTextOverlays([...textOverlays, newText]);
    setSelectedTextId(newText.id);
  };

  const updateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays(prev => 
      prev.map(text => text.id === id ? { ...text, ...updates } : text)
    );
  };

  const removeTextOverlay = (id: string) => {
    setTextOverlays(prev => prev.filter(text => text.id !== id));
    setSelectedTextId(null);
  };

  const processImage = async () => {
    if (!imageUrl) return;

    setIsProcessing(true);
    try {
      // Create form data with image and text overlays
      const formData = new FormData();
      
      if (imageUrl.startsWith('blob:')) {
        // Convert blob URL to file
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        formData.append('image', blob, 'image.jpg');
      } else {
        formData.append('imageUrl', imageUrl);
      }
      
      formData.append('textOverlays', JSON.stringify(textOverlays));

      const response = await fetch('/api/create-instagram-post', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const result = await response.json();
      setProcessedImageUrl(result.imageUrl);
      
      if (onSave) {
        onSave(result.imageUrl);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (processedImageUrl) {
      const link = document.createElement('a');
      link.href = processedImageUrl;
      link.download = 'instagram-post.jpg';
      link.click();
    }
  };

  const selectedText = textOverlays.find(t => t.id === selectedTextId);

  return (
    <div className="bg-black/90 backdrop-blur border border-white/10 rounded-lg p-6 max-w-4xl mx-auto">
      <h3 className="text-xl font-bold text-white mb-6">
        Instagram Post Editor (4:5 Ratio)
        {carData && (
          <span className="text-sm font-normal text-white/60 ml-2">
            - {carData.model_year} {carData.vehicle_model} (Stock: {carData.stock_number})
          </span>
        )}
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image Upload and Preview */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
            
            <button
              onClick={addTextOverlay}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Type className="w-4 h-4" />
              Add Text
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Image Preview with Text Overlays */}
          {imageUrl && (
            <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '4/5' }}>
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              
              {/* Text Overlays */}
              {textOverlays.map((textOverlay) => (
                <div
                  key={textOverlay.id}
                  className={`absolute cursor-move select-none ${
                    selectedTextId === textOverlay.id ? 'ring-2 ring-blue-400' : ''
                  }`}
                  style={{
                    left: `${textOverlay.x}%`,
                    top: `${textOverlay.y}%`,
                    fontSize: `${textOverlay.fontSize}px`,
                    color: textOverlay.color,
                    fontWeight: textOverlay.fontWeight,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => setSelectedTextId(textOverlay.id)}
                  onMouseDown={(e) => {
                    const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startLeft = textOverlay.x;
                    const startTop = textOverlay.y;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const deltaX = moveEvent.clientX - startX;
                      const deltaY = moveEvent.clientY - startY;
                      const newX = Math.max(0, Math.min(100, startLeft + (deltaX / rect.width) * 100));
                      const newY = Math.max(0, Math.min(100, startTop + (deltaY / rect.height) * 100));
                      
                      updateTextOverlay(textOverlay.id, { x: newX, y: newY });
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  {textOverlay.text}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Text Controls */}
        <div className="space-y-4">
          {selectedText && (
            <div className="bg-gray-900 rounded-lg p-4 space-y-4">
              <h4 className="text-white font-semibold">Edit Text</h4>
              
              <div>
                <label className="block text-white text-sm mb-1">Text</label>
                <input
                  type="text"
                  value={selectedText.text}
                  onChange={(e) => updateTextOverlay(selectedText.id, { text: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm mb-1">Font Size</label>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={selectedText.fontSize}
                    onChange={(e) => updateTextOverlay(selectedText.id, { fontSize: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-white text-xs">{selectedText.fontSize}px</span>
                </div>

                <div>
                  <label className="block text-white text-sm mb-1">Color</label>
                  <input
                    type="color"
                    value={selectedText.color}
                    onChange={(e) => updateTextOverlay(selectedText.id, { color: e.target.value })}
                    className="w-full h-8 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm mb-1">Weight</label>
                <select
                  value={selectedText.fontWeight}
                  onChange={(e) => updateTextOverlay(selectedText.id, { fontWeight: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="bolder">Extra Bold</option>
                </select>
              </div>

              <button
                onClick={() => removeTextOverlay(selectedText.id)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Remove Text
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={processImage}
              disabled={!imageUrl || isProcessing}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isProcessing ? 'Processing...' : 'Generate Instagram Post'}
            </button>

            {processedImageUrl && (
              <button
                onClick={downloadImage}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Download Image
              </button>
            )}
          </div>

          {/* Final Result Preview */}
          {processedImageUrl && (
            <div className="mt-4">
              <h4 className="text-white font-semibold mb-2">Final Result</h4>
              <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '4/5' }}>
                <img
                  src={processedImageUrl}
                  alt="Final Instagram Post"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 