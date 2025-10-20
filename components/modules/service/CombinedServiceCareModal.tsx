'use client';

import React, { useState } from 'react';
import { X, Wrench, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import ServiceContractModal, { ServiceContractData } from './ServiceContractModal';
import DirhamIcon from '@/components/ui/DirhamIcon';

interface PricingData {
  model: string;
  variant: string;
  year: string;
  standard: number;
  premium: number;
}

// Import the same pricing data from ServiceCarePricingCalculator
const PRICING_DATA: PricingData[] = [
  // AMG GT
  { model: 'AMG GT', variant: 'AMG GT/GT63', year: 'N/A', standard: 6100, premium: 16900 },
  { model: 'AMG GT', variant: 'AMG GT 53 4-DR', year: 'N/A', standard: 3800, premium: 11700 },
  { model: 'AMG GT', variant: 'AMG GT 63 4-DR', year: 'N/A', standard: 6100, premium: 16900 },
  
  // A
  { model: 'A', variant: 'A 200 / 250', year: 'N/A', standard: 2900, premium: 8600 },
  { model: 'A', variant: 'A 35 AMG', year: 'N/A', standard: 3700, premium: 10000 },
  { model: 'A', variant: 'A 45 AMG', year: 'N/A', standard: 3700, premium: 10000 },
  
  // C
  { model: 'C', variant: 'C 200', year: 'Up to 2014', standard: 2700, premium: 7600 },
  { model: 'C', variant: 'C 200', year: '2015-2021', standard: 2900, premium: 9000 },
  { model: 'C', variant: 'C 200', year: '2022+', standard: 2900, premium: 9400 },
  { model: 'C', variant: 'C 250', year: 'Up to 2014', standard: 2700, premium: 7600 },
  { model: 'C', variant: 'C 250', year: '2015+', standard: 2900, premium: 9000 },
  { model: 'C', variant: 'C 350', year: 'Up to 2014', standard: 3400, premium: 8800 },
  { model: 'C', variant: 'C 300', year: '2015+', standard: 2900, premium: 9000 },
  { model: 'C', variant: 'C 450', year: 'N/A', standard: 3400, premium: 9400 },
  { model: 'C', variant: 'C 43 AMG (4 CYL)', year: '2022+', standard: 4000, premium: 11600 },
  { model: 'C', variant: 'C 43 AMG (6 CYL)', year: 'Up to 2022', standard: 3700, premium: 11400 },
  { model: 'C', variant: 'C 63 AMG', year: 'Up to 2014', standard: 4500, premium: 11900 },
  { model: 'C', variant: 'C 63 AMG', year: '2015+', standard: 4800, premium: 12600 },
  
  // CLE
  { model: 'CLE', variant: 'CLE 200 / 300', year: 'N/A', standard: 2900, premium: 9400 },
  { model: 'CLE', variant: 'CLE 53', year: 'N/A', standard: 3800, premium: 11700 },
  { model: 'CLE', variant: 'CLE 63', year: 'N/A', standard: 4800, premium: 14000 },
  
  // CLA
  { model: 'CLA', variant: 'CLA 200 / 250', year: 'N/A', standard: 2900, premium: 8600 },
  { model: 'CLA', variant: 'CLA 35 AMG', year: 'N/A', standard: 3700, premium: 10000 },
  { model: 'CLA', variant: 'CLA 45 AMG', year: 'N/A', standard: 3700, premium: 10000 },
  
  // CLS
  { model: 'CLS', variant: 'CLS 350 / 400', year: '2011-2017', standard: 3300, premium: 9200 },
  { model: 'CLS', variant: 'CLS 350', year: '2018+', standard: 2900, premium: 9400 },
  { model: 'CLS', variant: 'CLS 450', year: '2018+', standard: 3300, premium: 10700 },
  { model: 'CLS', variant: 'CLS 53 AMG', year: 'N/A', standard: 4500, premium: 13000 },
  { model: 'CLS', variant: 'CLS 63 AMG', year: '2011-2017', standard: 4800, premium: 12600 },
  
  // E - SEDAN
  { model: 'E - SEDAN', variant: 'E 200', year: '2009-2016', standard: 2800, premium: 7700 },
  { model: 'E - SEDAN', variant: 'E 200', year: '2017-2023', standard: 3000, premium: 9100 },
  { model: 'E - SEDAN', variant: 'E 200', year: '2024+', standard: 3100, premium: 9800 },
  { model: 'E - SEDAN', variant: 'E 300', year: '2016-2023', standard: 3000, premium: 9100 },
  { model: 'E - SEDAN', variant: 'E 300', year: '2024+', standard: 3100, premium: 9100 },
  { model: 'E - SEDAN', variant: 'E 350', year: '2009-2016', standard: 3100, premium: 8800 },
  { model: 'E - SEDAN', variant: 'E 350', year: '2016-2024', standard: 3000, premium: 9100 },
  { model: 'E - SEDAN', variant: 'E 400', year: '2016-2024', standard: 3500, premium: 11000 },
  { model: 'E - SEDAN', variant: 'E 500', year: '2009-2016', standard: 3300, premium: 9500 },
  { model: 'E - SEDAN', variant: 'E 43 AMG', year: 'N/A', standard: 3800, premium: 11700 },
  { model: 'E - SEDAN', variant: 'E 53 AMG', year: 'N/A', standard: 3800, premium: 11700 },
  { model: 'E - SEDAN', variant: 'E 63 AMG', year: 'Up to 2024', standard: 4800, premium: 14000 },
  { model: 'E - SEDAN', variant: 'E 63 AMG', year: '2024+', standard: 4900, premium: 14300 },
  
  // E - COUPE
  { model: 'E - COUPE', variant: 'E 200', year: '2009-2017', standard: 2900, premium: 7900 },
  { model: 'E - COUPE', variant: 'E 200', year: '2017-2023', standard: 3100, premium: 9800 },
  { model: 'E - COUPE', variant: 'E 300', year: '2017-2023', standard: 3100, premium: 9800 },
  { model: 'E - COUPE', variant: 'E 350', year: '2009-2017', standard: 3200, premium: 9600 },
  { model: 'E - COUPE', variant: 'E 400', year: '2017-2023', standard: 3500, premium: 11000 },
  { model: 'E - COUPE', variant: 'E 500', year: '2009-2017', standard: 3200, premium: 9600 },
  { model: 'E - COUPE', variant: 'E 53 AMG', year: 'N/A', standard: 3800, premium: 11700 },
  
  // G
  { model: 'G', variant: 'G 400(d)', year: '2019+', standard: 4300, premium: 13000 },
  { model: 'G', variant: 'G 500 / 550', year: 'Up to 2018', standard: 4000, premium: 11000 },
  { model: 'G', variant: 'G 500 / 550', year: '2019+', standard: 4300, premium: 13000 },
  { model: 'G', variant: 'G 63 AMG', year: 'Up to 2018', standard: 4800, premium: 12500 },
  { model: 'G', variant: 'G 63 AMG', year: '2019+', standard: 5400, premium: 15400 },
  
  // GL / GLS
  { model: 'GL / GLS', variant: 'GLS 450', year: '2019+', standard: 3600, premium: 11300 },
  { model: 'GL / GLS', variant: 'GL 500 / 550', year: '2012-2019', standard: 3600, premium: 11800 },
  { model: 'GL / GLS', variant: 'GLS 500 / 550 / 580', year: '2019+', standard: 3600, premium: 11800 },
  { model: 'GL / GLS', variant: 'GLS 63 AMG', year: '2019+', standard: 4800, premium: 14000 },
  
  // GLA
  { model: 'GLA', variant: 'GLA 200 / 250', year: 'N/A', standard: 2900, premium: 8600 },
  { model: 'GLA', variant: 'GLA 35 AMG', year: 'N/A', standard: 3700, premium: 10000 },
  { model: 'GLA', variant: 'GLA 45 AMG', year: 'N/A', standard: 3700, premium: 10000 },
  
  // GLB
  { model: 'GLB', variant: 'GLB 200 / 250', year: 'N/A', standard: 2900, premium: 8600 },
  { model: 'GLB', variant: 'GLB 35 AMG', year: 'N/A', standard: 3700, premium: 10000 },
  
  // GLC
  { model: 'GLC', variant: 'GLC 200 / 250 / 300', year: 'N/A', standard: 2900, premium: 8600 },
  { model: 'GLC', variant: 'GLC 43 AMG', year: 'N/A', standard: 3700, premium: 11500 },
  { model: 'GLC', variant: 'GLC 53 AMG', year: 'N/A', standard: 4800, premium: 14000 },
  { model: 'GLC', variant: 'GLC 63 AMG', year: 'N/A', standard: 4800, premium: 14000 },
  
  // GLE
  { model: 'GLE', variant: 'GLE 350', year: 'N/A', standard: 3600, premium: 10900 },
  { model: 'GLE', variant: 'GLE 400 / 450', year: 'N/A', standard: 3600, premium: 11300 },
  { model: 'GLE', variant: 'GLE 43 AMG', year: 'N/A', standard: 3900, premium: 11900 },
  { model: 'GLE', variant: 'GLE 53 AMG', year: 'N/A', standard: 3900, premium: 11700 },
  { model: 'GLE', variant: 'GLE 63 AMG', year: 'Up to 2019', standard: 4800, premium: 14000 },
  { model: 'GLE', variant: 'GLE 63 AMG', year: '2020+', standard: 4800, premium: 14000 },
  
  // MAYBACH
  { model: 'MAYBACH', variant: 'S 560', year: '2015-2021', standard: 6500, premium: 15900 },
  { model: 'MAYBACH', variant: 'S 580', year: '2021+', standard: 6500, premium: 17400 },
  { model: 'MAYBACH', variant: 'S 600 / 650', year: '2015-2021', standard: 6500, premium: 15900 },
  { model: 'MAYBACH', variant: 'S 680', year: '2021+', standard: 6500, premium: 17400 },
  
  // ML
  { model: 'ML', variant: 'ML 350 / 400', year: 'N/A', standard: 3600, premium: 11300 },
  { model: 'ML', variant: 'ML 500', year: 'N/A', standard: 3600, premium: 11800 },
  { model: 'ML', variant: 'ML 63', year: 'N/A', standard: 4800, premium: 14000 },
  
  // S
  { model: 'S', variant: 'S 400 / 450', year: '2013-2020', standard: 3800, premium: 11700 },
  { model: 'S', variant: 'S 500 / 550 / 560', year: '2013-2020', standard: 3800, premium: 12000 },
  { model: 'S', variant: 'S 500', year: '2020+', standard: 3800, premium: 11700 },
  { model: 'S', variant: 'S 580', year: '2020+', standard: 3800, premium: 12000 },
  { model: 'S', variant: 'S 600', year: '2013-2020', standard: 4900, premium: 15000 },
  { model: 'S', variant: 'S 63 AMG', year: 'N/A', standard: 4900, premium: 14300 },
  { model: 'S', variant: 'S 65 AMG', year: 'N/A', standard: 5200, premium: 15600 },
  
  // SL
  { model: 'SL', variant: 'SL 400', year: '2012-2020', standard: 4000, premium: 10500 },
  { model: 'SL', variant: 'SL 500', year: '2012-2020', standard: 4500, premium: 12000 },
  { model: 'SL', variant: 'SL 43 AMG', year: '2020+', standard: 4400, premium: 12300 },
  { model: 'SL', variant: 'SL 55 AMG', year: '2020+', standard: 4900, premium: 14400 },
  { model: 'SL', variant: 'SL 63 AMG', year: '2012-2020', standard: 4900, premium: 12900 },
  { model: 'SL', variant: 'SL 65 AMG', year: '2012-2020', standard: 6100, premium: 15700 },
  { model: 'SL', variant: 'SL 63 AMG', year: '2020+', standard: 4900, premium: 14400 },
  
  // SLK / SLC
  { model: 'SLK / SLC', variant: 'SLK 200', year: '2011-2016', standard: 3100, premium: 9800 },
  { model: 'SLK / SLC', variant: 'SLC 200 / 300', year: '2017-2020', standard: 3100, premium: 9800 },
  { model: 'SLK / SLC', variant: 'SLK 350', year: '2011-2016', standard: 3600, premium: 11200 },
  { model: 'SLK / SLC', variant: 'SLC 43', year: '2017-2020', standard: 4100, premium: 12300 },
  { model: 'SLK / SLC', variant: 'SLK 55 AMG', year: '2011-2016', standard: 4700, premium: 13800 },
  
  // SLR & SLS
  { model: 'SLR', variant: 'SLR', year: 'N/A', standard: 0, premium: 44300 },
  { model: 'SLS', variant: 'SLS', year: 'N/A', standard: 6100, premium: 17300 },
  
  // V
  { model: 'V', variant: 'V 200 / 300', year: 'N/A', standard: 4100, premium: 10300 },
  
  // EQ / ELECTRIC
  { model: 'EQ / ELECTRIC', variant: 'EQA', year: 'N/A', standard: 2900, premium: 5800 },
  { model: 'EQ / ELECTRIC', variant: 'EQB', year: 'N/A', standard: 2900, premium: 5800 },
  { model: 'EQ / ELECTRIC', variant: 'EQC', year: 'N/A', standard: 2900, premium: 5800 },
  { model: 'EQ / ELECTRIC', variant: 'EQE', year: 'N/A', standard: 3300, premium: 6600 },
  { model: 'EQ / ELECTRIC', variant: 'EQS', year: 'N/A', standard: 3300, premium: 6600 },
  { model: 'EQ / ELECTRIC', variant: 'EQV', year: 'N/A', standard: 3300, premium: 6600 },
  { model: 'EQ / ELECTRIC', variant: 'EQG', year: 'N/A', standard: 4100, premium: 8600 },
  { model: 'EQ / ELECTRIC', variant: 'CLA', year: 'N/A', standard: 2900, premium: 5800 },
];

// Helper functions
const getModelCategories = (): string[] => {
  const models = [...new Set(PRICING_DATA.map(item => item.model))];
  return models.sort();
};

const getVariantsForModel = (model: string): string[] => {
  const variants = PRICING_DATA
    .filter(item => item.model === model)
    .map(item => item.variant);
  return [...new Set(variants)];
};

const getYearsForVariant = (model: string, variant: string): string[] => {
  const years = PRICING_DATA
    .filter(item => item.model === model && item.variant === variant)
    .map(item => item.year);
  return [...new Set(years)];
};

const getPricing = (model: string, variant: string, year: string): { standard: number; premium: number } | null => {
  const item = PRICING_DATA.find(
    item => item.model === model && item.variant === variant && item.year === year
  );
  return item ? { standard: item.standard, premium: item.premium } : null;
};

interface CombinedServiceCareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractCreated?: (contractData: any) => void;
}

