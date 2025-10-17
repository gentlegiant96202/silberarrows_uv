"use client";
import { useUserRole } from '@/lib/useUserRole';
import { useModulePermissions } from '@/lib/useModulePermissions';
import PulsatingLogo from './PulsatingLogo';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Wrench, Shield, AlertCircle, Plus, Settings, FileText, DollarSign, Calendar, Eye, Edit, Trash2, Clock, AlertTriangle, X, ChevronDown, Download, Search } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import ServiceContractModal, { ServiceContractData } from '@/components/modules/service/ServiceContractModal';
import ContractDetailsModal from '@/components/modules/service/ContractDetailsModal';
import ServiceCarePricingCalculator from '@/components/modules/service/ServiceCarePricingCalculator';

interface Contract {
  id: string;
  reference_no: string;
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
  formatted_start_date: string;
  formatted_end_date: string;
  vehicle_info: string;
  pdf_url?: string;
  dealer_name?: string;
  dealer_phone?: string;
  dealer_email?: string;
  sales_executive?: string;
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
  
  // Get user role to check for admin/accounts access
  const { isAdmin, isAccounts, role } = useUserRole();
  
  // Debug logging for role detection
  console.log('🔍 User role debug:', { isAdmin, isAccounts, role, userEmail: user?.email });
  
  const [activeTab, setActiveTab] = useState<'service' | 'warranty'>('service');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [serviceContracts, setServiceContracts] = useState<Contract[]>([]);
  const [warrantyContracts, setWarrantyContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedActiveStatus, setSelectedActiveStatus] = useState<string>('');
  
