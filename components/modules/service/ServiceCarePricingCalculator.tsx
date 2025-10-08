'use client';

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Wrench, Check } from 'lucide-react';

interface PricingData {
  model: string;
  variant: string;
  year: string;
  standard: number;
  premium: number;
}

// Structured pricing data from the provided table
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
  { model: 'C', variant: 'C 300 / 350', year: 'Up to 2014', standard: 3400, premium: 8800 },
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
  { model: 'E - SEDAN', variant: 'E 300', year: '2016-2024', standard: 3000, premium: 9100 },
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
  { model: 'MAYBACH', variant: 'S 560 / 580', year: '2015-2021', standard: 6500, premium: 15900 },
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

// Get unique model categories
const getModelCategories = (): string[] => {
  const models = [...new Set(PRICING_DATA.map(item => item.model))];
  return models.sort();
};

// Get variants for a specific model
const getVariantsForModel = (model: string): string[] => {
  const variants = PRICING_DATA
    .filter(item => item.model === model)
    .map(item => item.variant);
  return [...new Set(variants)];
};

// Get years for a specific model and variant
const getYearsForVariant = (model: string, variant: string): string[] => {
  const years = PRICING_DATA
    .filter(item => item.model === model && item.variant === variant)
    .map(item => item.year);
  return [...new Set(years)];
};

// Get pricing for specific selection
const getPricing = (model: string, variant: string, year: string): { standard: number; premium: number } | null => {
  const item = PRICING_DATA.find(
    item => item.model === model && item.variant === variant && item.year === year
  );
  return item ? { standard: item.standard, premium: item.premium } : null;
};

interface ServiceCarePricingCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'model' | 'variant' | 'year' | 'tier' | 'customer' | 'result';

