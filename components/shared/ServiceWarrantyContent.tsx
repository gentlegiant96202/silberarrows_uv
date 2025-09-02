"use client";
import { useUserRole } from '@/lib/useUserRole';
import { useModulePermissions } from '@/lib/useModulePermissions';
import PulsatingLogo from './PulsatingLogo';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Wrench, Shield, AlertCircle, Plus, Settings, FileText, DollarSign, Calendar, Eye, Edit, Trash2, Clock, AlertTriangle, X, ChevronDown } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import ServiceContractModal, { ServiceContractData } from '@/components/modules/service/ServiceContractModal';
import ContractDetailsModal from '@/components/modules/service/ContractDetailsModal';

interface Contract {
  id: string;
  reference_no: string;
  status: string;
  workflow_status: string;
  service_type: 'standard' | 'premium';
  owner_name: string;
  mobile_no: string;
  email: string;
  vin: string;
  make: string;
  model: string;
  model_year: string;
  current_odometer: string;
  start_date: string;
  end_date: string;
  cut_off_km?: string;
  coverage_details?: string;
  warranty_type?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  contract_health: string;
  days_until_expiry: number;
  formatted_start_date: string;
  formatted_end_date: string;
  vehicle_info: string;
  pdf_url?: string;
}

interface ServicePageStats {
  totalContracts: number;
  activeContracts: number;
  expiringSoon: number;
  expired: number;
}