  // No workflow filter needed for service contracts

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isPricingCalculatorOpen, setIsPricingCalculatorOpen] = useState(false);

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
          type: activeTab,
          // Contract data with new fields (handle empty numeric fields)
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
          model_year: data.modelYear || null,
          current_odometer: data.currentOdometer || null,
          exterior_colour: data.exteriorColour,
          interior_colour: data.interiorColour,
          start_date: data.startDate,
          end_date: data.endDate,
          cut_off_km: data.cutOffKm || null,
          invoice_amount: data.invoiceAmount || null,
          notes: data.notes || null,
          reservation_id: data.reservationId || null
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Show detailed validation errors if available
        if (error.details && Array.isArray(error.details)) {
          throw new Error('Validation failed:\n\n' + error.details.join('\n'));
        } else {
          throw new Error(error.error || 'Failed to create service contract');
        }
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

  // Handle PDF download
  const handleDownloadPDF = async (contract: Contract) => {
    if (!contract.pdf_url) {
      alert('No PDF available for this contract');
      return;
    }

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
      // Fallback: open PDF in new tab
      window.open(contract.pdf_url, '_blank');
    }
  };

  const handleContractUpdated = (updatedContract: Contract) => {
    if (activeTab === 'service') {
      setServiceContracts(prev => {
        const existingIndex = prev.findIndex(contract => contract.id === updatedContract.id);
        if (existingIndex >= 0) {
          // Update existing contract
          return prev.map(contract => 
            contract.id === updatedContract.id ? updatedContract : contract
          );
        } else {
          // Add new contract (for transfers)
          return [updatedContract, ...prev];
        }
      });
    } else {
      setWarrantyContracts(prev => {
        const existingIndex = prev.findIndex(contract => contract.id === updatedContract.id);
        if (existingIndex >= 0) {
          // Update existing contract
          return prev.map(contract => 
            contract.id === updatedContract.id ? updatedContract : contract
          );
        } else {
          // Add new contract (for transfers)
          return [updatedContract, ...prev];
        }
      });
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

  // Calculate days remaining for a contract
  const calculateDaysRemaining = React.useCallback((endDate: string): number => {
    if (!endDate) return 0;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  // Format days remaining text with color coding
  const formatDaysRemaining = React.useCallback((endDate: string): JSX.Element => {
    const daysRemaining = calculateDaysRemaining(endDate);
    let text = '';
    let colorClass = '';

    if (daysRemaining < 0) {
      text = `(${Math.abs(daysRemaining)} days ago)`;
      colorClass = 'text-red-400'; // Expired - red
    } else if (daysRemaining === 0) {
      text = '(expires today)';
      colorClass = 'text-orange-400'; // Today - orange
    } else if (daysRemaining <= 30) {
      text = `(${daysRemaining} days left)`;
      colorClass = 'text-yellow-400'; // Soon - yellow
    } else {
      text = `(${daysRemaining} days left)`;
      colorClass = 'text-green-400'; // Safe - green
    }

    return <span className={colorClass}>{text}</span>;
  }, [calculateDaysRemaining]);

  // Filter contracts based on search term and filters
  const filterContracts = React.useCallback((contracts: Contract[]) => {
    return contracts.filter(contract => {
      // Search term filter
      const matchesSearch = !searchTerm || (
        contract.reference_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.vehicle_info.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.vin.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Status filter
      const matchesStatus = !selectedStatus || contract.workflow_status === selectedStatus;

      // Month filter (based on created_at)
      const matchesMonth = !selectedMonth || (() => {
        const contractDate = new Date(contract.created_at);
        return (contractDate.getMonth() + 1).toString() === selectedMonth;
      })();

      // Year filter (based on created_at)
      const matchesYear = !selectedYear || (() => {
        const contractDate = new Date(contract.created_at);
        return contractDate.getFullYear().toString() === selectedYear;
      })();

      // Active/Expired filter (based on end_date)
      const matchesActiveStatus = !selectedActiveStatus || (() => {
        const daysRemaining = calculateDaysRemaining(contract.end_date);
        if (selectedActiveStatus === 'active') {
          return daysRemaining >= 0; // Active (green/yellow/orange)
        } else if (selectedActiveStatus === 'expired') {
          return daysRemaining < 0; // Expired (red)
        }
        return true;
      })();

      return matchesSearch && matchesStatus && matchesMonth && matchesYear && matchesActiveStatus;
    });
  }, [searchTerm, selectedStatus, selectedMonth, selectedYear, selectedActiveStatus, calculateDaysRemaining]);

  const filteredServiceContracts = React.useMemo(() => 
    filterContracts(serviceContracts), 
    [filterContracts, serviceContracts]
  );
  
  const filteredWarrantyContracts = React.useMemo(() => 
    filterContracts(warrantyContracts), 
    [filterContracts, warrantyContracts]
  );

  // Get available years from contracts
  const availableYears = React.useMemo(() => {
    const allContracts = [...serviceContracts, ...warrantyContracts];
    const years = new Set<number>();
    
    allContracts.forEach(contract => {
      const year = new Date(contract.created_at).getFullYear();
      years.add(year);
    });
    
    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  }, [serviceContracts, warrantyContracts]);

  // Calculate stats (simplified without status complexity)
  const serviceStats = {
    total: serviceContracts.length,
    created: serviceContracts.filter(c => c.workflow_status === 'created').length,
    signing: serviceContracts.filter(c => c.workflow_status === 'sent_for_signing').length,
    issued: serviceContracts.filter(c => c.workflow_status === 'card_issued').length
  };

  const warrantyStats = {
    total: warrantyContracts.length,
    created: warrantyContracts.filter(c => c.workflow_status === 'created').length,
    signing: warrantyContracts.filter(c => c.workflow_status === 'sent_for_signing').length,
    issued: warrantyContracts.filter(c => c.workflow_status === 'card_issued').length
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
            Unable to verify permissions for the Service & Warranty module.
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
    if (contracts.length === 0) {
      return (
        <div className="p-8 text-center">
          <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">
            {(searchTerm || selectedMonth || selectedYear || selectedStatus || selectedActiveStatus)
              ? `No ${type} contracts match your search and filter criteria` 
              : `No ${type} contracts found`}
          </p>
        </div>
      );
    }

    return (
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-white/10">
            <th className="w-32 px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              Reference #
            </th>
            <th className="w-40 px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              Customer
            </th>
            <th className="w-32 px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              Sales Executive
            </th>
            <th className="w-48 px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              Vehicle
            </th>
            <th className="w-28 px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              {type === 'service' ? 'Type' : 'Type'}
            </th>
            <th className="w-36 px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              {type === 'service' ? 'SERVICECARE PERIOD' : 'Warranty Period'}
            </th>
            <th className="w-32 px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              Workflow
            </th>
            <th className="w-24 px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {contracts.map((contract) => (
            <tr key={contract.id} className="hover:bg-white/5 transition-colors">
              <td className="w-32 px-4 py-3">
                {contract.reference_no ? (
                  <span className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs font-mono font-bold">
                    {contract.reference_no}
                  </span>
                ) : (
                  <span className="text-white/40 text-xs">No reference</span>
                )}
                <div className="text-xs text-white/40 mt-1">
                  {new Date(contract.created_at).toLocaleDateString()}
                </div>
              </td>
              <td className="w-40 px-4 py-3">
                <div className="text-white text-sm truncate">{contract.owner_name}</div>
                <div className="text-white/60 text-xs">{contract.mobile_no}</div>
              </td>
              <td className="w-32 px-4 py-3">
                <div className="text-white text-sm truncate">{contract.sales_executive || 'N/A'}</div>
              </td>
              <td className="w-48 px-4 py-3">
                <div className="text-white/80 text-sm truncate">{contract.vehicle_info}</div>
                <div className="text-white/40 text-xs">VIN: {contract.vin.slice(-6)}</div>
              </td>
              <td className="w-28 px-4 py-3">
                {type === 'service' ? (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    contract.service_type === 'premium'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {contract.service_type === 'premium' ? 'Premium' : 'Standard'}
                  </span>
                ) : (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    contract.warranty_type === 'premium'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {contract.warranty_type === 'premium' ? 'Premium' : 'Standard'}
                  </span>
                )}
              </td>
              <td className="w-36 px-4 py-3">
                <div className="text-white/80 text-sm">{contract.formatted_start_date}</div>
                <div className="text-white/60 text-xs">
                  to {contract.formatted_end_date} {formatDaysRemaining(contract.end_date)}
                </div>
              </td>
              <td className="w-32 px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  contract.workflow_status === 'card_issued' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : contract.workflow_status === 'sent_for_signing'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : contract.workflow_status === 'created'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {contract.workflow_status === 'card_issued' ? 'Issued' :
                   contract.workflow_status === 'sent_for_signing' ? 'Sent for Signing' :
                   contract.workflow_status === 'created' ? 'Created' :
                   contract.workflow_status || 'Unknown'}
                </span>
              </td>
              <td className="w-24 px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button 
                    onClick={() => {
                      console.log('🔍 Edit permission debug:', { isAdmin, isAccounts, role, canEditCheck: isAdmin || isAccounts });
                      handleViewContract(contract);
                    }}
                    className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/30 rounded transition-colors"
                    title={(isAdmin || isAccounts) ? "View Details & Edit Contract" : "View Contract Details"}
                  >
                    <Eye className="w-4 h-4 text-blue-300" />
                  </button>
                  
                  {canDelete && (
                    <button 
                      onClick={() => handleDeleteContract(contract)}
                      className="p-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-400/30 rounded transition-colors"
                      title="Delete Contract"
                    >
                      <Trash2 className="w-4 h-4 text-red-300" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="px-4">
      <div
        className="flex flex-col gap-3 pb-4 w-full h-full overflow-hidden"
        style={{ height: "calc(100vh - 72px)" }}
      >
        {/* Fixed Header Section - completely outside scroll area */}
        <div className="flex-shrink-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
          {/* Page Header with Search and Actions */}
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-6">
            <div className="flex-shrink-0">
              <h1 className="text-3xl font-bold text-white mb-2">ServiceCare and Extended Warranty Management</h1>
              <p className="text-white/60">Contract Management System</p>
            </div>
            
            {/* Search and Filters - Flexible width with wrapping support */}
            <div className="flex items-center flex-wrap gap-3 flex-shrink-0">
              {/* Search */}
              <div className="relative flex-shrink-0">
                <Search className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Reference, customer, vehicle..."
                  className="w-64 h-[42px] pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/40"
                />
              </div>

              {/* Month Filter */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-[42px] px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-white/40 flex-shrink-0"
              >
                <option value="" className="bg-gray-900">All Months</option>
                <option value="1" className="bg-gray-900">January</option>
                <option value="2" className="bg-gray-900">February</option>
                <option value="3" className="bg-gray-900">March</option>
                <option value="4" className="bg-gray-900">April</option>
                <option value="5" className="bg-gray-900">May</option>
                <option value="6" className="bg-gray-900">June</option>
                <option value="7" className="bg-gray-900">July</option>
                <option value="8" className="bg-gray-900">August</option>
                <option value="9" className="bg-gray-900">September</option>
                <option value="10" className="bg-gray-900">October</option>
                <option value="11" className="bg-gray-900">November</option>
                <option value="12" className="bg-gray-900">December</option>
              </select>

              {/* Year Filter */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-[42px] px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-white/40 flex-shrink-0"
              >
                <option value="" className="bg-gray-900">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year.toString()} className="bg-gray-900">
                    {year}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-[42px] px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-white/40 flex-shrink-0"
              >
                <option value="" className="bg-gray-900">All Status</option>
                <option value="created" className="bg-gray-900">Created</option>
                <option value="sent_for_signing" className="bg-gray-900">Sent for Signing</option>
                <option value="card_issued" className="bg-gray-900">Card Issued</option>
              </select>

              {/* Active/Expired Filter */}
              <select
                value={selectedActiveStatus}
                onChange={(e) => setSelectedActiveStatus(e.target.value)}
                className="h-[42px] px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-white/40 flex-shrink-0"
              >
                <option value="" className="bg-gray-900">All Contracts</option>
                <option value="active" className="bg-gray-900">🟢 Active</option>
                <option value="expired" className="bg-gray-900">🔴 Expired</option>
              </select>

              {/* Clear Filters Button */}
              {(searchTerm || selectedMonth || selectedYear || selectedStatus || selectedActiveStatus) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedMonth('');
                    setSelectedYear('');
                    setSelectedStatus('');
                    setSelectedActiveStatus('');
                  }}
                  className="h-[42px] px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-red-400 text-sm transition-colors flex items-center gap-2 flex-shrink-0"
                  title="Clear all filters"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}

              {/* PDF Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* ServiceCare Pricing Calculator Button */}
                <button
                  onClick={() => setIsPricingCalculatorOpen(true)}
                  className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-gray-400/20 to-gray-600/20 hover:from-gray-400/30 hover:to-gray-600/30 border border-gray-400/30 rounded text-gray-300 transition-all duration-200"
                  title="ServiceCare Pricing Calculator"
                >
                  <Wrench className="w-5 h-5" />
                </button>

                {/* Warranty PDF Button */}
                <button
                  onClick={() => {}}
                  className="flex items-center justify-center w-10 h-10 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded text-green-400 transition-all duration-200"
                  title="Warranty PDF (Coming Soon)"
                >
                  <Shield className="w-5 h-5" />
                </button>
              </div>

              {/* New Contract Button - Ensure always visible */}
              {canCreate && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  disabled={isCreatingContract}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white transition-all duration-200 disabled:opacity-50 flex-shrink-0 whitespace-nowrap"
                  title="Create new contract"
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span>{isCreatingContract ? 'Creating...' : 'New Contract'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Full Width Tabs */}
          <div className="flex bg-white/5 backdrop-blur border border-white/10 rounded-lg p-1 overflow-hidden">
            <button
              onClick={() => setActiveTab('service')}
              className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'service'
                  ? 'bg-white/20 text-white shadow-lg border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Wrench className="h-5 w-5" />
              <span>ServiceCare</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeTab === 'service' 
                  ? 'bg-black/20 text-white' 
                  : 'bg-white/20 text-white/70'
              }`}>
                {serviceStats.total}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('warranty')}
              className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'warranty'
                  ? 'bg-white/20 text-white shadow-lg border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Shield className="h-5 w-5" />
              <span>Extended Warranty</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeTab === 'warranty' 
                  ? 'bg-black/20 text-white' 
                  : 'bg-white/20 text-white/70'
              }`}>
                {warrantyStats.total}
              </span>
            </button>
          </div>
        </div>

        {/* Fixed Contracts Container - fills remaining viewport */}
        <div className="flex-1 min-w-0 flex flex-col bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/60 mx-auto mb-4"></div>
              <p className="text-white/60">Loading contracts...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto custom-scrollbar">
                <ContractTable 
                  contracts={activeTab === 'service' ? filteredServiceContracts : filteredWarrantyContracts} 
                  type={activeTab} 
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals - Only show if user has appropriate permissions */}
      {canCreate && (
        <ServiceContractModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateContract}
          contractType={activeTab}
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
        canEdit={isAdmin || isAccounts}
      />

      {/* ServiceCare Pricing Calculator Modal */}
      <ServiceCarePricingCalculator
        isOpen={isPricingCalculatorOpen}
        onClose={() => setIsPricingCalculatorOpen(false)}
      />

    </div>
  );
}
