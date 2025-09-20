"use client";
import { useState, useRef, useEffect } from 'react';
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
  const [saved, setSaved] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [deletingPdf, setDeletingPdf] = useState(false);
  
  // DocuSign state (matching vehicle documents)
  const [docusignEnvelopeId, setDocusignEnvelopeId] = useState<string | null>(null);
  const [signingStatus, setSigningStatus] = useState<string>('pending');
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [sendingForSigning, setSendingForSigning] = useState(false);
  const [statusPollingInterval, setStatusPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [companyEmail, setCompanyEmail] = useState('');
  const [showCompanyEmailModal, setShowCompanyEmailModal] = useState(false);
  
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

  // Load DocuSign data when modal opens (matching vehicle documents)
  useEffect(() => {
    if (isOpen && contract) {
      // Initialize DocuSign state from contract data
      setDocusignEnvelopeId(contract.docusign_envelope_id || null);
      setSigningStatus(contract.signing_status || 'pending');
      setSignedPdfUrl(contract.signed_pdf_url || null);

      // Start polling if document is sent but not completed
      if (contract.docusign_envelope_id && 
          contract.signing_status && 
          contract.signing_status !== 'completed' &&
          contract.signing_status !== 'declined') {
        startStatusPolling();
      }
    }
  }, [isOpen, contract]);

  // Cleanup polling on modal close
  useEffect(() => {
    if (!isOpen && statusPollingInterval) {
      console.log('🛑 Stopping DocuSign polling - modal closing');
      clearInterval(statusPollingInterval);
      setStatusPollingInterval(null);
    }
  }, [isOpen, statusPollingInterval]);

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
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          setIsEditing(false);
        }, 1500);
      }
    } catch (error) {
      console.error('Error updating contract:', error);
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
        // Force download the generated PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${contract.contract_type === 'warranty' ? 'Warranty' : 'ServiceCare'}_Agreement_${contract.reference_no}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Refresh contract data from server to get updated PDF URL
        const refreshResponse = await fetch(`/api/service-contracts/${contract.id}`, {
          headers
        });
        
        if (refreshResponse.ok) {
          const refreshedContract = await refreshResponse.json();
          if (onUpdated) onUpdated(refreshedContract);
        } else {
          // Fallback - just mark as having PDF
          if (onUpdated) {
            const updatedContract = { ...contract, pdf_url: 'generated' };
            onUpdated(updatedContract);
          }
        }
        
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
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

  // DocuSign Functions (matching vehicle documents)
  const startStatusPolling = () => {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
    }

    console.log('🔄 Starting DocuSign status polling...');
    
    const interval = setInterval(async () => {
      try {
        if (!docusignEnvelopeId) return;

        const tableName = contract.contract_type === 'warranty' ? 'warranty_contracts' : 'service_contracts';
        const { data: contractData, error } = await supabase
          .from(tableName)
          .select('signing_status, signed_pdf_url, docusign_envelope_id')
          .eq('id', contract.id)
          .not('docusign_envelope_id', 'is', null)
          .single();

        if (error) {
          console.error('Error polling signing status:', error);
          return;
        }

        if (contractData) {
          setSigningStatus(contractData.signing_status);
          
          if (contractData.signed_pdf_url) {
            setSignedPdfUrl(contractData.signed_pdf_url);
          }

          // Stop polling if completed
          if (contractData.signing_status === 'completed') {
            console.log('✅ Contract signing completed!');
            clearInterval(interval);
            setStatusPollingInterval(null);
          }
        }
    } catch (error) {
        console.error('Error during status polling:', error);
      }
    }, 10000); // Poll every 10 seconds

    setStatusPollingInterval(interval);
  };

  const handleSendForSigning = () => {
    if (!contract.pdf_url) {
      alert('Please generate the PDF first before sending for signing.');
      return;
    }

    if (!contract.email) {
      alert('Please add customer email address before sending for signing.');
      return;
    }

    // Open company email modal (matching vehicle documents flow)
    setCompanyEmail('');
    setShowCompanyEmailModal(true);
  };

  const handleConfirmSendForSigning = async () => {
    if (!companyEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail)) {
      alert('Please enter a valid company email address.');
      return;
    }

    setSendingForSigning(true);
    setShowCompanyEmailModal(false);
    
    try {
      console.log('🔄 Sending contract for DocuSign signing...');
      console.log('👤 Company signer:', companyEmail);
      console.log('👤 Customer:', contract.owner_name, contract.email);

      const response = await fetch('/api/docusign/send-for-signing-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          contractType: contract.contract_type || 'service',
          customerEmail: contract.email,
          customerName: contract.owner_name,
          companySignerEmail: companyEmail,
          documentTitle: `${contract.contract_type === 'warranty' ? 'Warranty' : 'ServiceCare'} Agreement`,
          pdfUrl: contract.pdf_url
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send for signing: ${error}`);
      }

      const result = await response.json();
      
      // Update local state
      setDocusignEnvelopeId(result.envelopeId);
      setSigningStatus('sent');
      
      // Start polling for status updates
      startStatusPolling();
      
      console.log('✅ Contract sent for signing:', result.envelopeId);
      
    } catch (error) {
      console.error('❌ Error sending for signing:', error);
      alert('Failed to send contract for signing. Please try again.');
    } finally {
      setSendingForSigning(false);
    }
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
        <div className="absolute top-4 right-4 flex items-center gap-3">
          {isEditing && (
            <select
              value={formData.workflow_status}
              onChange={(e) => handleInputChange('workflow_status', e.target.value)}
              className="h-8 px-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
            >
              <option value="created" className="bg-gray-900">Created</option>
              <option value="sent_for_signing" className="bg-gray-900">Sent for Signing</option>
              <option value="card_issued" className="bg-gray-900">Issued</option>
            </select>
          )}
          
        <button
          onClick={onClose}
            className="text-2xl leading-none text-white/70 hover:text-white transition-colors duration-200"
        >
          ×
        </button>
        </div>
        
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
            
            {/* PDF WORKFLOW WITH DOCUSIGN STATUS - EDIT MODE ONLY */}
            {isEditing && (
              <div className="bg-gradient-to-br from-black/40 via-gray-900/30 to-black/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
                    <span className="text-white text-sm font-bold">1</span>
                        </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-white">Document Management</h3>
                    <div className="text-sm text-white/70 mt-1">
                      Generate, sign, and manage contract documents
                    </div>
                        </div>
                      </div>
                      
                <div className="space-y-3">
                  {/* Generate PDF Button */}
                        <button
                          type="button"
                    onClick={handleGeneratePdf}
                    disabled={generatingPdf}
                    className="w-full h-10 flex items-center justify-center px-4 bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-white text-black text-sm font-medium rounded-lg transition-all shadow-sm disabled:opacity-50"
                        >
                    <span>{generatingPdf ? 'Generating...' : contract.pdf_url ? 'Regenerate PDF' : 'Generate PDF'}</span>
                        </button>
                        
                  {/* DocuSign Status Section (matching vehicle documents) */}
                  {contract.pdf_url && (
                    <div className={`backdrop-blur-sm rounded-lg p-3 border ${
                      signingStatus === 'completed' 
                        ? 'bg-green-500/10 border-green-400/20' 
                        : signingStatus === 'company_signed'
                        ? 'bg-orange-500/10 border-orange-400/20'
                        : signingStatus === 'sent' || signingStatus === 'delivered'
                        ? 'bg-blue-500/10 border-blue-400/20'
                        : 'bg-yellow-500/10 border-yellow-400/20'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            signingStatus === 'completed' 
                              ? 'bg-green-400' 
                              : signingStatus === 'company_signed'
                              ? 'bg-orange-400 animate-pulse'
                              : signingStatus === 'sent' || signingStatus === 'delivered'
                              ? 'bg-blue-400 animate-pulse'
                              : 'bg-yellow-400 animate-pulse'
                          }`}></div>
                          <h3 className={`text-sm font-medium ${
                            signingStatus === 'completed' 
                              ? 'text-green-400' 
                              : signingStatus === 'company_signed'
                              ? 'text-orange-400'
                              : signingStatus === 'sent' || signingStatus === 'delivered'
                              ? 'text-blue-400'
                              : 'text-yellow-400'
                          }`}>
                            {signingStatus === 'completed' ? 'Document Signed & Completed' :
                             signingStatus === 'company_signed' ? 'SilberArrows Signature Completed' :
                             signingStatus === 'sent' ? 'DocuSign Sent for Signing' :
                             signingStatus === 'delivered' ? 'DocuSign Sent for Signing' :
                             `${contract.contract_type === 'warranty' ? 'Warranty' : 'ServiceCare'} Agreement Created`}
                          </h3>
                        </div>
                        <div className="flex gap-2">
                        <button
                          type="button"
                            onClick={() => window.open(signedPdfUrl || contract.pdf_url, '_blank')}
                            className="px-3 py-1.5 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 backdrop-blur-sm border border-gray-600/50 text-gray-200 text-xs rounded transition-all flex items-center gap-1.5 shadow-lg"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View PDF
                        </button>
                        <button
                          type="button"
                            onClick={handleDownloadPDF}
                            className="px-3 py-1.5 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 backdrop-blur-sm border border-gray-500/50 text-gray-100 text-xs rounded transition-all flex items-center gap-1.5 shadow-lg"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download PDF
                        </button>
                          {/* Send for Signing Button */}
                          {contract.email && (signingStatus === 'pending' || signingStatus === 'regenerated') && (
                        <button
                          type="button"
                              onClick={handleSendForSigning}
                              disabled={sendingForSigning}
                              className="px-3 py-1.5 bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 backdrop-blur-sm border border-gray-400/50 text-white text-xs rounded transition-all flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                            >
                              {sendingForSigning ? (
                                <div className="animate-spin w-3 h-3 border border-white/30 border-t-white rounded-full"></div>
                              ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              )}
                              <span>{sendingForSigning ? 'Sending...' : 'Send for Signing'}</span>
                        </button>
                          )}
                      </div>
                    </div>
                      
                      {/* Show envelope ID when signed */}
                      {signingStatus === 'completed' && docusignEnvelopeId && (
                        <div className="text-xs text-green-400/80 mt-2">
                          Envelope ID: {docusignEnvelopeId}
                </div>
                      )}
              </div>
                    )}
                  </div>
                </div>
            )}

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
                  <label className="block text-sm font-medium text-white/80 mb-2">Sales Executive</label>
                  <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-black/20 border border-white/10 rounded-lg">
                    {contract.sales_executive || 'System'}
              </div>
            </div>

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
                
                <div>
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
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">ID Type</label>
                    {isEditing ? (
                      <select
                        value={formData.customer_id_type || 'EID'}
                        onChange={(e) => handleInputChange('customer_id_type', e.target.value)}
                        className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                      >
                        <option value="EID" className="bg-gray-900">Emirates ID</option>
                        <option value="Passport" className="bg-gray-900">Passport</option>
                      </select>
                    ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.customer_id_type || 'EID'}
                </div>
                    )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">ID Number</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.customer_id_number || ''}
                        onChange={(e) => handleInputChange('customer_id_number', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                        placeholder="Enter ID number"
                      />
                    ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.customer_id_number || 'Not provided'}
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
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Model Year</label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1980"
                        max="2030"
                        value={formData.model_year}
                        onChange={(e) => handleInputChange('model_year', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                        placeholder="Year"
                      />
                    ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.model_year}
                    </div>
                    )}
                  </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Current Odometer</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.current_odometer}
                        onChange={(e) => handleInputChange('current_odometer', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                        placeholder="Current mileage"
                      />
                    ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.current_odometer ? `${contract.current_odometer} km` : 'Not provided'}
                    </div>
                    )}
            </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Exterior Colour</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.exterior_colour || ''}
                        onChange={(e) => handleInputChange('exterior_colour', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                        placeholder="Exterior color"
                      />
                    ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.exterior_colour || 'Not provided'}
                  </div>
                    )}
                  </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Interior Colour</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.interior_colour || ''}
                        onChange={(e) => handleInputChange('interior_colour', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                        placeholder="Interior color"
                      />
                    ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.interior_colour || 'Not provided'}
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
                  <label className="block text-sm font-medium text-white/80 mb-2">Service Type</label>
                    {isEditing ? (
                      <select
                        value={formData.service_type || 'standard'}
                        onChange={(e) => {
                          const type = e.target.value as 'standard' | 'premium';
                          const today = new Date();
                          const startDate = today.toISOString().split('T')[0];
                          const endDate = new Date(today.setFullYear(
                            today.getFullYear() + (type === 'premium' ? 4 : 2)
                          )).toISOString().split('T')[0];
                          
                          setFormData(prev => ({
                            ...prev,
                            service_type: type,
                            start_date: startDate,
                            end_date: endDate,
                            cut_off_km: type === 'premium' ? '60000' : '30000'
                          }));
                        }}
                        className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                      >
                        <option value="standard" className="bg-gray-900">Standard (24 Months)</option>
                        <option value="premium" className="bg-gray-900">Premium (48 Months)</option>
                      </select>
                    ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.service_type === 'premium' ? 'Premium (48 Months)' : 'Standard (24 Months)'}
                    </div>
                    )}
                  </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Cut-off Kilometers</label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={formData.cut_off_km}
                        onChange={(e) => handleInputChange('cut_off_km', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                        placeholder="Maximum KM coverage"
                      />
                    ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.cut_off_km ? `${contract.cut_off_km} km` : 'Not provided'}
                    </div>
                    )}
            </div>

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
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Invoice Amount</label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.invoice_amount}
                        onChange={(e) => handleInputChange('invoice_amount', e.target.value)}
                      className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                        placeholder="Amount (AED)"
                      />
                    ) : (
                    <div className="h-[42px] flex items-center text-white text-sm font-semibold px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                      {contract.invoice_amount ? `AED ${parseFloat(contract.invoice_amount).toLocaleString()}` : 'Not provided'}
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          {/* Footer with action buttons - EXACTLY LIKE CREATE MODAL */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/15 mt-6 flex-shrink-0">
            {!isEditing ? (
              <button
                type="button"
                onClick={handleEdit}
                className="px-6 py-2 bg-gradient-to-r from-white to-gray-200 rounded text-black text-sm font-bold hover:from-gray-100 hover:to-white transition-all duration-200 shadow-lg border border-white/30 flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Edit Contract Details
              </button>
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
                  ) : saved ? (
                    <>
                      <div className="w-4 h-4 text-green-600">✓</div>
                      Saved!
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

      {/* Company Email Modal (matching vehicle documents) */}
      {showCompanyEmailModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCompanyEmailModal(false);
            }
          }}
        >
          <div className="bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-2xl border-2 border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowCompanyEmailModal(false)}
              className="absolute top-4 right-4 text-xl leading-none text-white/70 hover:text-white transition-colors duration-200"
            >
              ×
            </button>
            <h3 className="text-xl font-bold text-white mb-4">Company Signer Email</h3>
            <p className="text-white/70 text-sm mb-4">
              Enter the email address of the SilberArrows representative who will sign this contract first.
            </p>
            <input
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              placeholder="company@silberarrows.com"
              className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 mb-6"
            />
            <button
              type="button"
              onClick={handleConfirmSendForSigning}
              disabled={!companyEmail || sendingForSigning}
              className="w-full px-4 py-2 bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-white text-black text-sm font-medium rounded transition-all disabled:opacity-50"
            >
              {sendingForSigning ? 'Sending...' : 'Send for Signing'}
            </button>
        </div>
      </div>
      )}
    </div>
  );
} 
