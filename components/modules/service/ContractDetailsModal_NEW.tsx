"use client";
import { useState, useRef } from 'react';
import { X, FileText, User, Car, Calendar, Save, Download, Upload, Trash2, AlertCircle, Shield, Eye, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

interface ContractDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: any;
  onUpdated?: (updatedContract: any) => void;
}

export default function ContractDetailsModal({ isOpen, onClose, contract, onUpdated }: ContractDetailsModalProps) {
  const { user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [deletingPdf, setDeletingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form data for editing - matches create modal structure
  const [formData, setFormData] = useState({
    service_type: 'standard' as 'standard' | 'premium',
    owner_name: '',
    mobile_no: '',
    email: '',
    customer_id_type: 'EID' as 'EID' | 'Passport',
    customer_id_number: '',
    dealer_name: '',
    dealer_phone: '',
    dealer_email: '',
    vin: '',
    make: '',
    model: '',
    model_year: '',
    current_odometer: '',
    exterior_colour: '',
    interior_colour: '',
    start_date: '',
    end_date: '',
    cut_off_km: '',
    workflow_status: '',
    invoice_amount: ''
  });

  // Helper function to get authorization headers
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (!user) return { 'Content-Type': 'application/json' };
    
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  };

  // Initialize form data when contract changes or edit mode is enabled
  const initializeFormData = () => {
    if (contract) {
      setFormData({
        service_type: contract.service_type || 'standard',
        owner_name: contract.owner_name || '',
        mobile_no: contract.mobile_no || '',
        email: contract.email || '',
        customer_id_type: contract.customer_id_type || 'EID',
        customer_id_number: contract.customer_id_number || '',
        dealer_name: contract.dealer_name || '',
        dealer_phone: contract.dealer_phone || '',
        dealer_email: contract.dealer_email || '',
        vin: contract.vin || '',
        make: contract.make || '',
        model: contract.model || '',
        model_year: contract.model_year || '',
        current_odometer: contract.current_odometer || '',
        exterior_colour: contract.exterior_colour || '',
        interior_colour: contract.interior_colour || '',
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        cut_off_km: contract.cut_off_km || '',
        workflow_status: contract.workflow_status || 'created',
        invoice_amount: contract.invoice_amount || ''
      });
    }
  };

  const handleEdit = () => {
    initializeFormData();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/service-contracts/${contract.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          action: 'update_contract',
          ...formData,
          type: contract.contract_type || 'service'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (onUpdated) onUpdated(result.contract);
        setIsEditing(false);
        alert('Contract updated successfully!');
      }
    } catch (error) {
      console.error('Error updating contract:', error);
      alert('Failed to update contract.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/service-contracts/${contract.id}/generate-pdf`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: contract.contract_type || 'service'
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `ServiceCare_Agreement_${contract.reference_no}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Refresh contract data
        if (onUpdated) {
          const updatedContract = { ...contract, pdf_url: 'generated' };
          onUpdated(updatedContract);
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!contract.pdf_url) return;
    
    try {
      const response = await fetch(contract.pdf_url);
      if (!response.ok) throw new Error('Failed to fetch PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ServiceCare_Agreement_${contract.reference_no}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      window.open(contract.pdf_url, '_blank');
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('type', contract.contract_type || 'service');

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/service-contracts/${contract.id}/pdf`, {
        method: 'POST',
        headers: {
          'Authorization': headers.Authorization || ''
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (onUpdated) onUpdated(result.contract);
        alert('PDF uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      alert('Failed to upload PDF.');
    } finally {
      setUploadingPdf(false);
    }
  };

  if (!isOpen || !contract) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-2xl border-2 border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-xl md:max-w-3xl lg:max-w-5xl relative max-h-[95vh] overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl leading-none text-white/70 hover:text-white transition-colors duration-200"
        >
          ×
        </button>
        
        <div className="flex items-start justify-between mb-6 pr-8 gap-4 flex-wrap">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-white">
              {contract?.contract_type === 'warranty' ? 'Warranty Agreement' : 'ServiceCare Agreement'}
            </h2>
            <div className="text-white/70 text-sm mt-2">
              <span className="text-white/50">Reference:</span> <span className="font-mono font-semibold">{contract?.reference_no}</span>
            </div>
          </div>
        </div>

        <form className="flex flex-col h-full">
          <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto space-y-6 relative">
            
            {/* WORKFLOW STEPS - INLINE BLACK & SILVER THEME */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* STEP 1: PDF GENERATION */}
              <div className="bg-gradient-to-br from-black/40 via-gray-900/30 to-black/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    contract.pdf_url ? 'bg-white/20 border-white/30' : 'bg-gray-700/50 border-gray-600/50'
                  }`}>
                    <span className={`text-sm font-bold ${contract.pdf_url ? 'text-white' : 'text-gray-400'}`}>1</span>
                  </div>
                  <div>
                    <h3 className={`font-medium ${contract.pdf_url ? 'text-white' : 'text-gray-400'}`}>
                      Generate PDF
                    </h3>
                    {contract.pdf_url && (
                      <span className="text-xs bg-white/10 text-white px-2 py-1 rounded-full border border-white/20">
                        ✓ Generated
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {!contract.pdf_url ? (
                    <button
                      type="button"
                      onClick={handleGeneratePdf}
                      disabled={generatingPdf}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-white text-black font-medium rounded-lg transition-all shadow-lg disabled:opacity-50"
                    >
                      <FileText className="h-4 w-4" />
                      <span>{generatingPdf ? 'Generating...' : 'Generate PDF'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white transition-all"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(contract.pdf_url, '_blank')}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white transition-all"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* STEP 2: DOCUSIGN SIGNING */}
              <div className="bg-gradient-to-br from-black/40 via-gray-900/30 to-black/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    contract.workflow_status === 'sent_for_signing' || contract.workflow_status === 'card_issued'
                      ? 'bg-white/20 border-white/30'
                      : contract.pdf_url 
                        ? 'bg-gray-700/50 border-gray-600/50' 
                        : 'bg-gray-800/50 border-gray-700/50'
                  }`}>
                    <span className={`text-sm font-bold ${
                      contract.workflow_status === 'sent_for_signing' || contract.workflow_status === 'card_issued'
                        ? 'text-white'
                        : contract.pdf_url ? 'text-gray-400' : 'text-gray-500'
                    }`}>2</span>
                  </div>
                  <div>
                    <h3 className={`font-medium ${
                      contract.workflow_status === 'sent_for_signing' || contract.workflow_status === 'card_issued'
                        ? 'text-white'
                        : contract.pdf_url ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Send for Signing
                    </h3>
                    {(contract.workflow_status === 'sent_for_signing' || contract.workflow_status === 'card_issued') && (
                      <span className="text-xs bg-white/10 text-white px-2 py-1 rounded-full border border-white/20">
                        ✓ Sent
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {contract.workflow_status === 'sent_for_signing' || contract.workflow_status === 'card_issued' ? (
                    <>
                      <button
                        type="button"
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white transition-all"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>View in DocuSign</span>
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white transition-all"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download Signed</span>
                      </button>
                    </>
                  ) : contract.pdf_url ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const headers = await getAuthHeaders();
                          const response = await fetch(`/api/service-contracts/${contract.id}`, {
                            method: 'PUT',
                            headers,
                            body: JSON.stringify({
                              action: 'update_contract',
                              workflow_status: 'sent_for_signing',
                              type: contract.contract_type || 'service'
                            })
                          });
                          
                          if (response.ok) {
                            const result = await response.json();
                            if (onUpdated) onUpdated(result.contract);
                            alert('Contract sent for signing!');
                          }
                        } catch (error) {
                          console.error('Error sending for signing:', error);
                          alert('Failed to send for signing.');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-white text-black font-medium rounded-lg transition-all shadow-lg"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Send via DocuSign</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded text-gray-500 cursor-not-allowed"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>PDF Required</span>
                    </button>
                  )}
                </div>
              </div>

              {/* STEP 3: ISSUE CARD */}
              <div className="bg-gradient-to-br from-black/40 via-gray-900/30 to-black/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    contract.workflow_status === 'card_issued'
                      ? 'bg-white/20 border-white/30'
                      : contract.workflow_status === 'sent_for_signing'
                        ? 'bg-gray-700/50 border-gray-600/50' 
                        : 'bg-gray-800/50 border-gray-700/50'
                  }`}>
                    <span className={`text-sm font-bold ${
                      contract.workflow_status === 'card_issued'
                        ? 'text-white'
                        : contract.workflow_status === 'sent_for_signing' ? 'text-gray-400' : 'text-gray-500'
                    }`}>3</span>
                  </div>
                  <div>
                    <h3 className={`font-medium ${
                      contract.workflow_status === 'card_issued'
                        ? 'text-white'
                        : contract.workflow_status === 'sent_for_signing' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Issue Card
                    </h3>
                    {contract.workflow_status === 'card_issued' && (
                      <span className="text-xs bg-white/10 text-white px-2 py-1 rounded-full border border-white/20">
                        ✓ Issued
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {contract.workflow_status === 'card_issued' ? (
                    <>
                      <div className="flex items-center justify-center space-x-2 px-4 py-3 bg-white/10 border border-white/20 rounded text-white">
                        <Shield className="h-4 w-4" />
                        <span>Card Issued ✓</span>
                      </div>
                      <button
                        type="button"
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white transition-all"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download Card</span>
                      </button>
                    </>
                  ) : contract.workflow_status === 'sent_for_signing' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const headers = await getAuthHeaders();
                          const response = await fetch(`/api/service-contracts/${contract.id}`, {
                            method: 'PUT',
                            headers,
                            body: JSON.stringify({
                              action: 'update_contract',
                              workflow_status: 'card_issued',
                              type: contract.contract_type || 'service'
                            })
                          });
                          
                          if (response.ok) {
                            const result = await response.json();
                            if (onUpdated) onUpdated(result.contract);
                            alert('Card issued successfully!');
                          }
                        } catch (error) {
                          console.error('Error issuing card:', error);
                          alert('Failed to issue card.');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-white text-black font-medium rounded-lg transition-all shadow-lg"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Issue Card</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded text-gray-500 cursor-not-allowed"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>Signing Required</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* CUSTOMER INFORMATION - EXACTLY LIKE CREATE MODAL */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                  <span className="text-white text-sm font-bold">4</span>
                </div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Customer Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.owner_name}
                      onChange={(e) => handleInputChange('owner_name', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                      placeholder="Enter customer name"
                    />
                  ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.owner_name}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Mobile Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.mobile_no}
                      onChange={(e) => handleInputChange('mobile_no', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                      placeholder="Mobile number"
                    />
                  ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.mobile_no}
                    </div>
                  )}
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-2">Email Address</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                      placeholder="Enter email address"
                    />
                  ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.email}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* VEHICLE INFORMATION - EXACTLY LIKE CREATE MODAL */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                  <span className="text-white text-sm font-bold">5</span>
                </div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Vehicle Information
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-2">VIN Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) => handleInputChange('vin', e.target.value.toUpperCase())}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 font-mono"
                      placeholder="Enter VIN number"
                    />
                  ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg font-mono">
                      {contract.vin}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Make</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.make}
                      onChange={(e) => handleInputChange('make', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                      placeholder="Vehicle make"
                    />
                  ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.make}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Model</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                      placeholder="Vehicle model"
                    />
                  ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.model}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CONTRACT PERIOD - EXACTLY LIKE CREATE MODAL */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                  <span className="text-white text-sm font-bold">6</span>
                </div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Contract Period
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Start Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    />
                  ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.formatted_start_date}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">End Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    />
                  ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.formatted_end_date}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer with action buttons - EXACTLY LIKE CREATE MODAL */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/15 mt-6 flex-shrink-0">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm rounded transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="px-6 py-2 bg-gradient-to-r from-white to-gray-200 rounded text-black text-sm font-bold hover:from-gray-100 hover:to-white transition-all duration-200 shadow-lg border border-white/30 flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Edit Contract Details
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm rounded transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-white to-gray-200 rounded text-black text-sm font-bold hover:from-gray-100 hover:to-white transition-all duration-200 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed border border-white/30 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border border-black/30 border-t-black rounded-full"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </form>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