export default function ServiceWarrantyContent() {
  const { user } = useAuth();
  
  // Use proper CRUD permissions - remove loading dependencies since RouteProtector handles access
  const { 
    canView, 
    canCreate, 
    canEdit, 
    canDelete 
  } = useModulePermissions('service');
  
  const [activeTab, setActiveTab] = useState<'service' | 'warranty'>('service');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [serviceContracts, setServiceContracts] = useState<Contract[]>([]);
  const [warrantyContracts, setWarrantyContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // No workflow filter needed for service contracts

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

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

  // Fetch contracts from database
  const fetchContracts = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();

      // Fetch service contracts
      const serviceResponse = await fetch('/api/service-contracts?type=service', { headers });
      if (serviceResponse.ok) {
        const serviceData = await serviceResponse.json();
        setServiceContracts(serviceData.contracts || []);
      } else if (serviceResponse.status === 403) {
        console.warn('No permission to view service contracts');
        setServiceContracts([]);
      }

      // Fetch warranty contracts
      const warrantyResponse = await fetch('/api/service-contracts?type=warranty', { headers });
      if (warrantyResponse.ok) {
        const warrantyData = await warrantyResponse.json();
        setWarrantyContracts(warrantyData.contracts || []);
      } else if (warrantyResponse.status === 403) {
        console.warn('No permission to view warranty contracts');
        setWarrantyContracts([]);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView && user) {
      fetchContracts();
    }
  }, [canView, user]);

  const handleCreateContract = async (data: ServiceContractData) => {
    // Check create permission
    if (!canCreate) {
      alert('You do not have permission to create contracts.');
      return;
    }

    setIsCreatingContract(true);
    try {
      // Get authorization headers
      const headers = await getAuthHeaders();
      
      // Create contract in database first (without PDF generation)
      const response = await fetch('/api/service-contracts', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          type: 'service', // or 'warranty' based on your form
          // Contract data
          reference_no: data.referenceNo,
          service_type: data.serviceType,
          owner_name: data.ownerName,
          mobile_no: data.mobileNo,
          email: data.email,
          dealer_name: data.dealerName,
          dealer_phone: data.dealerPhone,
          dealer_email: data.dealerEmail,
          vin: data.vin,
          make: data.make,
          model: data.model,
          model_year: data.modelYear,
          current_odometer: data.currentOdometer,
          start_date: data.startDate,
          end_date: data.endDate,
          cut_off_km: data.cutOffKm,
          invoice_amount: data.invoiceAmount,
          status: 'active'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create service contract');
      }

      const result = await response.json();
      console.log('Service contract created:', result);

      // Refresh contracts list to show the new contract
      await fetchContracts();
      
      // Show success message
      alert(`Contract ${data.referenceNo} created successfully! You can generate the PDF from the edit modal.`);
      
    } catch (error) {
      console.error('Error creating service contract:', error);
      alert('Failed to create service contract. Please try again.');
    } finally {
      setIsCreatingContract(false);
    }
  };

  // Handle contract actions
  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setViewModalOpen(true);
  };

  const handleContractUpdated = (updatedContract: Contract) => {
    if (activeTab === 'service') {
      setServiceContracts(prev => 
        prev.map(contract => 
          contract.id === updatedContract.id ? updatedContract : contract
        )
      );
    } else {
      setWarrantyContracts(prev => 
        prev.map(contract => 
          contract.id === updatedContract.id ? updatedContract : contract
        )
      );
    }
  };



  const handleDeleteContract = async (contract: Contract) => {
    // Check delete permission
    if (!canDelete) {
      alert('You do not have permission to delete contracts.');
      return;
    }

    if (!confirm(`Are you sure you want to delete contract ${contract.reference_no}?\n\nThis action will permanently remove the contract from your active list.`)) {
      return;
    }

    try {
      const contractType = activeTab === 'warranty' ? 'warranty' : 'service';
      const headers = await getAuthHeaders();
      
      // Optimistically remove from local state first for immediate UI feedback
      if (contractType === 'service') {
        setServiceContracts(prev => prev.filter(c => c.id !== contract.id));
      } else {
        setWarrantyContracts(prev => prev.filter(c => c.id !== contract.id));
      }

      const response = await fetch(`/api/service-contracts/${contract.id}?type=${contractType}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        // If API call fails, restore the contract to local state
        if (contractType === 'service') {
          setServiceContracts(prev => [...prev, contract].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ));
        } else {
          setWarrantyContracts(prev => [...prev, contract].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ));
        }
        
        if (response.status === 403) {
          alert('You do not have permission to delete contracts.');
        } else {
          throw new Error('Failed to delete contract');
        }
        return;
      }

      // Success - contract already removed from local state
      console.log(`Contract ${contract.reference_no} deleted successfully`);
      
      // Optional: Show a brief success message without blocking alert
      const successMsg = document.createElement('div');
      successMsg.textContent = `Contract ${contract.reference_no} deleted successfully`;
      successMsg.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
      
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Failed to delete contract. Please try again.');
    }
  };

  const handleSaveContract = async (contractId: string, updatedData: any) => {
    try {
      const contractType = activeTab === 'warranty' ? 'warranty' : 'service';
      const headers = await getAuthHeaders();
      
      const response = await fetch(`/api/service-contracts/${contractId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...updatedData,
          type: contractType,
          action: 'update_details'
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have permission to edit contracts.');
        }
        throw new Error('Failed to update contract');
      }

      // Refresh contracts list
      await fetchContracts();
      console.log('Contract updated successfully');
    } catch (error) {
      console.error('Error updating contract:', error);
      throw error; // Re-throw to be handled by the modal
    }
  };

  // Filter contracts based on search term and status filter
  const filterContracts = (contracts: Contract[]) => {
    return contracts.filter(contract => {
      // Search term filter
      const matchesSearch = !searchTerm || (
        contract.reference_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.vehicle_info.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.vin.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return matchesSearch;
    });
  };

  const filteredServiceContracts = filterContracts(serviceContracts);
  const filteredWarrantyContracts = filterContracts(warrantyContracts);

  // Calculate stats
  const serviceStats = {
    active: serviceContracts.filter(c => c.status === 'active').length,
    expiring: serviceContracts.filter(c => c.contract_health === 'Expiring Soon').length,
    expired: serviceContracts.filter(c => c.contract_health === 'Expired').length,
    total: serviceContracts.length
  };

  const warrantyStats = {
    active: warrantyContracts.filter(c => c.status === 'active').length,
    expiring: warrantyContracts.filter(c => c.contract_health === 'Expiring Soon').length,
    expired: warrantyContracts.filter(c => c.contract_health === 'Expired').length,
    total: warrantyContracts.length
  };

  // Remove loading screen - RouteProtector handles access control
  // Show permission error if there was an error
  if (false) { // Disabled - RouteProtector handles this
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Permission Error</h2>
          <p className="text-gray-400 max-w-md">
            Unable to verify permissions for the Service & Warranty module: {permissionsError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const ContractTable = ({ contracts, type }: { contracts: Contract[], type: 'service' | 'warranty' }) => {
    // No workflow filter needed

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Sticky Header with Workflow Filter */}
          <thead className="sticky top-0 z-10 bg-black/80 backdrop-blur-md">
            <tr className="border-b border-gray-700/50">
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Reference</th>
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Customer</th>
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Vehicle</th>
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Type</th>
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Period</th>
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Workflow</th>
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Actions</th>
            </tr>
          </thead>
          
          {/* Table Body with Alternating Row Colors */}
          <tbody>
            {contracts.map((contract, index) => (
              <tr 
                key={contract.id} 
                className={`border-b border-gray-800/50 hover:bg-gray-700/30 transition-colors ${
                  index % 2 === 0 ? 'bg-gray-900/20' : 'bg-gray-800/20'
                }`}
              >
                <td className="py-4 px-4">
                  <div className="font-medium text-white">{contract.reference_no}</div>
                  <div className="text-sm text-gray-400">
                    {new Date(contract.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="font-medium text-white">{contract.owner_name}</div>
                  <div className="text-sm text-gray-400">{contract.mobile_no}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="font-medium text-white">{contract.vehicle_info}</div>
                  <div className="text-sm text-gray-400">VIN: {contract.vin.slice(-6)}</div>
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    contract.service_type === 'premium' 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {contract.service_type === 'premium' ? 'Premium' : 'Standard'}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm text-white">{contract.formatted_start_date}</div>
                  <div className="text-sm text-gray-400">to {contract.formatted_end_date}</div>
                </td>

                {/* Workflow Status Column */}
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    contract.workflow_status === 'card_issued' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : contract.workflow_status === 'sent_for_signing'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : contract.workflow_status === 'created'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {contract.workflow_status === 'card_issued' ? 'Card Issued' :
                     contract.workflow_status === 'sent_for_signing' ? 'Sent for Signing' :
                     contract.workflow_status === 'created' ? 'Created' :
                     contract.workflow_status || 'Unknown'}
                  </span>
                </td>
                
                {/* Status Column (Contract Health) */}
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      contract.contract_health === 'Active' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : contract.contract_health === 'Expiring Soon'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {contract.contract_health === 'Expiring Soon' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {contract.contract_health === 'Expired' && <Clock className="h-3 w-3 mr-1" />}
                      {contract.contract_health}
                    </span>
                  </div>
                  {contract.contract_health !== 'Expired' && (
                    <div className="text-xs text-gray-400 mt-1">
                      {contract.days_until_expiry} days left
                    </div>
                  )}
                </td>
                

                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    {/* View button - always visible if user can view */}
                    <button 
                      onClick={() => handleViewContract(contract)}
                      className="p-1 hover:bg-gray-700/50 rounded transition-colors group"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4 text-gray-400 group-hover:text-blue-400" />
                    </button>
                    
                    {/* Delete button - only visible if user can delete */}
                    {canDelete && (
                      <button 
                        onClick={() => handleDeleteContract(contract)}
                        className="p-1 hover:bg-gray-700/50 rounded transition-colors group"
                        title="Delete Contract"
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 group-hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {contracts.length === 0 && (
          <div className="text-center py-12">
            <div className={`p-4 bg-gradient-to-br from-gray-800 to-black rounded-xl border border-gray-600/30 w-16 h-16 mx-auto mb-4 flex items-center justify-center`}>
              {type === 'service' ? <Wrench className="h-8 w-8 text-silver-300" /> : <Shield className="h-8 w-8 text-silver-300" />}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No {type} contracts found</h3>
            <p className="text-gray-400 text-sm">
              {searchTerm 
                ? 'No contracts match your search criteria.' 
                : `Start by creating your first ${type} contract.`}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col w-full px-2 py-4 overflow-hidden">
      
      {/* Page Header with Glass Morphism */}
      <div className="mb-4 bg-gradient-to-r from-black/40 via-gray-900/30 to-black/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-4 mx-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-gray-800 to-black rounded-lg border border-gray-600/50">
              <Wrench className="h-8 w-8 text-silver-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Service & Warranty
              </h1>
              <p className="text-gray-400">Contract Management System</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <input
              type="text"
              placeholder="Search contracts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-silver-500 focus:outline-none transition-colors w-64"
            />
            
            {/* New Contract button - only visible if user can create */}
            {canCreate && (
              <button 
                onClick={() => setIsModalOpen(true)}
                disabled={isCreatingContract}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-silver-700 to-gray-800 hover:from-silver-600 hover:to-gray-700 border border-silver-500/50 rounded-lg text-white transition-all duration-200 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>{isCreatingContract ? 'Creating...' : 'New Contract'}</span>
              </button>
            )}
            
            <button className="p-2 bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 border border-gray-600/50 rounded-lg text-gray-300 hover:text-white transition-all duration-200">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation with Glass Morphism */}
      <div className="mb-4 mx-4 flex-shrink-0">
        <div className="flex space-x-1 bg-black/80 backdrop-blur-md border border-gray-800/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('service')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-md font-medium transition-all duration-200 ${
              activeTab === 'service'
                ? 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-black shadow-lg border border-gray-300/50'
                : 'text-gray-400 hover:text-gray-300 hover:bg-black/50'
            }`}
          >
            <Wrench className="h-5 w-5" />
            <span>SERVICE CONTRACTS</span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              activeTab === 'service' 
                ? 'bg-black/20 text-black' 
                : 'bg-gray-700/30 text-gray-300'
            }`}>
              {serviceStats.total}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('warranty')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-md font-medium transition-all duration-200 ${
              activeTab === 'warranty'
                ? 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-black shadow-lg border border-gray-300/50'
                : 'text-gray-400 hover:text-gray-300 hover:bg-black/50'
            }`}
          >
            <Shield className="h-5 w-5" />
            <span>WARRANTY CONTRACTS</span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              activeTab === 'warranty' 
                ? 'bg-black/20 text-black' 
                : 'bg-gray-700/30 text-gray-300'
            }`}>
              {warrantyStats.total}
            </span>
          </button>
        </div>
      </div>

      {/* Content Area - Full Height */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Service Contracts Tab */}
        {activeTab === 'service' && (
          <div className="flex-1 flex flex-col mx-4 overflow-hidden">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 flex-shrink-0">
              {[
                { title: 'Active Contracts', value: serviceStats.active.toString(), icon: FileText, color: 'green' },
                { title: 'Expiring Soon', value: serviceStats.expiring.toString(), icon: AlertTriangle, color: 'amber' },
                { title: 'Expired', value: serviceStats.expired.toString(), icon: Clock, color: 'red' },
                { title: 'Total Contracts', value: serviceStats.total.toString(), icon: Plus, color: 'blue' }
              ].map((stat, index) => (
                <div key={index} className="bg-gradient-to-br from-black/40 via-gray-900/30 to-black/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">{stat.title}</p>
                      <p className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        {stat.value}
                      </p>
                    </div>
                    <div className="p-2 bg-gradient-to-br from-gray-800 to-black rounded-lg border border-gray-600/30">
                      <stat.icon className="h-5 w-5 text-silver-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Service Contracts Table - Full Height */}
            <div className="flex-1 w-full bg-gradient-to-br from-black/40 via-gray-900/30 to-black/60 backdrop-blur-md border border-gray-700/50 rounded-xl overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent flex items-center space-x-2">
                  <Wrench className="h-6 w-6 text-silver-300" />
                  <span>Service Contracts</span>
                </h2>
                <div className="text-gray-400 text-sm">
                  {filteredServiceContracts.length} of {serviceStats.total} contracts
                  {searchTerm && (
                    <span className="text-amber-400 ml-1">(filtered)</span>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-auto custom-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-silver-400"></div>
                    <span className="ml-3 text-gray-400">Loading contracts...</span>
                  </div>
                ) : (
                  <ContractTable contracts={filteredServiceContracts} type="service" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Warranty Contracts Tab */}
        {activeTab === 'warranty' && (
          <div className="flex-1 flex flex-col mx-4 overflow-hidden">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 flex-shrink-0">
              {[
                { title: 'Active Warranties', value: warrantyStats.active.toString(), icon: Shield, color: 'green' },
                { title: 'Expiring Soon', value: warrantyStats.expiring.toString(), icon: AlertTriangle, color: 'amber' },
                { title: 'Expired', value: warrantyStats.expired.toString(), icon: Clock, color: 'red' },
                { title: 'Total Warranties', value: warrantyStats.total.toString(), icon: Plus, color: 'blue' }
              ].map((stat, index) => (
                <div key={index} className="bg-gradient-to-br from-black/40 via-gray-900/30 to-black/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">{stat.title}</p>
                      <p className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        {stat.value}
                      </p>
                    </div>
                    <div className="p-2 bg-gradient-to-br from-gray-800 to-black rounded-lg border border-gray-600/30">
                      <stat.icon className="h-5 w-5 text-silver-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Warranty Contracts Table - Full Height */}
            <div className="flex-1 w-full bg-gradient-to-br from-black/40 via-gray-900/30 to-black/60 backdrop-blur-md border border-gray-700/50 rounded-xl overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-silver-300" />
                  <span>Warranty Contracts</span>
                </h2>
                <div className="text-gray-400 text-sm">
                  {filteredWarrantyContracts.length} of {warrantyStats.total} contracts
                  {searchTerm && (
                    <span className="text-amber-400 ml-1">(filtered)</span>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-auto custom-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-silver-400"></div>
                    <span className="ml-3 text-gray-400">Loading contracts...</span>
                  </div>
                ) : (
                  <ContractTable contracts={filteredWarrantyContracts} type="warranty" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals - Only show if user has appropriate permissions */}
      {canCreate && (
        <ServiceContractModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateContract}
        />
      )}

      <ContractDetailsModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        onUpdated={handleContractUpdated}
      />

    </div>
  );
} 