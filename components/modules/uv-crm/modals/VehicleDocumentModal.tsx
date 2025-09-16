import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';

interface Lead {
  id: string;
  full_name: string;
  phone_number: string;
  model_of_interest: string;
  inventory_car_id?: string;
  // Add other lead properties as needed
}

interface InventoryCar {
  id: string;
  vehicle_model: string;
  model_year: number;
  chassis_number: string;
  colour: string;
  interior_colour?: string;
  current_mileage_km?: number;
  current_warranty?: string;
  current_service?: string;
  advertised_price_aed?: number;
}

interface VehicleDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  mode: 'reservation' | 'invoice';
  lead: Lead;
}

interface FormData {
  // Auto-populated fields
  salesExecutive: string;
  date: string;
  customerName: string;
  contactNo: string;
  
  // Manual input fields
  emailAddress: string;
  customerIdType: 'EID' | 'Passport';
  customerIdNumber: string;
  
  // Vehicle details (auto-populated from inventory)
  makeModel: string;
  modelYear: number;
  chassisNo: string;
  exteriorColour: string;
  interiorColour: string;
  mileage: number;
  manufacturerWarranty: boolean;
  manufacturerWarrantyExpiryDate: string;
  manufacturerWarrantyExpiryMileage: number;
  dealerServicePackage: boolean;
  dealerServicePackageExpiryDate: string;
  dealerServicePackageExpiryMileage: number;
  
  // Part Exchange (optional)
  hasPartExchange: boolean;
  partExchangeMakeModel: string;
  partExchangeModelYear: string;
  partExchangeChassisNo: string;
  partExchangeExteriorColour: string;
  partExchangeEngineNo: string;
  partExchangeMileage: string;
  partExchangeValue: number;
  
  // Add-ons
  extendedWarranty: boolean;
  extendedWarrantyPrice: number;
  ceramicTreatment: boolean;
  ceramicTreatmentPrice: number;
  serviceCare: boolean;
  serviceCarePrice: number;
  windowTints: boolean;
  windowTintsPrice: number;
  
  // Payment
  rtaFees: number;
  vehicleSalePrice: number;
  addOnsTotal: number;
  invoiceTotal: number;
  deposit: number;
  amountDue: number;
  
  // Additional Notes
  additionalNotes: string;
}

