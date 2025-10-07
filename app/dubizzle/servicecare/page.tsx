'use client';

import { useState } from 'react';
import { Wrench, Shield, CheckCircle, ArrowRight, Clock, FileText, Star } from 'lucide-react';
import Image from 'next/image';
import CombinedServiceCareModal from '@/components/modules/service/CombinedServiceCareModal';
import ContractSuccessModal from '@/components/modules/service/ContractSuccessModal';

export default function DubizzleServiceCarePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdContract, setCreatedContract] = useState<any>(null);

  const handleContractCreated = (contractData: any) => {
    setCreatedContract(contractData);
    setShowSuccessModal(true);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-black">
      {/* Left Column - Hero Image Section */}
      <div className="relative hidden lg:flex items-center justify-center p-8">
        <div className="absolute inset-0">
          <Image 
            src="/5-2.jpg" 
            alt="Mercedes-Benz luxury vehicle" 
            fill 
            priority 
            sizes="(max-width: 1024px) 0vw, 50vw"
            className="object-cover" 
          />
          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-tr from-gray-900/20 via-transparent to-gray-800/15" />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-lg space-y-8">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <div className="relative inline-block animate-fadeIn">
              <Image
                src="/MAIN LOGO.png"
                alt="SilberArrows Logo"
                width={100}
                height={100}
                className="object-contain mb-4 relative z-10 drop-shadow-2xl"
              />
              {/* Logo glow effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-300/20 to-white/20 blur-xl scale-110 opacity-60"></div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-white leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
              <span className="bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                ServiceCare
              </span>
              <br />
              <span className="text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">Contract Portal</span>
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              Professional ServiceCare contract management for Mercedes-Benz vehicles
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center space-x-3 bg-black/30 backdrop-blur-sm rounded-lg p-3 shadow-2xl">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center shadow-lg">
                <Clock className="w-5 h-5 text-white drop-shadow-lg" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium drop-shadow-lg">Instant Pricing</p>
                <p className="text-sm text-gray-300 drop-shadow-lg">Real-time quotes for all models</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-black/30 backdrop-blur-sm rounded-lg p-3 shadow-2xl">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center shadow-lg">
                <FileText className="w-5 h-5 text-white drop-shadow-lg" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium drop-shadow-lg">Digital Contracts</p>
                <p className="text-sm text-gray-300 drop-shadow-lg">Seamless creation and management</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-black/30 backdrop-blur-sm rounded-lg p-3 shadow-2xl">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center shadow-lg">
                <Star className="w-5 h-5 text-white drop-shadow-lg" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium drop-shadow-lg">Premium Service</p>
                <p className="text-sm text-gray-300 drop-shadow-lg">Up to 4 years coverage</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - CTA & Features Section */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-black relative min-h-screen">
        {/* Subtle silver glow effects */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-400/8 via-gray-400/4 to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-400/8 via-gray-400/4 to-transparent pointer-events-none"></div>
        
        <div className="w-full max-w-xl space-y-8">
          {/* Header for mobile */}
          <div className="lg:hidden text-center mb-8">
            <Image
              src="/MAIN LOGO.png"
              alt="SilberArrows Logo"
              width={80}
              height={80}
              className="object-contain mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-white mb-2">ServiceCare Portal</h1>
            <p className="text-gray-400">Dubizzle Sales Partner</p>
          </div>

          {/* Main CTA Card */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-2 border-white/20 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-white/20 to-white/10 border-2 border-white/30 rounded-2xl shadow-xl mb-2">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">
                Create ServiceCare Contract
              </h2>
              <p className="text-gray-300 text-lg">
                Check pricing and generate contracts in minutes
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="group w-full flex items-center justify-center space-x-3 px-8 py-5 bg-gradient-to-r from-white/15 to-white/10 hover:from-white/25 hover:to-white/15 border-2 border-white/30 hover:border-white/40 rounded-xl text-white font-bold text-lg transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-white/10"
            >
              <Wrench className="w-6 h-6" />
              <span>Start New Contract</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-center text-sm text-gray-400">
              Interactive pricing calculator + contract form in one flow
            </p>
          </div>

          {/* Package Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all relative">
              <div className="space-y-3">
                {/* Invisible spacer to match Premium card's badge space */}
                <div className="h-3"></div>
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-lg">Standard</h3>
                  <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs text-white font-medium">2 Years</span>
                </div>
                <p className="text-sm text-gray-400">Comprehensive service coverage for peace of mind</p>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-gray-500">Starting from</p>
                  <p className="text-2xl font-bold text-white">AED 2,700</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-xl p-6 hover:border-white/30 transition-all relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="px-3 py-1.5 bg-gradient-to-r from-white/25 to-white/15 border border-white/30 rounded-full text-[10px] text-white font-bold uppercase tracking-wide shadow-lg">
                  Recommended
                </span>
              </div>
              <div className="space-y-3">
                <div className="h-3"></div>
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-lg">Premium</h3>
                  <span className="px-3 py-1 bg-white/15 border border-white/25 rounded-full text-xs text-white font-medium">4 Years</span>
                </div>
                <p className="text-sm text-gray-400">Extended protection with enhanced benefits</p>
                <div className="pt-2 border-t border-white/20">
                  <p className="text-xs text-gray-400">Starting from</p>
                  <p className="text-2xl font-bold text-white">AED 5,800</p>
                </div>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="text-white font-semibold text-lg mb-3">What's Included</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">All Mercedes-Benz Models</p>
                  <p className="text-sm text-gray-400">From A-Class to G-Class, including AMG variants</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">Instant Pricing Calculator</p>
                  <p className="text-sm text-gray-400">Accurate quotes based on model, year, and package</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">Direct System Integration</p>
                  <p className="text-sm text-gray-400">Contracts saved directly to SilberArrows portal</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer info */}
          <div className="text-center pt-4 border-t border-white/10">
            <p className="text-sm text-gray-400 mb-1">Dubizzle Sales Partner Portal</p>
            <p className="text-xs text-gray-500">© 2025 SilberArrows. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Combined Modal */}
      <CombinedServiceCareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onContractCreated={handleContractCreated}
      />

      {/* Contract Success Modal */}
      {createdContract && (
        <ContractSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setCreatedContract(null);
          }}
          contractData={createdContract}
        />
      )}
    </div>
  );
}
