'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Car, Download, Eye, Edit, FileText, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';


interface InventoryCar {
  id: string;
  stock_number: string;
  model_year: number;
  vehicle_model: string;
  model_family: string | null;
  colour: string;
  interior_colour: string | null;
  chassis_number: string;
  advertised_price_aed: number;
  cost_price_aed: number | null;
  current_mileage_km: number | null;
  current_warranty: string | null;
  current_service: string | null;
  regional_specification: string | null;
  engine: string | null;
  transmission: string | null;
  horsepower_hp: number | null;
  torque_nm: number | null;
  cubic_capacity_cc: number | null;
  number_of_keys: number | null;
  ownership_type: string;
  status: string;
  sale_status: string;
  description: string | null;
  key_equipment: string | null;
  fuel_level: number | null;
  car_location: string | null;
  stock_age_days: number | null;
  created_at: string;
  updated_at: string;
}

interface CarMedia {
  id: string;
  car_id: string;
  url: string;
  kind: string;
  is_primary: boolean;
  sort_order: number;
}

export default function UVCatalogBoard() {
  const [cars, setCars] = useState<InventoryCar[]>([]);
  const [carImages, setCarImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generatingXML, setGeneratingXML] = useState(false);
  const [selectedCar, setSelectedCar] = useState<InventoryCar | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchCars = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all UV inventory cars
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('*')
        .eq('status', 'inventory')
        .eq('sale_status', 'available')
        .order('created_at', { ascending: false });

      if (carsError) {
        console.error('Error fetching cars:', carsError);
        return;
      }

      setCars(carsData || []);

      // Fetch primary images for all cars [[memory:5456998]]
      if (carsData && carsData.length > 0) {
        const carIds = carsData.map(car => car.id);
        const { data: mediaData, error: mediaError } = await supabase
          .from('car_media')
          .select('car_id, url')
          .eq('kind', 'photo')
          .eq('is_primary', true)
          .in('car_id', carIds);

        if (mediaError) {
          console.error('Error fetching car images:', mediaError);
        } else {
          const imageMap: Record<string, string> = {};
          mediaData?.forEach(media => {
            imageMap[media.car_id] = media.url;
          });
          setCarImages(imageMap);
        }
      }
    } catch (error) {
      console.error('Error in fetchCars:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = async () => {
    setRefreshing(true);
    await fetchCars();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  const generateXMLFeed = async () => {
    try {
      setGeneratingXML(true);
      
      const response = await fetch('/api/generate-public-xml-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate XML feed');
      }

      // Get the JSON response with URLs
      const result = await response.json();
      
      if (result.success) {
        // Show success message with public URL
        alert(`XML feed generated successfully!\n\nPublic URL for Facebook: ${result.latestUrl}\n\nDirect URL: ${result.publicUrl}\n\nCars included: ${result.carsCount}`);
        console.log('✅ Public XML feed generated:', result);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error generating XML feed:', error);
      alert('Failed to generate XML feed. Please try again.');
    } finally {
      setGeneratingXML(false);
    }
  };

  const handleEditImage = async (car: InventoryCar) => {
    try {
      setSelectedCar(car);
      
      // Call the catalog image generation API
      const response = await fetch(`/api/generate-catalog-image/${car.id}`, {
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
      
      // Refresh the car data to show the new image
      await refreshData();
      
      alert('Catalog image generated successfully!');
    } catch (error) {
      console.error('Error generating catalog image:', error);
      alert(`Failed to generate catalog image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <Car className="w-12 h-12 text-white/50 mx-auto mb-4 animate-pulse" />
          <p className="text-white/70">Loading UV inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">UV Catalog</h1>
          <p className="text-white/70">
            Manage and export inventory for XML feeds • {cars.length} cars available
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={generateXMLFeed}
            disabled={generatingXML || cars.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingXML ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export XML Feed
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cars Grid */}
      <div className="flex-1 overflow-auto p-6">
        {cars.length === 0 ? (
          <div className="flex items-center justify-center h-[calc(100vh-300px)]">
            <div className="text-center">
              <Car className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No Inventory Cars</h3>
              <p className="text-white/50">There are no cars available in inventory</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cars.map((car) => (
              <div
                key={car.id}
                className="bg-white/5 rounded-xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all duration-200 group"
              >
                {/* Car Image */}
                <div className="relative h-48 bg-white/5">
                  {carImages[car.id] ? (
                    <img
                      src={carImages[car.id]}
                      alt={`${car.model_year} ${car.vehicle_model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="w-12 h-12 text-white/30" />
                    </div>
                  )}
                  
                  {/* Image Actions Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                    {carImages[car.id] && (
                      <button
                        onClick={() => window.open(carImages[car.id], '_blank')}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        title="View Image"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditImage(car)}
                      className="p-2 bg-green-600/80 hover:bg-green-600 rounded-lg transition-colors"
                      title="Generate Catalog Image"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Stock Age Indicator */}
                  {car.stock_age_days && (
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                      car.stock_age_days >= 90 
                        ? 'bg-red-500/90 text-white' 
                        : car.stock_age_days >= 60 
                        ? 'bg-orange-500/90 text-white'
                        : 'bg-green-500/90 text-white'
                    }`}>
                      {car.stock_age_days}d
                    </div>
                  )}
                </div>

                {/* Car Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {car.model_year} {car.vehicle_model}
                      </h3>
                      <p className="text-sm text-white/60">
                        Stock: {car.stock_number}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm text-white/70 mb-3">
                    <div className="flex justify-between">
                      <span>Color:</span>
                      <span className="text-white">{car.colour}</span>
                    </div>
                    {car.current_mileage_km && (
                      <div className="flex justify-between">
                        <span>Mileage:</span>
                        <span className="text-white">{car.current_mileage_km.toLocaleString()} km</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="text-white capitalize">{car.ownership_type}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div>
                      <p className="text-xl font-bold text-green-400">
                        AED {car.advertised_price_aed.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <ImageIcon className="w-4 h-4 text-white/50" />
                      <FileText className="w-4 h-4 text-white/50" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


    </div>
  );
} 