export default function ServiceCarePricingCalculator({ isOpen, onClose }: ServiceCarePricingCalculatorProps) {
  const [currentStep, setCurrentStep] = useState<Step>('model');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<'standard' | 'premium' | ''>('');
  
  // Customer details state
  const [customerName, setCustomerName] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('+971');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string>('');
  const [quoteSent, setQuoteSent] = useState<boolean>(false);

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
    
    // Check if year selection is needed
    const years = getYearsForVariant(selectedModel, variant);
    if (years.length === 1 && years[0] === 'N/A') {
      // Skip year selection
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
    } else if (currentStep === 'customer') {
      setCurrentStep('result');
      setSendError('');
    }
  };

  const handleReset = () => {
    setCurrentStep('model');
    setSelectedModel('');
    setSelectedVariant('');
    setSelectedYear('');
    setSelectedTier('');
    setCustomerName('');
    setCountryCode('+971');
    setMobileNumber('');
    setIsSending(false);
    setSendError('');
    setQuoteSent(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSendQuote = async () => {
    if (!customerName.trim() || !mobileNumber.trim() || !pricing || !selectedTier) {
      setSendError('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    setSendError('');

    try {
      const response = await fetch('/api/service/send-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          countryCode: countryCode.trim(),
          mobileNumber: mobileNumber.trim(),
          model: selectedModel,
          variant: selectedVariant,
          year: selectedYear || 'N/A',
          tier: selectedTier,
          price: selectedTier === 'standard' ? pricing.standard : pricing.premium,
          duration: selectedTier === 'standard' ? '2 Years' : '4 Years'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send quote');
      }

      console.log('✅ Quote sent successfully:', data);
      
      // Wait 5 seconds for WhatsApp to process and deliver the message
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      setQuoteSent(true);
      setCurrentStep('result');
    } catch (error) {
      console.error('❌ Error sending quote:', error);
      setSendError(error instanceof Error ? error.message : 'Failed to send quote. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const getStepNumber = (): number => {
    if (currentStep === 'model') return 1;
    if (currentStep === 'variant') return 2;
    if (currentStep === 'year') return hasYearOptions ? 3 : 0;
    if (currentStep === 'tier') return hasYearOptions ? 4 : 3;
    if (currentStep === 'result') return hasYearOptions ? 5 : 4;
    if (currentStep === 'customer') return hasYearOptions ? 6 : 5;
    return 1;
  };

  const getTotalSteps = (): number => {
    return hasYearOptions ? 6 : 5;
  };

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
              <h2 className="text-xl font-bold text-white">ServiceCare Pricing Calculator</h2>
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
                  <div className="space-y-4 pt-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-white">Standard</h4>
                      <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">2 Years / 30,000 km</div>
                    <div className="text-2xl font-bold text-white">
                      AED {pricing.standard > 0 ? pricing.standard.toLocaleString() : 'N/A'}
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
                          <p className="text-xs text-white/80">Service B (Major) + Brake Fluid</p>
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
                  <div className="space-y-4 pt-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-white">Premium</h4>
                      <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">4 Years / 60,000 km</div>
                    <div className="text-2xl font-bold text-white">
                      AED {pricing.premium.toLocaleString()}
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
                          <p className="text-xs text-white/80">Service B (Major) + Brake Fluid</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-1 h-1 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                          <p className="text-xs text-white/80">Service A (Minor)</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-1 h-1 bg-white/60 rounded-full mt-1.5 flex-shrink-0"></div>
                          <p className="text-xs text-white/80">Service B + Brake Fluid + Coolant + Spark Plug + Transmission Oil & Filter</p>
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

          {/* Step 5: Result */}
          {currentStep === 'result' && pricing && selectedTier && (
            <div className="space-y-8">
              {quoteSent ? (
                /* Success Confirmation */
                <>
                  {/* Success Icon & Message */}
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-2 border-green-500/30 rounded-xl p-8 text-center space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Check className="w-10 h-10 text-green-400" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white">Quote Sent Successfully!</h3>
                    <p className="text-gray-300">
                      The ServiceCare quote has been sent to <span className="font-semibold text-white">{customerName}</span> via WhatsApp.
                    </p>
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
                      <span className="text-gray-300">Mobile: {countryCode} {mobileNumber}</span>
                    </div>
                  </div>

                  {/* Quote Summary */}
                  <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Quote Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Model</div>
                        <div className="text-sm font-bold text-white">{selectedModel}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Variant</div>
                        <div className="text-sm font-bold text-white">{selectedVariant}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Package</div>
                        <div className="text-sm font-bold text-white capitalize">{selectedTier}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Price</div>
                        <div className="text-sm font-bold text-white">
                          AED {selectedTier === 'standard' 
                            ? (pricing.standard > 0 ? pricing.standard.toLocaleString() : 'N/A')
                            : pricing.premium.toLocaleString()
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-4 pt-4">
                    <button
                      onClick={handleReset}
                      className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white font-semibold transition-all duration-200"
                    >
                      Send Another Quote
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 border border-white/30 rounded-lg text-white font-bold transition-all duration-200 shadow-lg"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                /* Initial Result View */
                <>
                  {/* Price Display - Main Focus */}
                  <div className="bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-xl p-8 text-center space-y-4">
                    <div className="text-gray-400 text-sm uppercase tracking-wider">ServiceCare Price</div>
                    <div className="text-6xl font-bold text-white tracking-tight">
                      AED {selectedTier === 'standard' 
                        ? (pricing.standard > 0 ? pricing.standard.toLocaleString() : 'N/A')
                        : pricing.premium.toLocaleString()
                      }
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
                      onClick={() => setCurrentStep('customer')}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 border border-white/30 rounded-lg text-white font-bold transition-all duration-200 shadow-lg"
                    >
                      Send to Customer
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 6: Customer Details */}
          {currentStep === 'customer' && pricing && selectedTier && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Send Quote to Customer</h3>
                <p className="text-sm text-gray-400">
                  Enter customer details to send the ServiceCare quote via WhatsApp
                </p>
              </div>

              {/* Quote Summary Card */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-400">Quote Summary</div>
                  <div className="text-2xl font-bold text-white">
                    AED {selectedTier === 'standard' 
                      ? (pricing.standard > 0 ? pricing.standard.toLocaleString() : 'N/A')
                      : pricing.premium.toLocaleString()
                    }
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-300">{selectedModel}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-300">{selectedVariant}</span>
                  {hasYearOptions && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-300">{selectedYear}</span>
                    </>
                  )}
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-300 capitalize">{selectedTier} Package</span>
                </div>
              </div>

              {/* Customer Details Form */}
              <div className="space-y-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Customer Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                    disabled={isSending}
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Mobile Number <span className="text-red-400">*</span>
                  </label>
                  <div className="flex space-x-3">
                    {/* Country Code */}
                    <input
                      type="text"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      placeholder="+971"
                      className="w-24 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all text-center"
                      disabled={isSending}
                    />
                    {/* Mobile Number */}
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="50 123 4567"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      disabled={isSending}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Example: +971 50 123 4567
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {sendError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{sendError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <button
                  onClick={handleBack}
                  disabled={isSending}
                  className="flex items-center space-x-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Summary</span>
                </button>
                <button
                  onClick={handleSendQuote}
                  disabled={!customerName.trim() || !mobileNumber.trim() || isSending}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 border border-white/30 rounded-lg text-white font-bold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Sending...</span>
                    </span>
                  ) : (
                    'Send Quote via WhatsApp'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
