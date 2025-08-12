'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Car, Download, Eye, Edit, FileText, Image as ImageIcon, RefreshCw, Plus, Zap, Globe, ExternalLink, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';

interface CatalogEntry {
  id: string;
  car_id: string;
  title: string;
  description: string | null;
  catalog_image_url: string | null;
  status: 'pending' | 'generating' | 'ready' | 'error';
  error_message: string | null;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
  // Car data
  stock_number: string;
  model_year: number;
  vehicle_model: string;
  colour: string;
  advertised_price_aed: number;
  current_mileage_km: number | null;
  primary_image_url?: string;
  stock_age_days?: number;
}

export default function UVCatalogBoard() {
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingCarId, setGeneratingCarId] = useState<string | null>(null);
  const [xmlUrl, setXmlUrl] = useState<string | null>(null);
  const { user } = useAuth();

  // Get the live XML feed URL
  const getFacebookXmlUrl = () => {
    // Use permanent Supabase storage URL - always publicly accessible
    const supabaseStorageBaseUrl = 'https://rrxfvdtubynlsanplbta.supabase.co/storage/v1/object/public/media-files';
    return `${supabaseStorageBaseUrl}/xml-feeds/facebook-latest.xml`;
  };
  
  const copyXmlUrl = async () => {
    const url = getFacebookXmlUrl();
    try {
      await navigator.clipboard.writeText(url);
      alert('Facebook XML feed URL copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Facebook XML feed URL copied to clipboard!');
    }
  };

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch UV catalog entries with car data and primary images
      const { data: catalogData, error: catalogError } = await supabase
        .from('uv_catalog')
        .select(`
          id,
          car_id,
          title,
          description,
          catalog_image_url,
          status,
          error_message,
          last_generated_at,
          created_at,
          updated_at,
          cars!inner (
            stock_number,
            model_year,
            vehicle_model,
            colour,
            advertised_price_aed,
            current_mileage_km,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (catalogError) {
        console.error('Error fetching catalog data:', catalogError);
        return;
      }

      // Fetch primary images for all cars
      const carIds = catalogData?.map(entry => entry.car_id) || [];
      const { data: mediaData } = await supabase
        .from('car_media')
        .select('car_id, url')
        .eq('kind', 'photo')
        .eq('is_primary', true)
        .in('car_id', carIds);

      // Process catalog entries with media info
      const processedEntries = catalogData?.map(entry => {
        const car = Array.isArray(entry.cars) ? entry.cars[0] : entry.cars;
        const primaryPhoto = mediaData?.find(m => m.car_id === entry.car_id);

        // Calculate stock age
        const stockAgeMs = Date.now() - new Date(car.created_at).getTime();
        const stockAgeDays = Math.floor(stockAgeMs / (1000 * 60 * 60 * 24));

        return {
          id: entry.id,
          car_id: entry.car_id,
          title: entry.title,
          description: entry.description,
          catalog_image_url: entry.catalog_image_url,
          status: entry.status,
          error_message: entry.error_message,
          last_generated_at: entry.last_generated_at,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          stock_number: car.stock_number,
          model_year: car.model_year,
          vehicle_model: car.vehicle_model,
          colour: car.colour,
          advertised_price_aed: car.advertised_price_aed,
          current_mileage_km: car.current_mileage_km,
          primary_image_url: primaryPhoto?.url,
          stock_age_days: stockAgeDays
        };
      }) || [];

      setEntries(processedEntries);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    fetchEntries();
    
    // Set up real-time subscriptions for inventory changes
    const carsSubscription = supabase
      .channel('cars_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'cars',
          filter: 'status=eq.inventory'
        },
        (payload) => {
          console.log('🔄 Car inventory change detected:', payload);
          // Refresh catalog when inventory changes
          fetchEntries();
        }
      )
      .subscribe();

    // Also listen for UV catalog changes
    const catalogSubscription = supabase
      .channel('uv_catalog_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'uv_catalog'
        },
        (payload) => {
          console.log('🔄 UV Catalog change detected:', payload);
          // Refresh catalog when entries are added/removed
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(carsSubscription);
      supabase.removeChannel(catalogSubscription);
    };
  }, [fetchEntries]);

  const handleGenerateCatalogImage = async (entry: CatalogEntry) => {
    try {
      setGeneratingCarId(entry.car_id);
      
      // Update status to generating in UI immediately
      setEntries(prev => prev.map(e => 
        e.car_id === entry.car_id 
          ? { ...e, status: 'generating' as const }
          : e
      ));
      
      const response = await fetch(`/api/generate-catalog-image/${entry.car_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate catalog image');
      }

      const result = await response.json();
      console.log('✅ Catalog image generated:', result.imageUrl);
      
      await refreshData();
      
    } catch (error) {
      console.error('Error generating catalog image:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingCarId(null);
    }
  };

  const handleGenerateAllImages = async () => {
    try {
      setGenerating(true);
      
      // Generate images for entries that don't have ready status
      const entriesNeedingImages = entries.filter(entry => entry.status !== 'ready');
      
      for (const entry of entriesNeedingImages) {
        await handleGenerateCatalogImage(entry);
      }
      
      alert(`Generated catalog images for ${entriesNeedingImages.length} cars!`);
    } catch (error) {
      console.error('Error generating all images:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateXMLFeed = async () => {
    try {
      setGenerating(true);
      
      // Step 1: Regenerate ALL catalog images to capture any price changes
      alert('Regenerating all catalog images to capture latest pricing...');
      
      let regeneratedCount = 0;
      for (const entry of entries) {
        try {
          await handleGenerateCatalogImage(entry);
          regeneratedCount++;
        } catch (error) {
          console.error(`Failed to regenerate image for ${entry.title}:`, error);
        }
      }
      
      // Wait a moment for images to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 2: Generate the XML feed with latest data
      const response = await fetch('/api/generate-public-xml-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Try to get error as JSON, but fallback to text if that fails
        let errorMessage = 'Failed to generate XML feed';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = await response.text() || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // The response is XML content, not JSON
      const xmlContent = await response.text();
      
      // Count cars in XML (simple regex to count <listing> tags for Facebook format)
      const carCount = (xmlContent.match(/<listing>/g) || []).length;
      
      // Set the live XML URL
      setXmlUrl(getFacebookXmlUrl());
      
      // Refresh the catalog entries to show updated status
      await fetchEntries();
      
      alert(`✅ Complete update finished!\n\n📸 Regenerated: ${regeneratedCount} catalog images\n📋 XML feed updated with ${carCount} cars\n🔗 Live URL: ${getFacebookXmlUrl()}\n\nThe feed now includes all latest pricing and updates!`);
      
    } catch (error) {
      console.error('Error updating XML feed:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const getStockAgeColor = (days: number) => {
    if (days <= 30) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (days <= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-400';
      case 'generating': return 'text-blue-400';
      case 'error': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-white/50 animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading UV Catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-black min-h-screen">
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">UV Catalog Management</h1>
          <p className="text-white/60">Generate catalog images and XML feeds for Facebook integration</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Facebook XML Feed URL */}
          <div className="flex items-center gap-2">
            <a 
              href={getFacebookXmlUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-400 transition-colors"
              title="Facebook-ready XML feed with ready catalog entries"
            >
              <Globe className="w-4 h-4" />
              Facebook XML Feed
              <ExternalLink className="w-3 h-3" />
            </a>
            
            <button
              onClick={copyXmlUrl}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 rounded-lg text-purple-400 transition-colors"
              title="Copy Facebook XML URL"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={handleGenerateAllImages}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 transition-colors disabled:opacity-50"
          >
            {generating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Generate All Images
          </button>
          
          <button
            onClick={handleGenerateXMLFeed}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-400 transition-colors disabled:opacity-50"
          >
            {generating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Regenerate All & Update Feed
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{entries.length}</div>
          <div className="text-white/60 text-sm">Total Cars</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{entries.filter(e => e.status === 'ready').length}</div>
          <div className="text-white/60 text-sm">Ready Cards</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-400">{entries.filter(e => e.status === 'pending').length}</div>
          <div className="text-white/60 text-sm">Pending Cards</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{entries.filter(e => e.stock_age_days! <= 30).length}</div>
          <div className="text-white/60 text-sm">New Stock</div>
        </div>
      </div>

      {/* XML Feed URL Display */}
      <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-xl p-6 mb-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-400" />
            Facebook XML Feed URL
          </h3>
          <p className="text-white/60 text-sm">
            Use this URL in Facebook Business Manager for automatic car listing updates
          </p>
        </div>

        <div className="bg-black/20 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
            <h4 className="font-semibold text-purple-300">Facebook Automotive Catalog Feed</h4>
          </div>
          <p className="text-white/60 text-xs mb-3">
            Facebook-ready cars with completed catalog images • Perfect for Facebook Business Manager
          </p>
          <div className="bg-black/30 border border-white/10 rounded-lg p-3 font-mono text-xs mb-3">
            <span className="text-purple-300 break-all">{getFacebookXmlUrl()}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyXmlUrl}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-purple-400 transition-colors text-xs"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
            <a 
              href={getFacebookXmlUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-blue-400 transition-colors text-xs"
            >
              <ExternalLink className="w-3 h-3" />
              View
            </a>
          </div>
        </div>
      </div>

      {/* Entries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-300 group">
            {/* Car Image */}
            <div className="relative aspect-square bg-white/5">
              {entry.catalog_image_url ? (
                <img 
                  src={entry.catalog_image_url} 
                  alt={entry.title}
                  className="w-full h-full object-cover"
                />
              ) : entry.primary_image_url ? (
                <img 
                  src={entry.primary_image_url} 
                  alt={entry.title}
                  className="w-full h-full object-cover opacity-50"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white/40">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              
              {/* Status Badge */}
              <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium border ${getStockAgeColor(entry.stock_age_days!)}`}>
                {entry.stock_age_days!} days
              </div>
              
              {/* Generation Status */}
              {entry.status === 'ready' && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3">
                <button
                  onClick={() => handleGenerateCatalogImage(entry)}
                  disabled={generatingCarId === entry.car_id}
                  className="flex items-center gap-2 px-4 py-3 bg-green-600/80 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50 text-white font-medium"
                  title={entry.status === 'ready' ? "Regenerate Catalog Image" : "Generate Catalog Image"}
                >
                  {generatingCarId === entry.car_id ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : entry.status === 'ready' ? (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      <span>Regenerate</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
                
                {(entry.catalog_image_url || entry.primary_image_url) && (
                  <button
                    onClick={() => window.open(entry.catalog_image_url || entry.primary_image_url, '_blank')}
                    className="p-3 bg-blue-600/80 hover:bg-blue-600 rounded-lg transition-colors"
                    title="View Image"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Car Details */}
            <div className="p-4">
              <h3 className="font-semibold text-white text-lg leading-tight mb-2">
                {entry.title}
              </h3>
              
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <span className="text-white/50">Stock #:</span>
                  <span className="text-white ml-1">{entry.stock_number}</span>
                </div>
                <div>
                  <span className="text-white/50">Mileage:</span>
                  <span className="text-white ml-1">{entry.current_mileage_km?.toLocaleString() || 'N/A'} km</span>
                </div>
                <div>
                  <span className="text-white/50">Price:</span>
                  <span className="text-white ml-1">AED {entry.advertised_price_aed?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-white/50">Color:</span>
                  <span className="text-white ml-1">{entry.colour}</span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div className={`flex items-center gap-2 text-xs ${getStatusColor(entry.status)}`}>
                  <div className={`w-2 h-2 rounded-full ${entry.status === 'ready' ? 'bg-green-400' : entry.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'}`}></div>
                  {entry.status === 'ready' ? 'Ready for XML' : 
                   entry.status === 'error' ? 'Generation Error' :
                   entry.status === 'generating' ? 'Generating...' : 'Needs Generation'}
                </div>
                
                <div className="text-xs text-white/50">
                  Added {new Date(entry.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12">
          <Car className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Cars in UV Catalog</h3>
          <p className="text-white/60">Cars will appear here when added to inventory</p>
        </div>
      )}
    </div>
  );
} 