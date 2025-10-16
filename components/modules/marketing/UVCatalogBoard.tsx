'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Car, Download, Eye, Edit, FileText, Image as ImageIcon, RefreshCw, Plus, Zap, Globe, ExternalLink, Copy, X } from 'lucide-react';
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
    // Use new database domain - always publicly accessible
    const storageBaseUrl = 'https://database.silberarrows.com/storage/v1/object/public/media-files';
    return `${storageBaseUrl}/xml-feeds/facebook-latest.xml`;
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
            created_at,
            status,
            sale_status
          )
        `)
        .eq('cars.status', 'inventory')
        .eq('cars.sale_status', 'available')
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

  const handleRemoveFromCatalog = async (entry: CatalogEntry) => {
    if (!confirm(`Remove "${entry.title}" from UV Catalog?\n\nThis will exclude it from future XML feeds.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('uv_catalog')
        .delete()
        .eq('car_id', entry.car_id);

      if (error) {
        console.error('Error removing from catalog:', error);
        alert('Failed to remove car from catalog');
        return;
      }

      // Refresh the catalog entries
      await fetchEntries();
      alert(`✅ "${entry.title}" removed from UV Catalog!`);

    } catch (error) {
      console.error('Error removing from catalog:', error);
      alert('Failed to remove car from catalog');
    }
  };

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
    if (days <= 30) return 'bg-gray-400/20 text-gray-300 border-gray-400/30';
    if (days <= 60) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    return 'bg-gray-600/20 text-gray-500 border-gray-600/30';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-gray-300';
      case 'generating': return 'text-gray-400';
      case 'error': return 'text-gray-500';
      default: return 'text-gray-500';
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
    <div className="h-full overflow-y-auto bg-gradient-to-br from-black via-gray-900 to-black text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 bg-clip-text text-transparent mb-2">UV Catalog Management</h1>
          <p className="text-gray-400">Generate catalog images and XML feeds for Facebook integration</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Facebook XML Feed URL */}
          <div className="flex items-center gap-2">
            <a 
              href={getFacebookXmlUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-all duration-300"
              title="Facebook-ready XML feed with ready catalog entries"
            >
              <Globe className="w-4 h-4" />
              Facebook XML Feed
              <ExternalLink className="w-3 h-3" />
            </a>
            
            <button
              onClick={copyXmlUrl}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-md hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-all duration-300"
              title="Copy Facebook XML URL"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={handleGenerateAllImages}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-700/50 to-gray-600/50 backdrop-blur-md hover:from-gray-600/50 hover:to-gray-500/50 border border-white/10 rounded-lg text-gray-300 transition-all duration-300 disabled:opacity-50"
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
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-gray-600/50 to-gray-500/50 backdrop-blur-md hover:from-gray-500/50 hover:to-gray-400/50 border border-white/10 rounded-lg text-gray-200 transition-all duration-300 disabled:opacity-50"
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
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-200">{entries.length}</div>
          <div className="text-gray-400 text-sm">Total Cars</div>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold bg-gradient-to-r from-gray-300 to-gray-500 bg-clip-text text-transparent">{entries.filter(e => e.status === 'ready').length}</div>
          <div className="text-gray-400 text-sm">Ready Cards</div>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-300">{entries.filter(e => e.status === 'pending').length}</div>
          <div className="text-gray-400 text-sm">Pending Cards</div>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-300">{entries.filter(e => e.stock_age_days! <= 30).length}</div>
          <div className="text-gray-400 text-sm">New Stock</div>
        </div>
      </div>

      {/* XML Feed URL Display */}
      <div className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-md border border-white/10 rounded-xl p-6 mb-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent mb-2 flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-300" />
            Facebook XML Feed URL
          </h3>
          <p className="text-gray-400 text-sm">
            Use this URL in Facebook Business Manager for automatic car listing updates
          </p>
        </div>

        <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full"></div>
            <h4 className="font-semibold text-gray-300">Facebook Automotive Catalog Feed</h4>
          </div>
          <p className="text-gray-400 text-xs mb-3">
            Facebook-ready cars with completed catalog images • Perfect for Facebook Business Manager
          </p>
          <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-lg p-3 font-mono text-xs mb-3">
            <span className="text-gray-300 break-all">{getFacebookXmlUrl()}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyXmlUrl}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/10 rounded text-gray-300 transition-all duration-300 text-xs"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
            <a 
              href={getFacebookXmlUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-gray-600/30 to-gray-500/30 backdrop-blur-md hover:from-gray-500/30 hover:to-gray-400/30 border border-white/10 rounded text-gray-300 transition-all duration-300 text-xs"
            >
              <ExternalLink className="w-3 h-3" />
              View
            </a>
          </div>
        </div>
      </div>

      {/* Car Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-300 group">
            {/* Car Image */}
            <div className="relative aspect-square bg-black/20">
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
                <div className="flex items-center justify-center h-full text-gray-500">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              
              {/* Status Badge */}
              <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${getStockAgeColor(entry.stock_age_days!)}`}>
                {entry.stock_age_days!} days
              </div>
              
              {/* Generation Status */}
              {entry.status === 'ready' && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3">
                <button
                  onClick={() => handleGenerateCatalogImage(entry)}
                  disabled={generatingCarId === entry.car_id}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-600/80 to-gray-500/80 backdrop-blur-md hover:from-gray-500/80 hover:to-gray-400/80 rounded-lg transition-all duration-300 disabled:opacity-50 text-white font-medium border border-white/10"
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
                
                <div className="flex items-center gap-2">
                  {(entry.catalog_image_url || entry.primary_image_url) && (
                    <button
                      onClick={() => window.open(entry.catalog_image_url || entry.primary_image_url, '_blank')}
                      className="p-3 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-lg transition-all duration-300 border border-white/10"
                      title="View Image"
                    >
                      <Eye className="w-5 h-5 text-gray-300" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleRemoveFromCatalog(entry)}
                    className="p-3 bg-red-500/20 backdrop-blur-md hover:bg-red-500/30 rounded-lg transition-all duration-300 border border-red-400/20 hover:border-red-400/40"
                    title="Remove from Catalog"
                  >
                    <X className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Car Details */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-200 text-lg leading-tight mb-2">
                {entry.title}
              </h3>
              
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Stock #:</span>
                  <span className="text-gray-300 ml-1">{entry.stock_number}</span>
                </div>
                <div>
                  <span className="text-gray-500">Mileage:</span>
                  <span className="text-gray-300 ml-1">{entry.current_mileage_km?.toLocaleString() || 'N/A'} km</span>
                </div>
                <div>
                  <span className="text-gray-500">Price:</span>
                  <span className="text-gray-200 ml-1">AED {entry.advertised_price_aed?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Color:</span>
                  <span className="text-gray-300 ml-1">{entry.colour}</span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div className={`flex items-center gap-2 text-xs ${getStatusColor(entry.status)}`}>
                  <div className={`w-2 h-2 rounded-full ${entry.status === 'ready' ? 'bg-gray-400' : entry.status === 'error' ? 'bg-gray-600' : 'bg-gray-500'}`}></div>
                  {entry.status === 'ready' ? 'Ready for XML' : 
                   entry.status === 'error' ? 'Generation Error' :
                   entry.status === 'generating' ? 'Generating...' : 'Needs Generation'}
                </div>
                
                <div className="text-xs text-gray-500">
                  Added {new Date(entry.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12">
          <Car className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Cars in UV Catalog</h3>
          <p className="text-gray-500">Cars will appear here when added to inventory</p>
        </div>
      )}
    </div>
  );
} 