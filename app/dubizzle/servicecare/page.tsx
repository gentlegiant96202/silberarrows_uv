'use client';

import { useState } from 'react';
import { Wrench, Shield, CheckCircle, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">SilberArrows ServiceCare</h1>
            <p className="text-xs text-gray-400">Sales Portal</p>
          </div>
          <div>
            <img 
              src="/MAIN LOGO.png" 
              alt="SilberArrows Logo" 
              className="h-12 w-auto"
            />
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-white/20 to-white/10 border-2 border-white/30 rounded-2xl shadow-2xl">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-3">
              <h2 className="text-5xl font-bold text-white">
                ServiceCare Contract Portal
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Check pricing and create ServiceCare contracts for Mercedes-Benz vehicles
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-3">
              <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Instant Pricing</h3>
              <p className="text-sm text-gray-400">
                Get accurate ServiceCare pricing for all Mercedes-Benz models with our interactive calculator
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-3">
              <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Two Packages</h3>
              <p className="text-sm text-gray-400">
                Choose between Standard (2 Years) or Premium (4 Years) coverage options
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-3">
              <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Easy Creation</h3>
              <p className="text-sm text-gray-400">
                Create contracts directly in the system with a simple, guided form
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center space-y-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="group inline-flex items-center space-x-3 px-8 py-5 bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-white/30 rounded-xl text-white font-bold text-lg transition-all duration-200 shadow-2xl hover:shadow-white/10"
            >
              <Wrench className="w-6 h-6" />
              <span>Check Pricing & Create Contract</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-sm text-gray-400">
              Complete pricing calculator and contract creation in one flow
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 border-t border-white/10">
            <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-lg p-5 space-y-2">
              <h4 className="text-white font-semibold">Standard Package</h4>
              <p className="text-sm text-gray-400">2 Years coverage with comprehensive service benefits</p>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <CheckCircle className="w-4 h-4" />
                <span>Starting from AED 2,700</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-lg p-5 space-y-2">
              <h4 className="text-white font-semibold flex items-center space-x-2">
                <span>Premium Package</span>
                <span className="px-2 py-0.5 bg-white/20 border border-white/30 rounded text-[10px] uppercase tracking-wide">Recommended</span>
              </h4>
              <p className="text-sm text-gray-400">4 Years coverage with enhanced protection</p>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <CheckCircle className="w-4 h-4" />
                <span>Starting from AED 5,800</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/50 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-sm text-gray-400">
          <p>© 2025 SilberArrows. All rights reserved.</p>
          <p>Dubizzle Sales Partner Portal</p>
        </div>
      </footer>

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
