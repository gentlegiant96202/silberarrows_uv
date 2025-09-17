"use client";
import { X, Download, FileText, User, Building, Car, Calendar, Clock, ExternalLink, AlertTriangle, Edit, Save, Upload, Trash2, AlertCircle } from 'lucide-react';
import { useState, useRef } from 'react';
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
  const [errors, setErrors] = useState<any>({});
  
  // PDF management states
  const [deletingPdf, setDeletingPdf] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form data for editing
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
    vehicle_colour: '',
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
        vehicle_colour: contract.vehicle_colour || '',
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
    setErrors({});
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrors({});
  };

  const handleInputChange = (field: string, value: string) => {
    // Force uppercase for specific fields
    const uppercaseFields = ['owner_name', 'make', 'model', 'model_year'];
    const processedValue = uppercaseFields.includes(field) ? value.toUpperCase() : value;
    
    setFormData((prev: any) => ({ ...prev, [field]: processedValue }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: null }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      
      // Clean up form data - convert empty strings to null for numeric fields
      const cleanedFormData = {
        ...formData,
        invoice_amount: formData.invoice_amount || null,
        model_year: formData.model_year || null,
        current_odometer: formData.current_odometer || null,
        cut_off_km: formData.cut_off_km || null
      };
      
      const response = await fetch(`/api/service-contracts/${contract.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          action: 'update_contract',
          ...cleanedFormData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update contract');
      }

      const result = await response.json();
      const updatedContract = result.contract; // Extract the contract from the response
      
      console.log('API Response:', result);
      console.log('Updated Contract:', updatedContract);
      console.log('Workflow Status in Updated Contract:', updatedContract?.workflow_status);
      
      // Add formatted dates to the updated contract
      if (updatedContract.start_date) {
        updatedContract.formatted_start_date = new Date(updatedContract.start_date).toLocaleDateString('en-GB');
      }
      if (updatedContract.end_date) {
        updatedContract.formatted_end_date = new Date(updatedContract.end_date).toLocaleDateString('en-GB');
      }
      
      // Update the contract object with new data
      Object.assign(contract, updatedContract);
      
      // Re-initialize form data with updated values to ensure UI reflects changes
      initializeFormData();
      
      setIsEditing(false);
      if (onUpdated) onUpdated(updatedContract);
      
    } catch (error) {
      console.error('Error updating contract:', error);
      alert('Failed to update contract. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // PDF Management Functions
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

  const handleDeletePdf = async () => {
    if (!contract.pdf_url) return;
    
    setDeletingPdf(true);
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`/api/service-contracts/${contract.id}/pdf`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) throw new Error('Failed to delete PDF');

      contract.pdf_url = null;
      if (onUpdated) onUpdated(contract);
      
    } catch (error) {
      console.error('Error deleting PDF:', error);
      alert('Failed to delete PDF. Please try again.');
    } finally {
      setDeletingPdf(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }

    setUploadingPdf(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const formData = new FormData();
      formData.append('pdf', file);

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/service-contracts/${contract.id}/pdf`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload PDF');

      const result = await response.json();
      contract.pdf_url = result.pdf_url;
      if (onUpdated) onUpdated(contract);
      
    } catch (error) {
      console.error('Error uploading PDF:', error);
      alert('Failed to upload PDF. Please try again.');
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const response = await fetch('/api/generate-service-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          referenceNo: contract.reference_no,
          startDate: contract.start_date,
          endDate: contract.end_date,
          ownerName: contract.owner_name,
          mobileNo: contract.mobile_no,
          email: contract.email,
          dealerName: contract.dealer_name,
          dealerPhone: contract.dealer_phone,
          dealerEmail: contract.dealer_email,
          vin: contract.vin,
          make: contract.make,
          model: contract.model,
          modelYear: contract.model_year,
          currentOdometer: contract.current_odometer,
          cutOffKm: contract.cut_off_km,
          invoiceAmount: contract.invoice_amount,
          skipDatabase: true // Skip database operations for existing contracts
        })
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      // The response is a PDF buffer, convert to blob for download
      const blob = await response.blob();
      
      // Download the generated PDF
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
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!isOpen || !contract) return null;

  // Consistent input styling
  const inputClassName = "w-full bg-black/40 border border-white/20 rounded text-white text-[11px] px-2 py-1.5 focus:outline-none focus:border-white/40 transition-colors";
  const inputClassNameRight = "w-full bg-black/40 border border-white/20 rounded text-white text-[11px] px-2 py-1.5 text-right focus:outline-none focus:border-white/40 transition-colors";

  const getStatusColor = (health: string) => {
    switch (health) {
      case 'Active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Expiring Soon':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Expired':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getWorkflowStatusColor = (status: string) => {
    switch (status) {
      case 'card_issued':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'sent_for_signing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'created':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getWorkflowStatusLabel = (status: string) => {
    switch (status) {
      case 'created':
        return 'Created';
      case 'sent_for_signing':
        return 'Sent for Signing';
      case 'card_issued':
        return 'Card Issued';
      default:
        return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-2xl border-2 border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-xl md:max-w-3xl lg:max-w-5xl relative max-h-[95vh] overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-xl leading-none text-white/70 hover:text-white"
        >
          ×
        </button>
        
        <div className="flex items-start justify-between mb-6 pr-8 gap-4 flex-wrap">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-white">
              {isEditing ? 'Edit ServiceCare Agreement' : 'ServiceCare Agreement Details'}
            </h2>
            <div className="text-white/70 text-sm mt-2">
              <span className="text-white/50">Reference:</span> <span className="font-mono font-semibold">{contract.reference_no}</span>
            </div>
          </div>
          <div className="flex gap-1.5 mt-0.5">
            {!isEditing ? (
              <>
                {contract.pdf_url && (
                  <button 
                    onClick={handleDownloadPDF}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all"
                  >
                    Download PDF
                  </button>
                )}
                <button 
                  onClick={handleEdit}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all"
                >
                  Edit
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleCancelEdit}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all disabled:opacity-40"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          <div className="space-y-4 uppercase">
            
            {/* PDF MANAGEMENT SECTION - Only show in edit mode */}
            {isEditing && (
              <div className="border border-white/15 rounded-md p-3 bg-white/5">
                <h3 className="text-white text-[12px] font-bold mb-2 uppercase tracking-wide">Contract Document</h3>
                
                <div className="bg-black/40 border border-white/20 rounded p-2">
                  {contract.pdf_url ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-blue-600/30 rounded border border-blue-500/40">
                          <FileText className="h-3 w-3 text-blue-300" />
                        </div>
                        <div>
                          <p className="text-white text-[11px] font-medium">PDF Available</p>
                          <p className="text-white/60 text-[10px]">Contract document ready</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={handleDownloadPDF}
                          className="flex items-center space-x-1 px-2 py-1 bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/40 rounded text-blue-300 transition-all text-[10px]"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleDeletePdf}
                          disabled={deletingPdf}
                          className="flex items-center space-x-1 px-2 py-1 bg-red-600/30 hover:bg-red-600/40 border border-red-500/40 rounded text-red-300 transition-all disabled:opacity-50 text-[10px]"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>{deletingPdf ? 'Deleting...' : 'Delete'}</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={triggerFileSelect}
                          disabled={uploadingPdf}
                          className="flex items-center space-x-1 px-2 py-1 bg-white/20 hover:bg-white/30 border border-white/30 rounded text-white transition-all disabled:opacity-50 text-[10px]"
                        >
                          <Upload className="h-3 w-3" />
                          <span>{uploadingPdf ? 'Uploading...' : 'Replace'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-amber-600/30 rounded border border-amber-500/40">
                          <AlertCircle className="h-3 w-3 text-amber-300" />
                        </div>
                        <div>
                          <p className="text-white text-[11px] font-medium">No PDF Document</p>
                          <p className="text-white/60 text-[10px]">Generate or upload a PDF</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={handleGeneratePdf}
                          disabled={generatingPdf}
                          className="flex items-center space-x-1 px-2 py-1 bg-green-600/30 hover:bg-green-600/40 border border-green-500/40 rounded text-green-300 transition-all disabled:opacity-50 text-[10px]"
                        >
                          <FileText className="h-3 w-3" />
                          <span>{generatingPdf ? 'Generating...' : 'Generate'}</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={triggerFileSelect}
                          disabled={uploadingPdf}
                          className="flex items-center space-x-1 px-2 py-1 bg-white/20 hover:bg-white/30 border border-white/30 rounded text-white transition-all disabled:opacity-50 text-[10px]"
                        >
                          <Upload className="h-3 w-3" />
                          <span>{uploadingPdf ? 'Uploading...' : 'Upload'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                  
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
            )}

            {/* CONTRACT STATUS */}
            <div className="border border-white/15 rounded-md p-4 bg-white/5">
              <h3 className="text-white text-[13px] font-bold mb-4 uppercase tracking-wide">Contract Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Service Type</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <select
                        value={formData.service_type}
                        onChange={(e) => handleInputChange('service_type', e.target.value)}
                        className={inputClassName}
                      >
                        <option value="standard" className="bg-black text-white">Standard (2 Years)</option>
                        <option value="premium" className="bg-black text-white">Premium (4 Years)</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-medium border ${
                        contract.service_type === 'premium' 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        {contract.service_type === 'premium' ? 'Premium (4 Years)' : 'Standard (2 Years)'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Health Status</label>
                  <div className="text-white text-[12px]">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-medium border ${getStatusColor(contract.contract_health)}`}>
                      {contract.contract_health === 'Expiring Soon' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {contract.contract_health === 'Expired' && <Clock className="h-3 w-3 mr-1" />}
                      {contract.contract_health}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Days Remaining</label>
                  <div className="text-white text-[12px] font-semibold">
                    {contract.contract_health !== 'Expired' ? `${contract.days_until_expiry} days` : '—'}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Workflow Status</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <select
                        value={formData.workflow_status}
                        onChange={(e) => handleInputChange('workflow_status', e.target.value)}
                        className={inputClassName}
                      >
                        <option value="created" className="bg-black text-white">Created</option>
                        <option value="sent_for_signing" className="bg-black text-white">Sent for Signing</option>
                        <option value="card_issued" className="bg-black text-white">Card Issued</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-medium border ${getWorkflowStatusColor(contract.workflow_status)}`}>
                        {getWorkflowStatusLabel(contract.workflow_status)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Created Date</label>
                  <div className="text-white text-[12px] font-semibold">
                    {new Date(contract.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* CUSTOMER INFORMATION */}
            <div className="border border-white/15 rounded-md p-4 bg-white/5">
              <h3 className="text-white text-[13px] font-bold mb-4 uppercase tracking-wide">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Owner's Name</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.owner_name}
                        onChange={(e) => handleInputChange('owner_name', e.target.value)}
                        className={inputClassName}
                        placeholder="Enter customer name"
                      />
                    ) : (
                      <div className="font-semibold">{contract.owner_name || '—'}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Mobile Number</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.mobile_no}
                        onChange={(e) => handleInputChange('mobile_no', e.target.value)}
                        className={inputClassName}
                        placeholder="Enter mobile number"
                      />
                    ) : (
                      <div className="font-semibold">{contract.mobile_no || '—'}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Email Address</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={inputClassName}
                        placeholder="Enter email address"
                      />
                    ) : (
                      <div className="font-semibold">{contract.email || '—'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* VEHICLE INFORMATION */}
            <div className="border border-white/15 rounded-md p-4 bg-white/5">
              <h3 className="text-white text-[13px] font-bold mb-4 uppercase tracking-wide">Vehicle Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">VIN Number</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.vin}
                        onChange={(e) => handleInputChange('vin', e.target.value.toUpperCase())}
                        className={`${inputClassName} font-mono`}
                        placeholder="Enter VIN number"
                      />
                    ) : (
                      <div className="font-mono font-semibold">{contract.vin || '—'}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Make</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.make}
                        onChange={(e) => handleInputChange('make', e.target.value)}
                        className={inputClassName}
                        placeholder="Make"
                      />
                    ) : (
                      <div className="font-semibold">{contract.make || '—'}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Model</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => handleInputChange('model', e.target.value)}
                        className={inputClassName}
                        placeholder="Model"
                      />
                    ) : (
                      <div className="font-semibold">{contract.model || '—'}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Model Year</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="number"
                        min="1980"
                        max="2030"
                        value={formData.model_year}
                        onChange={(e) => handleInputChange('model_year', e.target.value)}
                        className={inputClassName}
                        placeholder="Year"
                      />
                    ) : (
                      <div className="font-semibold">{contract.model_year || '—'}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Current Odometer</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.current_odometer}
                        onChange={(e) => handleInputChange('current_odometer', e.target.value)}
                        className={inputClassName}
                        placeholder="Enter current KM"
                      />
                    ) : (
                      <div className="font-semibold">{contract.current_odometer ? `${contract.current_odometer} KM` : '—'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CONTRACT PERIOD */}
            <div className="border border-white/15 rounded-md p-4 bg-white/5">
              <h3 className="text-white text-[13px] font-bold mb-4 uppercase tracking-wide">Contract Period</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Start Date</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                        className={inputClassName}
                      />
                    ) : (
                      <div className="font-semibold">{contract.formatted_start_date || '—'}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">End Date</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange('end_date', e.target.value)}
                        className={inputClassName}
                      />
                    ) : (
                      <div className="font-semibold">{contract.formatted_end_date || '—'}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Cut-off KM</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.cut_off_km}
                        onChange={(e) => handleInputChange('cut_off_km', e.target.value)}
                        className={inputClassName}
                        placeholder="Enter cut-off KM"
                      />
                    ) : (
                      <div className="font-semibold">{contract.cut_off_km ? `${contract.cut_off_km} KM` : '—'}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Invoice Amount</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.invoice_amount}
                        onChange={(e) => handleInputChange('invoice_amount', e.target.value)}
                        className={inputClassName}
                        placeholder="Enter amount"
                      />
                    ) : (
                      <div className="font-semibold">{contract.invoice_amount ? `AED ${parseFloat(contract.invoice_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gradient-to-r from-amber-900/40 to-black/10 border border-amber-500/20 rounded-xl">
                <p className="text-amber-400 text-xs font-semibold">
                  <strong>Note:</strong> Agreement expires whichever comes first, date or kilometers.
                </p>
              </div>
            </div>

            {/* DEALER INFORMATION */}
            <div className="border border-white/15 rounded-md p-4 bg-white/5">
              <h3 className="text-white text-[13px] font-bold mb-4 uppercase tracking-wide">Dealer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Dealer Name</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.dealer_name}
                        onChange={(e) => handleInputChange('dealer_name', e.target.value)}
                        className={inputClassName}
                        placeholder="Enter dealer name"
                      />
                    ) : (
                      <div className="font-semibold">{contract.dealer_name || '—'}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Phone Number</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.dealer_phone}
                        onChange={(e) => handleInputChange('dealer_phone', e.target.value)}
                        className={inputClassName}
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <div className="font-semibold">{contract.dealer_phone || '—'}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Email Address</label>
                  <div className="text-white text-[12px]">
                    {isEditing ? (
                      <input
                        type="email"
                        value={formData.dealer_email}
                        onChange={(e) => handleInputChange('dealer_email', e.target.value)}
                        className={inputClassName}
                        placeholder="Enter email address"
                      />
                    ) : (
                      <div className="font-semibold">{contract.dealer_email || '—'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
} 