export default function VehicleDocumentModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  mode, 
  lead
}: VehicleDocumentModalProps) {
  const { user } = useAuth();
  // Get user's display name
  const getUserDisplayName = () => {
    if (!user) return '';
    
    // First priority: full_name from metadata
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    
    // Second priority: formatted email prefix
    if (user.email) {
      const emailPrefix = user.email.split('@')[0];
      return emailPrefix.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return 'User';
  };

  const [formData, setFormData] = useState<FormData>({
    // Auto-populated
    salesExecutive: getUserDisplayName(),
    date: new Date().toISOString().split('T')[0],
    customerName: lead.full_name,
    contactNo: lead.phone_number,
    
    // Manual input
    emailAddress: '',
    customerIdType: 'EID',
    customerIdNumber: '',
    
    // Vehicle details (will be populated from inventory)
    makeModel: lead.model_of_interest,
    modelYear: 0,
    chassisNo: '',
    exteriorColour: '',
    interiorColour: '',
    mileage: 0,
    manufacturerWarranty: false,
    manufacturerWarrantyExpiryDate: '',
    manufacturerWarrantyExpiryMileage: 0,
    dealerServicePackage: false,
    dealerServicePackageExpiryDate: '',
    dealerServicePackageExpiryMileage: 0,
    
    // Part Exchange
    hasPartExchange: false,
    partExchangeMakeModel: '',
    partExchangeModelYear: '',
    partExchangeChassisNo: '',
    partExchangeExteriorColour: '',
    partExchangeEngineNo: '',
    partExchangeMileage: '',
    partExchangeValue: 0,
    
    // Add-ons
    extendedWarranty: false,
    extendedWarrantyPrice: 0,
    ceramicTreatment: false,
    ceramicTreatmentPrice: 0,
    serviceCare: false,
    serviceCarePrice: 0,
    windowTints: false,
    windowTintsPrice: 0,
    
    // Payment
    rtaFees: 0,
    vehicleSalePrice: 0,
    addOnsTotal: 0,
    invoiceTotal: 0,
    deposit: 0,
    amountDue: 0,
    
    // Additional Notes
    additionalNotes: '',
  });

  const [inventoryCar, setInventoryCar] = useState<InventoryCar | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [documentNumber, setDocumentNumber] = useState<string | null>(null);
  
  // DocuSign state
  const [docusignEnvelopeId, setDocusignEnvelopeId] = useState<string | null>(null);
  const [signingStatus, setSigningStatus] = useState<string>('pending');
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [sendingForSigning, setSendingForSigning] = useState(false);
  const [statusPollingInterval, setStatusPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Company email modal state (matching consignment flow)
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [companyEmail, setCompanyEmail] = useState('');

  // Update sales executive when user changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      salesExecutive: getUserDisplayName()
    }));
  }, [user]);

  // Load inventory car data when modal opens
  useEffect(() => {
    if (isOpen && lead.inventory_car_id) {
      console.log('Loading inventory car for lead:', lead.id, 'car_id:', lead.inventory_car_id);
      loadInventoryCarData();
    } else if (isOpen) {
      console.log('No inventory_car_id found for lead:', lead.id);
    }
  }, [isOpen, lead.inventory_car_id]);

  // Load existing reservation data if editing
  useEffect(() => {
    if (isOpen && lead.id) {
      console.log('🔍 Modal opened for lead:', lead.id, 'Loading existing reservation...');
      loadExistingReservation();
    }
  }, [isOpen, lead.id]);

  // Auto-calculate totals when relevant fields change
  useEffect(() => {
    calculateTotals();
  }, [
    formData.extendedWarrantyPrice,
    formData.ceramicTreatmentPrice, 
    formData.serviceCarePrice,
    formData.windowTintsPrice,
    formData.vehicleSalePrice,
    formData.rtaFees,
    formData.deposit,
    formData.partExchangeValue
  ]);

  // Parse dealer warranty/service data from stored strings
  const parseDealerWarranty = (warrantyString: string) => {
    console.log('Parsing warranty string:', warrantyString);
    
    if (!warrantyString) {
      console.log('No warranty string provided');
      return { hasDealer: false, date: '', km: 0 };
    }

    const lowerString = warrantyString.toLowerCase();
    
    // Check if it's a dealer warranty (including Gargash, Mercedes, BMW, etc.)
    const isDealerWarranty = 
      lowerString.includes('dealer warranty') ||
      lowerString.includes('gargash warranty') ||
      lowerString.includes('mercedes warranty') ||
      lowerString.includes('bmw warranty') ||
      lowerString.includes('audi warranty') ||
      lowerString.includes('manufacturer warranty') ||
      (lowerString.includes('warranty') && !lowerString.includes('silberarrows'));

    if (!isDealerWarranty) {
      console.log('No dealer warranty found in string');
      return { hasDealer: false, date: '', km: 0 };
    }

    // Parse the EXACT format from AddCarModal: "Dealer warranty until 2025-10-08 or 100000 km"
    // Pattern: "until YYYY-MM-DD or NNNNNN km"
    const exactMatch = warrantyString.match(/until\s+(\d{4}-\d{2}-\d{2})\s+or\s+(\d+)\s+km/i);
    
    if (exactMatch) {
      const extractedDate = exactMatch[1];
      const extractedKm = parseInt(exactMatch[2]) || 0;
      console.log('Successfully parsed warranty (exact format):', { date: extractedDate, km: extractedKm });
      return {
        hasDealer: true,
        date: extractedDate,
        km: extractedKm
      };
    }

    // Fallback: Try to extract date and mileage separately for other formats
    const dateMatch = warrantyString.match(/(\d{4})-(\d{2})-(\d{2})/);
    const yearMatch = warrantyString.match(/until\s+(\d{4})/i);
    const mileageMatch = warrantyString.match(/(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?)\s*(?:km|kilometers?|miles?)/i);
    
    let extractedDate = '';
    let extractedKm = 0;

    if (dateMatch) {
      extractedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    } else if (yearMatch) {
      extractedDate = `${yearMatch[1]}-12-31`;
    }

    if (mileageMatch) {
      const cleanMileage = mileageMatch[1].replace(/[,\s]/g, '');
      extractedKm = parseInt(cleanMileage) || 0;
    }

    if (extractedDate || extractedKm > 0) {
      console.log('Successfully parsed warranty (fallback):', { date: extractedDate, km: extractedKm });
      return {
        hasDealer: true,
        date: extractedDate,
        km: extractedKm
      };
    }
    
    console.log('Warranty detected but no date/mileage extracted - enabling manual input');
    return { hasDealer: true, date: '', km: 0 };
  };

  const parseDealerService = (serviceString: string) => {
    console.log('Parsing service string:', serviceString);
    
    if (!serviceString) {
      console.log('No service string provided');
      return { hasDealer: false, date: '', km: 0 };
    }

    const lowerString = serviceString.toLowerCase();
    
    // Check if it's a dealer service (including Gargash, Mercedes, BMW, etc.)
    const isDealerService = 
      lowerString.includes('dealer service') ||
      lowerString.includes('gargash service') ||
      lowerString.includes('mercedes service') ||
      lowerString.includes('bmw service') ||
      lowerString.includes('audi service') ||
      lowerString.includes('manufacturer service') ||
      (lowerString.includes('service') && !lowerString.includes('silberarrows'));

    if (!isDealerService) {
      console.log('No dealer service found in string');
      return { hasDealer: false, date: '', km: 0 };
    }

    // Parse the EXACT format from AddCarModal: "Dealer service package until 2025-10-08 or 100000 km"
    // Pattern: "until YYYY-MM-DD or NNNNNN km"
    const exactMatch = serviceString.match(/until\s+(\d{4}-\d{2}-\d{2})\s+or\s+(\d+)\s+km/i);
    
    if (exactMatch) {
      const extractedDate = exactMatch[1];
      const extractedKm = parseInt(exactMatch[2]) || 0;
      console.log('Successfully parsed service (exact format):', { date: extractedDate, km: extractedKm });
      return {
        hasDealer: true,
        date: extractedDate,
        km: extractedKm
      };
    }

    // Fallback: Try to extract date and mileage separately for other formats
    const dateMatch = serviceString.match(/(\d{4})-(\d{2})-(\d{2})/);
    const yearMatch = serviceString.match(/until\s+(\d{4})/i);
    const mileageMatch = serviceString.match(/(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?)\s*(?:km|kilometers?|miles?)/i);
    
    let extractedDate = '';
    let extractedKm = 0;

    if (dateMatch) {
      extractedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    } else if (yearMatch) {
      extractedDate = `${yearMatch[1]}-12-31`;
    }

    if (mileageMatch) {
      const cleanMileage = mileageMatch[1].replace(/[,\s]/g, '');
      extractedKm = parseInt(cleanMileage) || 0;
    }

    if (extractedDate || extractedKm > 0) {
      console.log('Successfully parsed service (fallback):', { date: extractedDate, km: extractedKm });
      return {
        hasDealer: true,
        date: extractedDate,
        km: extractedKm
      };
    }
    
    console.log('Service detected but no date/mileage extracted - enabling manual input');
    return { hasDealer: true, date: '', km: 0 };
  };

  const loadInventoryCarData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('id', lead.inventory_car_id)
        .single();

      if (error) throw error;

      if (data) {
        setInventoryCar(data);
        console.log('Loaded inventory car data:', data);
        console.log('Raw current_warranty:', JSON.stringify(data.current_warranty));
        console.log('Raw current_service:', JSON.stringify(data.current_service));
        
        // Parse warranty and service data with improved patterns
        const warrantyData = parseDealerWarranty(data.current_warranty || '');
        const serviceData = parseDealerService(data.current_service || '');
        
        console.log('Final warranty data:', warrantyData);
        console.log('Final service data:', serviceData);
        
        // Auto-populate vehicle details
        setFormData(prev => ({
          ...prev,
          makeModel: data.vehicle_model || '',
          modelYear: data.model_year || 0,
          chassisNo: data.chassis_number || '',
          exteriorColour: data.colour || '',
          interiorColour: data.interior_colour || '',
          mileage: data.current_mileage_km || 0,
          
          // Auto-populate dealer warranty if available
          manufacturerWarranty: warrantyData.hasDealer,
          manufacturerWarrantyExpiryDate: warrantyData.date,
          manufacturerWarrantyExpiryMileage: warrantyData.km,
          
          // Auto-populate dealer service if available
          dealerServicePackage: serviceData.hasDealer,
          dealerServicePackageExpiryDate: serviceData.date,
          dealerServicePackageExpiryMileage: serviceData.km,
          
          vehicleSalePrice: data.advertised_price_aed || 0,
        }));
      }
    } catch (error) {
      console.error('Error loading inventory car:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load existing reservation data if editing
  const loadExistingReservation = async () => {
    try {
      console.log('🔍 Searching for existing reservation for lead_id:', lead.id);
          const { data: existingReservation, error } = await supabase
      .from('vehicle_reservations')
      .select('*, document_number')
      .eq('lead_id', lead.id)
      .maybeSingle();
        
      console.log('🔍 Query result:', { data: existingReservation, error });
      if (error) {
        console.error('🔍 Database error details:', error);
      }
        
      if (existingReservation) {
        console.log('Loading existing reservation data:', existingReservation);
        console.log('Available fields:', Object.keys(existingReservation));
        setIsEditing(true);
        
        // Set PDF URL if it exists AND matches the current mode
        if (existingReservation.pdf_url && existingReservation.document_type === mode) {
          setGeneratedPdfUrl(existingReservation.pdf_url);
          setPdfGenerated(true);
        } else if (existingReservation.pdf_url && existingReservation.document_type !== mode) {
          // PDF exists but for different document type, so don't show as generated
          console.log(`PDF exists for ${existingReservation.document_type} but modal is in ${mode} mode`);
          setPdfGenerated(false);
          setGeneratedPdfUrl(null);
        }
        
        // Set document number for display in modal
        if (existingReservation.document_number) {
          console.log('Document number:', existingReservation.document_number);
          setDocumentNumber(existingReservation.document_number);
        } else if (mode === 'invoice' && existingReservation.document_type === 'reservation') {
          // If opening in invoice mode but record is still a reservation, 
          // we'll convert it and get an invoice number when form is submitted
          console.log('Will convert reservation to invoice and generate INV number on submit');
        }
        
        setFormData(prev => ({
          ...prev,
          salesExecutive: existingReservation.sales_executive || prev.salesExecutive,
          date: existingReservation.document_date || prev.date,
          customerName: existingReservation.customer_name || prev.customerName,
          contactNo: existingReservation.contact_no || prev.contactNo,
          emailAddress: existingReservation.email_address || prev.emailAddress,
          customerIdType: existingReservation.customer_id_type || prev.customerIdType,
          customerIdNumber: existingReservation.customer_id_number || prev.customerIdNumber,
          makeModel: existingReservation.vehicle_make_model || prev.makeModel,
          modelYear: existingReservation.model_year || prev.modelYear,
          chassisNo: existingReservation.chassis_no || prev.chassisNo,
          exteriorColour: existingReservation.vehicle_exterior_colour || existingReservation.vehicle_colour || prev.exteriorColour,
          interiorColour: existingReservation.vehicle_interior_colour || prev.interiorColour,
          mileage: existingReservation.vehicle_mileage || prev.mileage,
          manufacturerWarranty: existingReservation.manufacturer_warranty || false,
          manufacturerWarrantyExpiryDate: existingReservation.manufacturer_warranty_expiry_date || '',
          manufacturerWarrantyExpiryMileage: existingReservation.manufacturer_warranty_expiry_mileage || 0,
          dealerServicePackage: existingReservation.dealer_service_package || false,
          dealerServicePackageExpiryDate: existingReservation.dealer_service_package_expiry_date || '',
          dealerServicePackageExpiryMileage: existingReservation.dealer_service_package_expiry_mileage || 0,
          hasPartExchange: existingReservation.has_part_exchange || false,
          partExchangeMakeModel: existingReservation.part_exchange_make_model || '',
          partExchangeModelYear: existingReservation.part_exchange_model_year || '',
          partExchangeChassisNo: existingReservation.part_exchange_chassis_no || '',
          partExchangeExteriorColour: existingReservation.part_exchange_exterior_colour || existingReservation.part_exchange_colour || '',
          partExchangeEngineNo: existingReservation.part_exchange_engine_no || '',
          partExchangeMileage: existingReservation.part_exchange_mileage || '',
          partExchangeValue: existingReservation.part_exchange_value || 0,
          extendedWarranty: existingReservation.extended_warranty || false,
          extendedWarrantyPrice: existingReservation.extended_warranty_price || 0,
          ceramicTreatment: existingReservation.ceramic_treatment || false,
          ceramicTreatmentPrice: existingReservation.ceramic_treatment_price || 0,
          serviceCare: existingReservation.service_care || false,
          serviceCarePrice: existingReservation.service_care_price || 0,
          windowTints: existingReservation.window_tints || false,
          windowTintsPrice: existingReservation.window_tints_price || 0,
          rtaFees: existingReservation.rta_fees || 0,
          vehicleSalePrice: existingReservation.vehicle_sale_price || 0,
          addOnsTotal: existingReservation.add_ons_total || 0,
          invoiceTotal: existingReservation.invoice_total || 0,
          deposit: existingReservation.deposit || 0,
          amountDue: existingReservation.amount_due || 0,
          additionalNotes: existingReservation.additional_notes || ''
        }));
        console.log('Form data updated with existing reservation');
      }
    } catch (error) {
      console.log('No existing reservation found or error loading:', error);
      setIsEditing(false);
    }
  };

  const calculateTotals = () => {
    const addOnsTotal = 
      (formData.extendedWarranty ? formData.extendedWarrantyPrice : 0) +
      (formData.ceramicTreatment ? formData.ceramicTreatmentPrice : 0) +
      (formData.serviceCare ? formData.serviceCarePrice : 0) +
      (formData.windowTints ? formData.windowTintsPrice : 0);

    const invoiceTotal = formData.vehicleSalePrice + formData.rtaFees + addOnsTotal;
    const amountDue = invoiceTotal - formData.deposit - (formData.hasPartExchange ? formData.partExchangeValue : 0);

    setFormData(prev => ({
      ...prev,
      addOnsTotal,
      invoiceTotal,
      amountDue
    }));
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Step 1: Save form data to vehicle_reservations table
      console.log('Saving reservation data to database...');
      const reservationData = {
        lead_id: lead.id,
        document_type: mode,
        document_status: 'pending',
        
        // Document details
        sales_executive: formData.salesExecutive,
        document_date: formData.date,
        
        // Customer information
        customer_name: formData.customerName,
        contact_no: formData.contactNo,
        email_address: formData.emailAddress,
        customer_id_type: formData.customerIdType,
        customer_id_number: formData.customerIdNumber,
        
        // Vehicle information
        vehicle_make_model: formData.makeModel,
        model_year: formData.modelYear,
        chassis_no: formData.chassisNo,
        vehicle_exterior_colour: formData.exteriorColour,
        vehicle_interior_colour: formData.interiorColour,
        vehicle_mileage: formData.mileage,
        
        // Warranty information
        manufacturer_warranty: formData.manufacturerWarranty,
        manufacturer_warranty_expiry_date: formData.manufacturerWarrantyExpiryDate || null,
        manufacturer_warranty_expiry_mileage: formData.manufacturerWarrantyExpiryMileage || null,
        dealer_service_package: formData.dealerServicePackage,
        dealer_service_package_expiry_date: formData.dealerServicePackageExpiryDate || null,
        dealer_service_package_expiry_mileage: formData.dealerServicePackageExpiryMileage || null,
        
        // Part exchange
        has_part_exchange: formData.hasPartExchange,
        part_exchange_make_model: formData.hasPartExchange ? formData.partExchangeMakeModel : null,
        part_exchange_model_year: formData.hasPartExchange ? formData.partExchangeModelYear : null,
        part_exchange_chassis_no: formData.hasPartExchange ? formData.partExchangeChassisNo : null,
        part_exchange_exterior_colour: formData.hasPartExchange ? formData.partExchangeExteriorColour : null,
        part_exchange_engine_no: formData.hasPartExchange ? formData.partExchangeEngineNo : null,
        part_exchange_mileage: formData.hasPartExchange ? formData.partExchangeMileage : null,
        part_exchange_value: formData.hasPartExchange ? formData.partExchangeValue : 0,
        
        // Add-ons
        extended_warranty: formData.extendedWarranty,
        extended_warranty_price: formData.extendedWarranty ? formData.extendedWarrantyPrice : 0,
        ceramic_treatment: formData.ceramicTreatment,
        ceramic_treatment_price: formData.ceramicTreatment ? formData.ceramicTreatmentPrice : 0,
        service_care: formData.serviceCare,
        service_care_price: formData.serviceCare ? formData.serviceCarePrice : 0,
        window_tints: formData.windowTints,
        window_tints_price: formData.windowTints ? formData.windowTintsPrice : 0,
        
        // Payment details
        rta_fees: formData.rtaFees,
        vehicle_sale_price: formData.vehicleSalePrice,
        add_ons_total: formData.addOnsTotal,
        invoice_total: formData.invoiceTotal,
        deposit: formData.deposit,
        amount_due: formData.amountDue,
        
        // Additional notes
        additional_notes: formData.additionalNotes,
        
        // Audit
        created_by: user?.id || null
      };

      // Check if reservation already exists for this lead
      console.log('🔍 Checking for existing reservation before save for lead_id:', lead.id);
      const { data: existingReservation, error: checkError } = await supabase
        .from('vehicle_reservations')
        .select('id, document_type, document_number')
        .eq('lead_id', lead.id)
        .maybeSingle();
        
      console.log('🔍 Existing reservation check result:', { data: existingReservation, error: checkError });

      let savedReservation;
      if (existingReservation) {
        // Check if we're converting reservation to invoice
        const isConvertingToInvoice = existingReservation.document_type === 'reservation' && mode === 'invoice';
        
        console.log('🔍 Conversion check:', {
          existingType: existingReservation.document_type,
          currentMode: mode,
          isConverting: isConvertingToInvoice,
          existingDocNumber: existingReservation.document_number
        });
        
        if (isConvertingToInvoice) {
          console.log('🔄 Converting reservation to invoice:', existingReservation.id);
          // When converting to invoice, trigger will generate INV- number automatically
          const updateData = {
            ...reservationData,
            updated_at: new Date().toISOString()
          };
          
          const { data, error: updateError } = await supabase
            .from('vehicle_reservations')
            .update(updateData)
            .eq('id', existingReservation.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error converting reservation to invoice:', updateError);
            throw new Error('Failed to convert reservation to invoice');
          }
          savedReservation = data;
          console.log('Reservation converted to invoice:', savedReservation);
          
          // Fetch the updated record to get the trigger-generated invoice number
          console.log('🔍 Fetching updated record to get invoice number...');
          const { data: refreshedData, error: refreshError } = await supabase
            .from('vehicle_reservations')
            .select('document_number, document_type')
            .eq('id', existingReservation.id)
            .single();
          
          console.log('🔍 Refreshed data:', refreshedData);
          console.log('🔍 Refresh error:', refreshError);
          
          if (refreshedData?.document_number) {
            console.log('🔢 Setting invoice number in modal:', refreshedData.document_number);
            setDocumentNumber(refreshedData.document_number);
            // Update the savedReservation with the new document number
            savedReservation.document_number = refreshedData.document_number;
          } else {
            console.warn('⚠️ No document number generated after conversion. Data:', refreshedData);
          }
        } else {
          // Regular update - keep existing document number
          console.log('Updating existing document:', existingReservation.id);
          const { data, error: updateError } = await supabase
            .from('vehicle_reservations')
            .update({
              ...reservationData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingReservation.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating document data:', updateError);
            throw new Error('Failed to update document data');
          }
          savedReservation = data;
          console.log('Document data updated:', savedReservation);
        }
      } else {
        // Create new reservation/invoice
        console.log('Creating new', mode);
        const { data, error: insertError } = await supabase
          .from('vehicle_reservations')
          .insert([reservationData])
          .select()
          .single();

        if (insertError) {
          console.error('Error saving document data:', insertError);
          throw new Error('Failed to save document data');
        }
        savedReservation = data;
        console.log('Document data saved:', savedReservation);
      }

      // Step 2: Generate PDF with the saved reservation ID
      console.log('Generating PDF document...');
      const response = await fetch('/api/generate-vehicle-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          formData,
          leadId: lead.id,
          reservationId: savedReservation.id
        })
      });

      if (!response.ok) throw new Error('Failed to generate document');

      const result = await response.json();
      
      // Step 3: Update reservation record with PDF URL
      if (result.pdfUrl) {
        console.log('Updating reservation with PDF URL:', result.pdfUrl);
        await supabase
          .from('vehicle_reservations')
          .update({ 
            pdf_url: result.pdfUrl,
            document_status: 'completed'
          })
          .eq('id', savedReservation.id);
        
        // Update local state with new PDF URL
        setGeneratedPdfUrl(result.pdfUrl);
        setPdfGenerated(true);
        
        // Set document number from result if available
        if (result.documentNumber) {
          setDocumentNumber(result.documentNumber);
        }
        
        // Also update document number immediately after save for conversions
        if (savedReservation.document_number) {
          setDocumentNumber(savedReservation.document_number);
        }
        
        // Reset DocuSign status when PDF is regenerated
        if (docusignEnvelopeId) {
          console.log('🔄 PDF regenerated - resetting DocuSign status');
          setDocusignEnvelopeId(null);
          setSigningStatus('pending');
          setSignedPdfUrl(null);
          
          // Clear any existing DocuSign data in database
          await supabase
            .from('vehicle_reservations')
            .update({
              docusign_envelope_id: null,
              signing_status: 'pending',
              signed_pdf_url: null,
              sent_for_signing_at: null,
              completed_at: null
            })
            .eq('id', savedReservation.id);
        }
        
        // Force download the PDF
        try {
          const fileName = `${mode}-${formData.customerName.replace(/[^a-zA-Z0-9]/g, '_')}-${formData.date}.pdf`;
          
          // Try to fetch the PDF and trigger download
          const pdfResponse = await fetch(result.pdfUrl);
          if (pdfResponse.ok) {
            const blob = await pdfResponse.blob();
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL
            window.URL.revokeObjectURL(url);
            console.log('PDF download initiated:', fileName);
          } else {
            // Fallback: open in new tab
            console.log('PDF fetch failed, opening in new tab');
            window.open(result.pdfUrl, '_blank');
          }
        } catch (downloadError) {
          console.error('Download failed, opening in new tab:', downloadError);
          window.open(result.pdfUrl, '_blank');
        }
      }
      
      console.log('Document generated successfully:', result);
      
      // Step 4: Call onSubmit callback (updates lead status) - but keep modal open
      if (onSubmit) {
        onSubmit();
      }
      // Note: Don't close modal automatically - let user close it manually
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Error generating document. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // DocuSign Functions (matching consignment flow)
  const handleSendForSigning = () => {
    if (!generatedPdfUrl || !pdfGenerated) {
      alert('Please generate the document first before sending for signing.');
      return;
    }
    
    if (!formData.emailAddress) {
      alert('Please add customer email address before sending for signing.');
      return;
    }

    // Open company email modal (matching consignment flow)
    setCompanyEmail('');
    setShowEmailModal(true);
  };

  // Function to actually send for signing after company email is selected
  const handleConfirmSendForSigning = async () => {
    if (!companyEmail) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    setSendingForSigning(true);
    setShowEmailModal(false);
    
    try {
      console.log('🔄 Sending document for DocuSign signing...');
      console.log('👤 Company signer:', companyEmail);
      console.log('👤 Customer:', formData.customerName, formData.emailAddress);

      const response = await fetch('/api/docusign/send-for-signing-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          documentType: mode,
          customerEmail: formData.emailAddress,
          customerName: formData.customerName,
          companySignerEmail: companyEmail,
          documentTitle: mode === 'reservation' ? 'Vehicle Reservation Form' : 'Vehicle Invoice',
          pdfUrl: generatedPdfUrl,
          formData: formData
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
      
      console.log('✅ Document sent for signing:', result.envelopeId);
      
    } catch (error) {
      console.error('❌ Error sending for signing:', error);
      alert('Failed to send document for signing. Please try again.');
    } finally {
      setSendingForSigning(false);
    }
  };

  const startStatusPolling = () => {
    // Clear existing interval
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
    }

    console.log('🔄 Starting DocuSign status polling...');
    
    const interval = setInterval(async () => {
      try {
        if (!docusignEnvelopeId) return;

        // Query vehicle_reservations table for updated status
        const { data: reservation, error } = await supabase
          .from('vehicle_reservations')
          .select('signing_status, signed_pdf_url, docusign_envelope_id')
          .eq('lead_id', lead.id)
          .eq('document_type', mode)
          .not('docusign_envelope_id', 'is', null)
          .single();

        if (error) {
          console.error('Error polling signing status:', error);
          return;
        }

        if (reservation) {
          setSigningStatus(reservation.signing_status);
          
          if (reservation.signed_pdf_url) {
            setSignedPdfUrl(reservation.signed_pdf_url);
          }

          // Stop polling if completed
          if (reservation.signing_status === 'completed') {
            console.log('✅ Document signing completed!');
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

  // Load existing DocuSign data when modal opens
  useEffect(() => {
    if (isOpen && lead.id) {
      const loadDocuSignData = async () => {
        try {
          const { data: reservation, error } = await supabase
            .from('vehicle_reservations')
            .select('docusign_envelope_id, signing_status, signed_pdf_url, pdf_url')
            .eq('lead_id', lead.id)
            .eq('document_type', mode)
            .single();

          if (reservation) {
            setDocusignEnvelopeId(reservation.docusign_envelope_id);
            setSigningStatus(reservation.signing_status || 'pending');
            setSignedPdfUrl(reservation.signed_pdf_url);
            
            // If PDF exists, mark as generated
            if (reservation.pdf_url) {
              setGeneratedPdfUrl(reservation.pdf_url);
              setPdfGenerated(true);
            }

            // Start polling if document is sent but not completed
            if (reservation.docusign_envelope_id && 
                reservation.signing_status && 
                reservation.signing_status !== 'completed' &&
                reservation.signing_status !== 'declined') {
              startStatusPolling();
            }
          }
        } catch (error) {
          console.error('Error loading DocuSign data:', error);
        }
      };

      loadDocuSignData();
    }
  }, [isOpen, lead.id, mode]);

  // Cleanup polling on modal close
  useEffect(() => {
    if (!isOpen && statusPollingInterval) {
      console.log('🛑 Stopping DocuSign polling - modal closing');
      clearInterval(statusPollingInterval);
      setStatusPollingInterval(null);
    }
  }, [isOpen, statusPollingInterval]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-4 w-full max-w-4xl text-xs relative max-h-[90vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-lg leading-none text-white/70 hover:text-white transition-colors z-10"
        >
          ×
        </button>

        {/* Header */}
        <div className="mb-4 pr-8">
          <div className="flex items-center gap-3 mb-0.5">
            <h2 className="text-base font-semibold text-white">
              {isEditing ? 'Edit ' : ''}{mode === 'reservation' ? 'Vehicle Reservation Form' : 'Invoice Document'}
            </h2>
            {documentNumber && mode === 'invoice' && (
              <div className="px-2 py-1 bg-brand/20 border border-brand/40 rounded text-brand text-xs font-mono font-bold">
                {documentNumber}
              </div>
            )}
          </div>
          <p className="text-xs text-white/60">
            {isEditing 
              ? `Update the ${mode} details and regenerate the document`
              : mode === 'reservation' 
                ? 'Complete the reservation details to generate the reservation form'
                : 'Complete the invoice details for vehicle delivery'
            }
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white rounded-full"></div>
            <span className="ml-2 text-white/60">Loading vehicle details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sales Executive & Date */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-3">Document Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Sales Executive</label>
                  <input
                    type="text"
                    value={formData.salesExecutive}
                    onChange={(e) => handleInputChange('salesExecutive', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-3">Customer Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Contact No.</label>
                  <input
                    type="text"
                    value={formData.contactNo}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.emailAddress}
                    onChange={(e) => handleInputChange('emailAddress', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40"
                    placeholder="Enter customer email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Customer ID</label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="radio"
                        id="eid"
                        name="customerIdType"
                        value="EID"
                        checked={formData.customerIdType === 'EID'}
                        onChange={(e) => handleInputChange('customerIdType', e.target.value)}
                        className="text-brand"
                      />
                      <label htmlFor="eid" className="text-xs text-white/80">EID</label>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="radio"
                        id="passport"
                        name="customerIdType"
                        value="Passport"
                        checked={formData.customerIdType === 'Passport'}
                        onChange={(e) => handleInputChange('customerIdType', e.target.value)}
                        className="text-brand"
                      />
                      <label htmlFor="passport" className="text-xs text-white/80">Passport</label>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={formData.customerIdNumber}
                    onChange={(e) => handleInputChange('customerIdNumber', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40 mt-1"
                    placeholder={`Enter ${formData.customerIdType} number`}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-3">Vehicle Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Make & Model</label>
                  <input
                    type="text"
                    value={formData.makeModel}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Model Year</label>
                  <input
                    type="number"
                    value={formData.modelYear}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Chassis No.</label>
                  <input
                    type="text"
                    value={formData.chassisNo}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Exterior Colour</label>
                  <input
                    type="text"
                    value={formData.exteriorColour}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Interior Colour</label>
                  <input
                    type="text"
                    value={formData.interiorColour}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Mileage</label>
                  <input
                    type="number"
                    value={formData.mileage}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                    readOnly
                  />
                </div>
              </div>
              
              {/* Warranty Information */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="min-h-[80px] flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="manufacturerWarranty"
                        checked={formData.manufacturerWarranty}
                        onChange={(e) => handleInputChange('manufacturerWarranty', e.target.checked)}
                        className="rounded border-white/20 bg-white/10 text-brand focus:ring-brand/50"
                      />
                      <label htmlFor="manufacturerWarranty" className="text-xs font-medium text-white/80">Manufacturer/Dealer Warranty</label>
                    </div>
                    {formData.manufacturerWarranty && (
                      <div className="space-y-2 mt-auto">
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Expiry Date</label>
                          <input
                            type="date"
                            value={formData.manufacturerWarrantyExpiryDate}
                            onChange={(e) => handleInputChange('manufacturerWarrantyExpiryDate', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Mileage (km)</label>
                          <input
                            type="number"
                            value={formData.manufacturerWarrantyExpiryMileage}
                            onChange={(e) => handleInputChange('manufacturerWarrantyExpiryMileage', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                            placeholder="Enter mileage"
                            min="0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="min-h-[80px] flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="dealerServicePackage"
                        checked={formData.dealerServicePackage}
                        onChange={(e) => handleInputChange('dealerServicePackage', e.target.checked)}
                        className="rounded border-white/20 bg-white/10 text-brand focus:ring-brand/50"
                      />
                      <label htmlFor="dealerServicePackage" className="text-xs font-medium text-white/80">Dealer Service Package</label>
                    </div>
                    {formData.dealerServicePackage && (
                      <div className="space-y-2 mt-auto">
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Expiry Date</label>
                          <input
                            type="date"
                            value={formData.dealerServicePackageExpiryDate}
                            onChange={(e) => handleInputChange('dealerServicePackageExpiryDate', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Mileage (km)</label>
                          <input
                            type="number"
                            value={formData.dealerServicePackageExpiryMileage}
                            onChange={(e) => handleInputChange('dealerServicePackageExpiryMileage', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                            placeholder="Enter mileage"
                            min="0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Part Exchange Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="hasPartExchange"
                  checked={formData.hasPartExchange}
                  onChange={(e) => handleInputChange('hasPartExchange', e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-brand focus:ring-brand/50"
                />
                <label htmlFor="hasPartExchange" className="text-sm font-medium text-white">Part Exchange</label>
              </div>
              
              {formData.hasPartExchange && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">Make & Model</label>
                    <input
                      type="text"
                      value={formData.partExchangeMakeModel}
                      onChange={(e) => handleInputChange('partExchangeMakeModel', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40"
                      placeholder="Enter make & model"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">Model Year</label>
                    <input
                      type="text"
                      value={formData.partExchangeModelYear}
                      onChange={(e) => handleInputChange('partExchangeModelYear', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40"
                      placeholder="Enter year"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">Chassis No.</label>
                    <input
                      type="text"
                      value={formData.partExchangeChassisNo}
                      onChange={(e) => handleInputChange('partExchangeChassisNo', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40"
                      placeholder="Enter chassis number"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">Exterior Colour</label>
                    <input
                      type="text"
                      value={formData.partExchangeExteriorColour}
                      onChange={(e) => handleInputChange('partExchangeExteriorColour', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40"
                      placeholder="Enter exterior colour"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">Engine No.</label>
                    <input
                      type="text"
                      value={formData.partExchangeEngineNo}
                      onChange={(e) => handleInputChange('partExchangeEngineNo', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40"
                      placeholder="Enter engine number"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">Mileage</label>
                    <input
                      type="text"
                      value={formData.partExchangeMileage}
                      onChange={(e) => handleInputChange('partExchangeMileage', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40"
                      placeholder="Enter mileage"
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-medium text-white/80 mb-1">Part Exchange Value (AED)</label>
                    <input
                      type="number"
                      value={formData.partExchangeValue}
                      onChange={(e) => handleInputChange('partExchangeValue', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40"
                      placeholder="Enter part exchange value"
                      min="0"
                      step="100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Add-ons Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-3">Add-ons</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="extendedWarranty"
                        checked={formData.extendedWarranty}
                        onChange={(e) => handleInputChange('extendedWarranty', e.target.checked)}
                        className="rounded border-white/20 bg-white/10 text-brand focus:ring-brand/50"
                      />
                      <label htmlFor="extendedWarranty" className="text-xs text-white">Extended Warranty</label>
                    </div>
                    {formData.extendedWarranty && (
                      <input
                        type="number"
                        value={formData.extendedWarrantyPrice}
                        onChange={(e) => handleInputChange('extendedWarrantyPrice', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                        placeholder="Price"
                        min="0"
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="serviceCare"
                        checked={formData.serviceCare}
                        onChange={(e) => handleInputChange('serviceCare', e.target.checked)}
                        className="rounded border-white/20 bg-white/10 text-brand focus:ring-brand/50"
                      />
                      <label htmlFor="serviceCare" className="text-xs text-white">ServiceCare</label>
                    </div>
                    {formData.serviceCare && (
                      <input
                        type="number"
                        value={formData.serviceCarePrice}
                        onChange={(e) => handleInputChange('serviceCarePrice', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                        placeholder="Price"
                        min="0"
                      />
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ceramicTreatment"
                        checked={formData.ceramicTreatment}
                        onChange={(e) => handleInputChange('ceramicTreatment', e.target.checked)}
                        className="rounded border-white/20 bg-white/10 text-brand focus:ring-brand/50"
                      />
                      <label htmlFor="ceramicTreatment" className="text-xs text-white">Ceramic Treatment</label>
                    </div>
                    {formData.ceramicTreatment && (
                      <input
                        type="number"
                        value={formData.ceramicTreatmentPrice}
                        onChange={(e) => handleInputChange('ceramicTreatmentPrice', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                        placeholder="Price"
                        min="0"
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="windowTints"
                        checked={formData.windowTints}
                        onChange={(e) => handleInputChange('windowTints', e.target.checked)}
                        className="rounded border-white/20 bg-white/10 text-brand focus:ring-brand/50"
                      />
                      <label htmlFor="windowTints" className="text-xs text-white">Window Tints</label>
                    </div>
                    {formData.windowTints && (
                      <input
                        type="number"
                        value={formData.windowTintsPrice}
                        onChange={(e) => handleInputChange('windowTintsPrice', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                        placeholder="Price"
                        min="0"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-3">Payment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">RTA Fees (AED)</label>
                  <input
                    type="number"
                    value={formData.rtaFees}
                    onChange={(e) => handleInputChange('rtaFees', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40"
                    placeholder="Enter RTA fees"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Vehicle Sale Price (AED)</label>
                  <input
                    type="number"
                    value={formData.vehicleSalePrice}
                    onChange={(e) => handleInputChange('vehicleSalePrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Deposit (AED)</label>
                  <input
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => handleInputChange('deposit', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40"
                    placeholder="Enter deposit amount"
                    min="0"
                  />
                </div>
              </div>
              
              {/* Calculated Totals */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1">Add-ons Total</label>
                    <div className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs">
                      AED {formData.addOnsTotal.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1">Invoice Total</label>
                    <div className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs font-medium">
                      AED {formData.invoiceTotal.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1">Deposit & Part Exchange</label>
                    <div className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs">
                      AED {(formData.deposit + (formData.hasPartExchange ? formData.partExchangeValue : 0)).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1">Amount Due</label>
                    <div className="px-2 py-1.5 bg-brand/20 border border-brand/40 rounded text-white text-xs font-bold">
                      AED {formData.amountDue.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Notes Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-3">Additional Notes</h3>
              <div>
                <label className="block text-xs font-medium text-white/80 mb-2">
                  Notes (will appear on the {mode === 'reservation' ? 'reservation form' : 'invoice'})
                </label>
                <textarea
                  value={formData.additionalNotes}
                  onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40 resize-none"
                  placeholder={`Enter any additional notes for this ${mode}...`}
                  rows={3}
                />
                <div className="text-xs text-white/60 mt-1">
                  These notes will be displayed on the first page of the generated document.
                </div>
              </div>
            </div>

            {/* PDF Status Section - Progressive Status */}
            {pdfGenerated && generatedPdfUrl && (
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
                       `${mode === 'reservation' ? 'Reservation Form' : 'Invoice Document'} Created`}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(signedPdfUrl || generatedPdfUrl, '_blank')}
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
                      onClick={async () => {
                        try {
                          const pdfUrl = signedPdfUrl || generatedPdfUrl;
                          const suffix = signedPdfUrl ? '-SIGNED' : '';
                          const fileName = `${mode}-${formData.customerName.replace(/[^a-zA-Z0-9]/g, '_')}-${formData.date}${suffix}.pdf`;
                          const response = await fetch(pdfUrl);
                          if (response.ok) {
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = fileName;
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            window.URL.revokeObjectURL(url);
                          } else {
                            window.open(pdfUrl, '_blank');
                          }
                        } catch (error) {
                          window.open(signedPdfUrl || generatedPdfUrl, '_blank');
                        }
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 backdrop-blur-sm border border-gray-500/50 text-gray-100 text-xs rounded transition-all flex items-center gap-1.5 shadow-lg"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </button>
                    {/* Send for Signing Button - Show when pending or when regenerated */}
                    {formData.emailAddress && (signingStatus === 'pending' || signingStatus === 'regenerated') && (
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
                        {sendingForSigning ? 'Sending...' : 'Send for Signing'}
                      </button>
                    )}
                  </div>
                </div>
                <div className={`mt-2 text-xs ${
                  signingStatus === 'completed' ? 'text-green-300/70' :
                  signingStatus === 'company_signed' ? 'text-orange-300/70' :
                  signingStatus === 'sent' || signingStatus === 'delivered' ? 'text-blue-300/70' :
                  'text-yellow-300/70'
                }`}>
                  {signingStatus === 'completed' && 'Document has been successfully signed by both company and customer.'}
                  {signingStatus === 'company_signed' && 'Company signature completed. Waiting for customer signature.'}
                  {signingStatus === 'sent' && 'Document sent to company for signature first, then customer.'}
                  {signingStatus === 'delivered' && 'Document delivered and awaiting signatures.'}
                  {signingStatus === 'pending' && 'You can regenerate the document or send for signing.'}
                  {!formData.emailAddress && signingStatus === 'pending' && (
                    <span className="block mt-1 text-yellow-400/80">
                      💡 Add customer email to enable DocuSign signing.
                    </span>
                  )}
                  {docusignEnvelopeId && (
                    <span className="block mt-1 font-mono text-[10px] text-white/40">
                      Envelope ID: {docusignEnvelopeId}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand hover:bg-brand/90 text-white text-xs rounded transition-colors flex items-center gap-1.5"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-3 h-3 border border-white/30 border-t-white rounded-full"></div>
                    Generating...
                  </>
                ) : (
                  <>{pdfGenerated ? 'Regenerate' : isEditing ? 'Update' : 'Generate'} {mode === 'reservation' ? 'Reservation Form' : 'Invoice'}</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
      
      {/* Company Signer Email Selection Modal */}
      {showEmailModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 p-0.5 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="bg-black/90 backdrop-blur-2xl rounded-2xl p-6 relative">
              {/* Gradient overlay for glass effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent pointer-events-none rounded-2xl"></div>

              {/* Header */}
              <div className="relative z-10 mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Select Company Signer</h3>
                <p className="text-sm text-white/70">
                  Choose who from SilberArrows will sign this {mode} first, then it will be sent to the customer.
                </p>
              </div>

              {/* Email Input */}
              <div className="relative z-10 mb-6">
                <label className="block text-sm font-medium text-white mb-2">
                  Company Signer Email
                </label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="Enter company signer email..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                  autoFocus
                />
                <p className="text-xs text-white/50 mt-1">
                  This person will receive the document first for company signature.
                </p>
              </div>

              {/* Customer Info Display */}
              <div className="relative z-10 mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-xs text-white/70 mb-1">After company signature, document will be sent to:</p>
                <p className="text-sm text-white font-medium">{formData.customerName}</p>
                <p className="text-xs text-white/60">{formData.emailAddress}</p>
              </div>

              {/* Buttons */}
              <div className="relative z-10 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setCompanyEmail('');
                  }}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSendForSigning}
                  disabled={!companyEmail || sendingForSigning}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white border border-gray-400/50 transition-all disabled:opacity-50 shadow-lg"
                >
                  {sendingForSigning ? 'Sending...' : 'Send for Signing'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 