type Step = 'model' | 'variant' | 'year' | 'tier' | 'result' | 'contract';

export default function CombinedServiceCareModal({ isOpen, onClose, onContractCreated }: CombinedServiceCareModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('model');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<'standard' | 'premium' | ''>('');
  const [showContractModal, setShowContractModal] = useState(false);

  const modelCategories = getModelCategories();
  const availableVariants = selectedModel ? getVariantsForModel(selectedModel) : [];
  const availableYears = selectedModel && selectedVariant ? getYearsForVariant(selectedModel, selectedVariant) : [];
  const hasYearOptions = availableYears.length > 0 && !availableYears.includes('N/A');
  const pricing = selectedModel && selectedVariant && (selectedYear || !hasYearOptions) 
    ? getPricing(selectedModel, selectedVariant, selectedYear || 'N/A') 
    : null;

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
    setSelectedVariant('');
    setSelectedYear('');
    setSelectedTier('');
    setCurrentStep('variant');
  };

  const handleVariantSelect = (variant: string) => {
    setSelectedVariant(variant);
    setSelectedYear('');
    setSelectedTier('');
    
    const years = getYearsForVariant(selectedModel, variant);
    if (years.length === 1 && years[0] === 'N/A') {
      setSelectedYear('N/A');
      setCurrentStep('tier');
    } else {
      setCurrentStep('year');
    }
  };

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    setCurrentStep('tier');
  };

  const handleTierSelect = (tier: 'standard' | 'premium') => {
    setSelectedTier(tier);
    setCurrentStep('result');
  };

  const handleContinueToContract = () => {
    setShowContractModal(true);
  };

  const handleBack = () => {
    if (currentStep === 'variant') {
      setCurrentStep('model');
      setSelectedVariant('');
    } else if (currentStep === 'year') {
      setCurrentStep('variant');
      setSelectedYear('');
    } else if (currentStep === 'tier') {
      if (hasYearOptions) {
        setCurrentStep('year');
      } else {
        setCurrentStep('variant');
      }
      setSelectedTier('');
    } else if (currentStep === 'result') {
      setCurrentStep('tier');
    }
  };

  const handleReset = () => {
    setCurrentStep('model');
    setSelectedModel('');
    setSelectedVariant('');
    setSelectedYear('');
    setSelectedTier('');
    setShowContractModal(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleContractSubmit = async (data: ServiceContractData) => {
    try {
      // Submit contract to public API
      const response = await fetch('/api/public/service-contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'service',
          contract_type: 'service',
          reference_no: data.referenceNo,
          service_type: data.serviceType,
          owner_name: data.ownerName,
          mobile_no: data.mobileNo,
          email: data.email,
          customer_id_type: data.customerIdType,
          customer_id_number: data.customerIdNumber,
          dealer_name: data.dealerName,
          dealer_phone: data.dealerPhone,
          dealer_email: data.dealerEmail,
          vin: data.vin,
          make: data.make,
          model: data.model,
          model_year: data.modelYear,
          current_odometer: data.currentOdometer,
          exterior_colour: data.exteriorColour,
          interior_colour: data.interiorColour,
          start_date: data.startDate,
          end_date: data.endDate,
          cut_off_km: data.cutOffKm,
          invoice_amount: data.invoiceAmount,
          notes: data.notes,
          sales_executive: 'Dubizzle Sales Team',
          workflow_status: 'created'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to create contract:', error);
        
        // Show detailed validation errors if available
        if (error.details && Array.isArray(error.details)) {
          alert('Please ensure all required fields are filled:\n\n' + error.details.join('\n'));
        } else {
          alert('Failed to create contract: ' + (error.error || 'Please try again.'));
        }
        return;
      }

      const result = await response.json();
      console.log('✅ Contract created successfully:', result);

      setShowContractModal(false);
      handleReset();
      if (onContractCreated) {
        onContractCreated(result.contract);
      }
    } catch (error) {
      console.error('Error submitting contract:', error);
      alert('Failed to create contract. Please try again.');
    }
  };

  const getStepNumber = (): number => {
    if (currentStep === 'model') return 1;
    if (currentStep === 'variant') return 2;
    if (currentStep === 'year') return hasYearOptions ? 3 : 0;
    if (currentStep === 'tier') return hasYearOptions ? 4 : 3;
    if (currentStep === 'result') return hasYearOptions ? 5 : 4;
    return 1;
  };

  const getTotalSteps = (): number => {
    return hasYearOptions ? 5 : 4;
  };

  if (!isOpen) return null;

  // Show contract modal if we've transitioned to contract creation
  if (showContractModal && pricing && selectedTier) {
    const invoiceAmount = selectedTier === 'standard' ? pricing.standard : pricing.premium;
    
    return (
      <ServiceContractModal
        isOpen={true}
        onClose={() => {
          setShowContractModal(false);
          handleClose();
        }}
        onSubmit={handleContractSubmit}
        contractType="service"
        hideAutoPopulate={true}
        prefilledData={{
          make: 'Mercedes-Benz',
          model: selectedModel,
          variant: selectedVariant,
          year: selectedYear,
          serviceType: selectedTier,
          invoiceAmount: invoiceAmount,
          dealerName: 'SilberArrows',
          dealerPhone: '+971 4 380 5515',
          dealerEmail: 'service@silberarrows.com',
          salesExecutive: 'Dubizzle Sales Team - '
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-neutral-950/95 via-black/95 to-neutral-950/95 backdrop-blur-xl border-2 border-white/30 rounded-xl shadow-[0_0_60px_rgba(255,255,255,0.15)] max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-neutral-950/90 backdrop-blur-lg border-b border-white/20 p-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 border border-white/30 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">ServiceCare Pricing & Contract</h2>
              <p className="text-xs text-gray-400">Step {getStepNumber()} of {getTotalSteps()}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white/30 transition-all duration-300"
              style={{ width: `${(getStepNumber() / getTotalSteps()) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Model Selection */}
          {currentStep === 'model' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Select Model Category</h3>
                <p className="text-sm text-gray-400">Choose the Mercedes-Benz model category</p>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {modelCategories.map((model) => (
                  <button
                    key={model}
                    onClick={() => handleModelSelect(model)}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-left text-white transition-all duration-200 group"
                  >
                    <div className="font-semibold text-sm group-hover:text-gray-300">{model}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Variant Selection */}
          {currentStep === 'variant' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Select Variant</h3>
                <p className="text-sm text-gray-400">Model: <span className="text-white font-medium">{selectedModel}</span></p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableVariants.map((variant) => (
                  <button
                    key={variant}
                    onClick={() => handleVariantSelect(variant)}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-left text-white transition-all duration-200 group"
                  >
                    <div className="font-semibold group-hover:text-gray-300">{variant}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">Back to Model Selection</span>
              </button>
            </div>
          )}

          {/* Step 3: Year Selection (Conditional) */}
          {currentStep === 'year' && hasYearOptions && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Select Year Range</h3>
                <p className="text-sm text-gray-400">
                  Model: <span className="text-white font-medium">{selectedModel}</span> • 
                  Variant: <span className="text-white font-medium">{selectedVariant}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearSelect(year)}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-left text-white transition-all duration-200 group"
                  >
                    <div className="font-semibold group-hover:text-gray-300">{year}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">Back to Variant Selection</span>
              </button>
            </div>
          )}

          {/* Step 4: Tier Selection */}
          {currentStep === 'tier' && pricing && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Select ServiceCare Package</h3>
                <p className="text-sm text-gray-400">
                  {selectedModel} • {selectedVariant}
                  {hasYearOptions && ` • ${selectedYear}`}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Standard Package */}
                <button
                  onClick={() => handleTierSelect('standard')}
                  className="p-6 bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-white/30 rounded-lg text-left transition-all duration-200 group"
                >
                  <div className="mt-12">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-white">Standard</h4>
                        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20">
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">2 Years / 30,000 km</div>
                      <div className="text-2xl font-bold text-white flex items-center gap-2">
                        <DirhamIcon className="w-6 h-6" />
                        <span>{pricing.standard > 0 ? pricing.standard.toLocaleString() : 'N/A'}</span>
                      </div>
                      <div className="pt-3 border-t border-white/10 space-y-2">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Includes:</p>
                        <div className="space-y-1.5">
                          <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-xs text-white/80">Service A (Minor)</p>
                          </div>
                          <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-xs text-white/80">Service B (Major)</p>
                          </div>
                          <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-xs text-white/80">Brake Fluid</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Premium Package */}
                <button
                  onClick={() => handleTierSelect('premium')}
                  className="p-6 bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-white/30 rounded-lg text-left transition-all duration-200 group relative overflow-hidden"
                >
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 bg-white/20 border border-white/30 text-white text-[10px] font-bold rounded uppercase tracking-wide">RECOMMENDED</span>
                  </div>
                  <div className="mt-12">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-white">Premium</h4>
                        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20">
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">4 Years / 60,000 km</div>
                      <div className="text-2xl font-bold text-white flex items-center gap-2">
                        <DirhamIcon className="w-6 h-6" />
                        <span>{pricing.premium.toLocaleString()}</span>
                      </div>
                      <div className="pt-3 border-t border-white/10 space-y-2">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Includes:</p>
                        <div className="space-y-1.5">
                          <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-xs text-white/80">Service A (Minor) x2</p>
                          </div>
                          <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-xs text-white/80">Service B (Major) x2</p>
                          </div>
                          <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-xs text-white/80">Brake Fluid x2</p>
                          </div>
                          <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-xs text-white/80">Coolant</p>
                          </div>
                          <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-xs text-white/80">Spark Plug</p>
                          </div>
                          <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-xs text-white/80">Transmission Oil & Filter</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">Back</span>
              </button>
            </div>
          )}

          {/* Step 5: Result with Continue to Contract */}
          {currentStep === 'result' && pricing && selectedTier && (
            <div className="space-y-8">
              {/* Price Display - Main Focus */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-xl p-8 text-center space-y-4">
                <div className="text-gray-400 text-sm tracking-wider">ServiceCare Price</div>
                <div className="text-6xl font-bold text-white tracking-tight flex items-center justify-center gap-4">
                  <DirhamIcon className="w-14 h-14" />
                  <span>
                    {selectedTier === 'standard' 
                      ? (pricing.standard > 0 ? pricing.standard.toLocaleString() : 'N/A')
                      : pricing.premium.toLocaleString()
                    }
                  </span>
                </div>
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
                  <span className="text-gray-300 font-semibold capitalize">{selectedTier} Package</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-300 font-semibold">{selectedTier === 'standard' ? '2' : '4'} Years Coverage</span>
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Model</div>
                  <div className="text-lg font-bold text-white">{selectedModel}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Variant</div>
                  <div className="text-lg font-bold text-white">{selectedVariant}</div>
                </div>
                {hasYearOptions && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Year Range</div>
                    <div className="text-lg font-bold text-white">{selectedYear}</div>
                  </div>
                )}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Duration</div>
                  <div className="text-lg font-bold text-white">{selectedTier === 'standard' ? '2' : '4'} Years</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white font-semibold transition-all duration-200"
                >
                  Calculate Again
                </button>
                <button
                  onClick={handleContinueToContract}
                  className="flex-1 px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-bold transition-all duration-200 shadow-lg"
                >
                  Continue to Create Contract
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
