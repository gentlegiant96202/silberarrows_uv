'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';
import { useUserRole } from '@/lib/useUserRole';
import { 
  X, FileText, CreditCard, Receipt, ClipboardList,
  Plus, Trash2, Download, Eye, Check, DollarSign, Car, User,
  Phone, Mail, Calendar, Banknote, Shield, Sparkles
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================
interface Lead {
  id: string;
  full_name: string;
  phone_number: string;
  model_of_interest: string;
  inventory_car_id?: string;
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

interface FormData {
  salesExecutive: string;
  date: string;
  customerName: string;
  contactNo: string;
  emailAddress: string;
  customerIdType: 'EID' | 'Passport';
  customerIdNumber: string;
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
  hasPartExchange: boolean;
  partExchangeMakeModel: string;
  partExchangeModelYear: string;
  partExchangeChassisNo: string;
  partExchangeExteriorColour: string;
  partExchangeEngineNo: string;
  partExchangeMileage: string;
  partExchangeValue: number;
  extendedWarranty: boolean;
  extendedWarrantyPrice: number;
  ceramicTreatment: boolean;
  ceramicTreatmentPrice: number;
  serviceCare: boolean;
  serviceCarePrice: number;
  windowTints: boolean;
  windowTintsPrice: number;
  rtaFees: number;
  vehicleSalePrice: number;
  addOnsTotal: number;
  invoiceTotal: number;
  deposit: number;
  amountDue: number;
  additionalNotes: string;
}

interface Charge {
  id: string;
  reservation_id: string;
  charge_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  vat_applicable: boolean;
  vat_rate: number;
  vat_amount: number;
  display_order: number;
}

interface Payment {
  id: string;
  lead_id: string;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  amount: number;
  allocated_amount: number;
  unallocated_amount: number;
  status: string;
  bank_name: string | null;
  cheque_number: string | null;
  cheque_date: string | null;
  part_exchange_vehicle: string | null;
  part_exchange_chassis: string | null;
  receipt_number: string | null;
  notes: string | null;
}

interface PaymentAllocation {
  id: string;
  payment_id: string;
  reservation_id: string;
  allocated_amount: number;
}

interface AccountSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  mode: 'reservation' | 'invoice';
  lead: Lead;
}

type TabType = 'form' | 'charges' | 'payments' | 'documents';

const CHARGE_TYPES = [
  { value: 'vehicle_sale', label: 'Vehicle Sale' },
  { value: 'extended_warranty', label: 'Warranty' },
  { value: 'ceramic_treatment', label: 'Ceramic' },
  { value: 'service_care', label: 'Service' },
  { value: 'window_tints', label: 'Tints' },
  { value: 'rta_fees', label: 'RTA Fees' },
  { value: 'other_addon', label: 'Other' },
  { value: 'discount', label: 'Discount' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard },
  { value: 'cheque', label: 'Cheque', icon: FileText },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'part_exchange', label: 'Part Exchange', icon: Car },
  { value: 'finance', label: 'Finance', icon: DollarSign },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AccountSummaryModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  lead
}: AccountSummaryModalProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const [activeTab, setActiveTab] = useState<TabType>('form');

  const getUserDisplayName = () => {
    if (!user) return '';
    if (user.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user.email) {
      const emailPrefix = user.email.split('@')[0];
      return emailPrefix.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'User';
  };

  const [formData, setFormData] = useState<FormData>({
    salesExecutive: getUserDisplayName(),
    date: new Date().toISOString().split('T')[0],
    customerName: lead.full_name,
    contactNo: lead.phone_number,
    emailAddress: '',
    customerIdType: 'EID',
    customerIdNumber: '',
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
    hasPartExchange: false,
    partExchangeMakeModel: '',
    partExchangeModelYear: '',
    partExchangeChassisNo: '',
    partExchangeExteriorColour: '',
    partExchangeEngineNo: '',
    partExchangeMileage: '',
    partExchangeValue: 0,
    extendedWarranty: false,
    extendedWarrantyPrice: 0,
    ceramicTreatment: false,
    ceramicTreatmentPrice: 0,
    serviceCare: false,
    serviceCarePrice: 0,
    windowTints: false,
    windowTintsPrice: 0,
    rtaFees: 0,
    vehicleSalePrice: 0,
    addOnsTotal: 0,
    invoiceTotal: 0,
    deposit: 0,
    amountDue: 0,
    additionalNotes: '',
  });

  const [inventoryCar, setInventoryCar] = useState<InventoryCar | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [documentNumber, setDocumentNumber] = useState<string | null>(null);
  const [reservationNumber, setReservationNumber] = useState<string | null>(null);
  const [customerNumber, setCustomerNumber] = useState<string | null>(null);
  
  // Document URLs - store both separately
  const [reservationPdfUrl, setReservationPdfUrl] = useState<string | null>(null);
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  
  // DocuSign state
  const [docusignEnvelopeId, setDocusignEnvelopeId] = useState<string | null>(null);
  const [signingStatus, setSigningStatus] = useState<string>('pending');
  const [sendingForSigning, setSendingForSigning] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [companyEmail, setCompanyEmail] = useState('');

  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newCharge, setNewCharge] = useState({ charge_type: 'vehicle_sale', description: '', unit_price: 0, vat_applicable: false });
  const [newPayment, setNewPayment] = useState({ payment_method: 'cash', amount: 0, reference_number: '', notes: '', bank_name: '', cheque_number: '', cheque_date: '', part_exchange_vehicle: '', part_exchange_chassis: '' });

  // PENDING DATA - stored in memory until "Generate" is clicked
  const [pendingCharges, setPendingCharges] = useState<Array<{ id: string; charge_type: string; description: string; unit_price: number; total_amount: number; vat_applicable: boolean; vat_amount: number }>>([]);
  const [pendingPayments, setPendingPayments] = useState<Array<{ id: string; payment_method: string; amount: number; reference_number: string; notes: string; bank_name?: string; cheque_number?: string; cheque_date?: string; part_exchange_vehicle?: string; part_exchange_chassis?: string }>>([]);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Combine DB charges with pending charges for display
  const allCharges = reservationId ? charges : pendingCharges;
  const allPayments = reservationId ? payments : pendingPayments;

  const chargesTotals = {
    subtotal: allCharges.reduce((sum, c) => sum + (c.total_amount || c.unit_price || 0), 0),
    vat: allCharges.reduce((sum, c) => sum + (c.vat_amount || 0), 0),
    get grandTotal() { return this.subtotal + this.vat; },
    totalPaid: reservationId 
      ? allocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0)
      : pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    get balanceDue() { return this.grandTotal - this.totalPaid; }
  };

  // ============================================================
  // DATA LOADING
  // ============================================================
  const loadData = useCallback(async () => {
    if (!lead.id) return;
    setLoading(true);

    try {
      // Check if reservation exists first
      const { data: resData } = await supabase.from('vehicle_reservations').select('*').eq('lead_id', lead.id).maybeSingle();
      
      let carData: InventoryCar | null = null;
      if (lead.inventory_car_id) {
        const { data } = await supabase.from('cars').select('*').eq('id', lead.inventory_car_id).single();
        carData = data;
        if (carData) {
          setInventoryCar(carData);
          setFormData(prev => ({
            ...prev,
            makeModel: carData.vehicle_model || '',
            modelYear: carData.model_year || 0,
            chassisNo: carData.chassis_number || '',
            exteriorColour: carData.colour || '',
            interiorColour: carData.interior_colour || '',
            mileage: carData.current_mileage_km || 0,
            vehicleSalePrice: carData.advertised_price_aed || 0,
          }));
          
          // Auto-add Vehicle Sale as first charge if no existing reservation
          if (!resData && carData.advertised_price_aed > 0) {
            setPendingCharges([{
              id: `pending-vehicle-sale`,
              charge_type: 'vehicle_sale',
              description: `Vehicle Sale - ${carData.vehicle_model || 'Vehicle'}`,
              unit_price: carData.advertised_price_aed,
              total_amount: carData.advertised_price_aed,
              vat_applicable: false,
              vat_amount: 0
            }]);
          }
        }
      }

      if (resData) {
        setIsEditing(true);
        setReservationId(resData.id);
        setCustomerNumber(resData.customer_number);
        // Set document numbers - RES number is either current (if reservation) or original (if invoice)
        setDocumentNumber(resData.document_number);
        setReservationNumber(
          resData.document_type === 'reservation' 
            ? resData.document_number 
            : resData.original_reservation_number || null
        );
        // Load both document URLs
        setReservationPdfUrl(resData.reservation_pdf_url || null);
        setInvoicePdfUrl(resData.invoice_pdf_url || null);
        setSignedPdfUrl(resData.signed_pdf_url || null);
        setDocusignEnvelopeId(resData.docusign_envelope_id);
        setSigningStatus(resData.signing_status || 'pending');

        setFormData(prev => ({
          ...prev,
          salesExecutive: resData.sales_executive || prev.salesExecutive,
          date: resData.document_date || prev.date,
          customerName: resData.customer_name || prev.customerName,
          contactNo: resData.contact_no || prev.contactNo,
          emailAddress: resData.email_address || '',
          customerIdType: resData.customer_id_type || 'EID',
          customerIdNumber: resData.customer_id_number || '',
          makeModel: resData.vehicle_make_model || prev.makeModel,
          modelYear: resData.model_year || prev.modelYear,
          chassisNo: resData.chassis_no || prev.chassisNo,
          exteriorColour: resData.vehicle_exterior_colour || resData.vehicle_colour || prev.exteriorColour,
          interiorColour: resData.vehicle_interior_colour || prev.interiorColour,
          mileage: resData.vehicle_mileage || prev.mileage,
          manufacturerWarranty: resData.manufacturer_warranty || false,
          manufacturerWarrantyExpiryDate: resData.manufacturer_warranty_expiry_date || '',
          manufacturerWarrantyExpiryMileage: resData.manufacturer_warranty_expiry_mileage || 0,
          dealerServicePackage: resData.dealer_service_package || false,
          dealerServicePackageExpiryDate: resData.dealer_service_package_expiry_date || '',
          dealerServicePackageExpiryMileage: resData.dealer_service_package_expiry_mileage || 0,
          hasPartExchange: resData.has_part_exchange || false,
          partExchangeMakeModel: resData.part_exchange_make_model || '',
          partExchangeModelYear: resData.part_exchange_model_year || '',
          partExchangeChassisNo: resData.part_exchange_chassis_no || '',
          partExchangeExteriorColour: resData.part_exchange_exterior_colour || '',
          partExchangeEngineNo: resData.part_exchange_engine_no || '',
          partExchangeMileage: resData.part_exchange_mileage || '',
          partExchangeValue: resData.part_exchange_value || 0,
          extendedWarranty: resData.extended_warranty || false,
          extendedWarrantyPrice: resData.extended_warranty_price || 0,
          ceramicTreatment: resData.ceramic_treatment || false,
          ceramicTreatmentPrice: resData.ceramic_treatment_price || 0,
          serviceCare: resData.service_care || false,
          serviceCarePrice: resData.service_care_price || 0,
          windowTints: resData.window_tints || false,
          windowTintsPrice: resData.window_tints_price || 0,
          rtaFees: resData.rta_fees || 0,
          vehicleSalePrice: resData.vehicle_sale_price || prev.vehicleSalePrice,
          addOnsTotal: resData.add_ons_total || 0,
          invoiceTotal: resData.invoice_total || 0,
          deposit: resData.deposit || 0,
          amountDue: resData.amount_due || 0,
          additionalNotes: resData.additional_notes || '',
        }));

        const { data: chargesData } = await supabase.from('uv_charges').select('*').eq('reservation_id', resData.id).order('display_order');
        setCharges(chargesData || []);

        const { data: allocData } = await supabase.from('uv_payment_allocations').select('*').eq('reservation_id', resData.id);
        setAllocations(allocData || []);
      }

      const { data: paymentsData } = await supabase.from('uv_payments').select('*').eq('lead_id', lead.id).order('payment_date', { ascending: false });
      setPayments(paymentsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [lead.id, lead.inventory_car_id, mode]);

  useEffect(() => {
    if (isOpen) {
      // Reset pending state when modal opens
      setPendingCharges([]);
      setPendingPayments([]);
      loadData();
      setActiveTab('form');
    }
  }, [isOpen, loadData]);

  useEffect(() => {
    const addOnsTotal =
      (formData.extendedWarranty ? formData.extendedWarrantyPrice : 0) +
      (formData.ceramicTreatment ? formData.ceramicTreatmentPrice : 0) +
      (formData.serviceCare ? formData.serviceCarePrice : 0) +
      (formData.windowTints ? formData.windowTintsPrice : 0);
    const invoiceTotal = formData.vehicleSalePrice + formData.rtaFees + addOnsTotal;
    // Amount due is calculated from payments tracked in Payments tab
    const totalPaid = chargesTotals.totalPaid || 0;
    const partExchangeCredit = formData.hasPartExchange ? formData.partExchangeValue : 0;
    const amountDue = invoiceTotal - totalPaid - partExchangeCredit;
    setFormData(prev => ({ ...prev, addOnsTotal, invoiceTotal, amountDue }));
  }, [formData.extendedWarrantyPrice, formData.ceramicTreatmentPrice, formData.serviceCarePrice, formData.windowTintsPrice, formData.vehicleSalePrice, formData.rtaFees, formData.partExchangeValue, formData.extendedWarranty, formData.ceramicTreatment, formData.serviceCare, formData.windowTints, formData.hasPartExchange, chargesTotals.totalPaid]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    // Customer fields
    if (!formData.customerName?.trim()) errors.push('Customer Name is required');
    if (!formData.contactNo?.trim()) errors.push('Phone Number is required');
    if (!formData.emailAddress?.trim()) errors.push('Email Address is required');
    if (!formData.customerIdNumber?.trim()) errors.push('ID Number is required');
    
    // Vehicle fields
    if (!formData.makeModel?.trim()) errors.push('Vehicle Make & Model is required');
    if (!formData.modelYear || formData.modelYear <= 0) errors.push('Vehicle Year is required');
    if (!formData.chassisNo?.trim()) errors.push('Chassis Number is required');
    
    // Charges
    if (allCharges.length === 0) errors.push('At least one charge is required');
    
    // Payment required for reservation
    if (mode === 'reservation' && allPayments.length === 0) {
      errors.push('At least one payment (deposit) is required for reservation');
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate before generating
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setActiveTab('form'); // Switch to details tab to show what's missing
      return;
    }
    setValidationErrors([]);
    
    setSaving(true);

    try {
      const reservationData = {
        lead_id: lead.id, document_type: mode, document_status: 'pending',
        sales_executive: formData.salesExecutive, document_date: formData.date,
        customer_name: formData.customerName, contact_no: formData.contactNo,
        email_address: formData.emailAddress, customer_id_type: formData.customerIdType,
        customer_id_number: formData.customerIdNumber, vehicle_make_model: formData.makeModel,
        model_year: formData.modelYear, chassis_no: formData.chassisNo,
        vehicle_exterior_colour: formData.exteriorColour, vehicle_interior_colour: formData.interiorColour,
        vehicle_mileage: formData.mileage, manufacturer_warranty: formData.manufacturerWarranty,
        manufacturer_warranty_expiry_date: formData.manufacturerWarrantyExpiryDate || null,
        manufacturer_warranty_expiry_mileage: formData.manufacturerWarrantyExpiryMileage || null,
        dealer_service_package: formData.dealerServicePackage,
        dealer_service_package_expiry_date: formData.dealerServicePackageExpiryDate || null,
        dealer_service_package_expiry_mileage: formData.dealerServicePackageExpiryMileage || null,
        has_part_exchange: formData.hasPartExchange,
        part_exchange_make_model: formData.hasPartExchange ? formData.partExchangeMakeModel : null,
        part_exchange_model_year: formData.hasPartExchange ? formData.partExchangeModelYear : null,
        part_exchange_chassis_no: formData.hasPartExchange ? formData.partExchangeChassisNo : null,
        part_exchange_exterior_colour: formData.hasPartExchange ? formData.partExchangeExteriorColour : null,
        part_exchange_engine_no: formData.hasPartExchange ? formData.partExchangeEngineNo : null,
        part_exchange_mileage: formData.hasPartExchange ? formData.partExchangeMileage : null,
        part_exchange_value: formData.hasPartExchange ? formData.partExchangeValue : 0,
        extended_warranty: formData.extendedWarranty,
        extended_warranty_price: formData.extendedWarranty ? formData.extendedWarrantyPrice : 0,
        ceramic_treatment: formData.ceramicTreatment,
        ceramic_treatment_price: formData.ceramicTreatment ? formData.ceramicTreatmentPrice : 0,
        service_care: formData.serviceCare,
        service_care_price: formData.serviceCare ? formData.serviceCarePrice : 0,
        window_tints: formData.windowTints,
        window_tints_price: formData.windowTints ? formData.windowTintsPrice : 0,
        rta_fees: formData.rtaFees, vehicle_sale_price: formData.vehicleSalePrice,
        add_ons_total: formData.addOnsTotal, invoice_total: formData.invoiceTotal,
        deposit: formData.deposit, amount_due: formData.amountDue,
        additional_notes: formData.additionalNotes, created_by: user?.id || null
      };

      let savedReservation;
      if (reservationId) {
        const { data, error } = await supabase.from('vehicle_reservations').update({ ...reservationData, updated_at: new Date().toISOString() }).eq('id', reservationId).select().single();
        if (error) throw error;
        savedReservation = data;
      } else {
        const { data, error } = await supabase.from('vehicle_reservations').insert([reservationData]).select().single();
        if (error) throw error;
        savedReservation = data;
        setReservationId(data.id);

        // Save pending charges to DB now that we have a reservation_id
        if (pendingCharges.length > 0) {
          const chargesForDB = pendingCharges.map((c, index) => ({
            reservation_id: data.id,
            charge_type: c.charge_type,
            description: c.description,
            quantity: 1,
            unit_price: c.unit_price,
            vat_applicable: c.vat_applicable,
            display_order: index,
            created_by: user?.id
          }));
          await supabase.from('uv_charges').insert(chargesForDB);
          setPendingCharges([]); // Clear pending after save
        }

        // Save pending payments to DB
        if (pendingPayments.length > 0) {
          for (const payment of pendingPayments) {
            const { data: paymentData } = await supabase.from('uv_payments').insert({
              lead_id: lead.id,
              payment_method: payment.payment_method,
              amount: payment.amount,
              reference_number: payment.reference_number || null,
              notes: payment.notes || null,
              bank_name: payment.bank_name || null,
              cheque_number: payment.cheque_number || null,
              cheque_date: payment.cheque_date || null,
              part_exchange_vehicle: payment.part_exchange_vehicle || null,
              part_exchange_chassis: payment.part_exchange_chassis || null,
              created_by: user?.id
            }).select().single();

            // Allocate payment to this reservation
            if (paymentData) {
              await supabase.from('uv_payment_allocations').insert({
                payment_id: paymentData.id,
                reservation_id: data.id,
                allocated_amount: payment.amount,
                created_by: user?.id
              });
              await supabase.from('uv_payments').update({
                allocated_amount: payment.amount,
                status: 'allocated'
              }).eq('id', paymentData.id);
            }
          }
          setPendingPayments([]); // Clear pending after save
        }
      }

      const response = await fetch('/api/generate-vehicle-document', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, formData, leadId: lead.id, reservationId: savedReservation.id })
      });

      if (!response.ok) throw new Error('Failed to generate document');

      const result = await response.json();
      if (result.pdfUrl) {
        await supabase.from('vehicle_reservations').update({ pdf_url: result.pdfUrl, document_status: 'completed' }).eq('id', savedReservation.id);
        if (mode === 'reservation') {
          setReservationPdfUrl(result.pdfUrl);
        } else {
          setInvoicePdfUrl(result.pdfUrl);
        }
        if (result.documentNumber) setDocumentNumber(result.documentNumber);
        if (savedReservation.document_number) setDocumentNumber(savedReservation.document_number);
      }

      if (onSubmit) onSubmit();
    } catch (error) {
      console.error('Error:', error);
      alert('Error generating document. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Get current document URL based on mode
  const currentPdfUrl = mode === 'reservation' ? reservationPdfUrl : invoicePdfUrl;
  const hasCurrentPdf = !!currentPdfUrl;

  const handleSendForSigning = () => {
    if (!currentPdfUrl) { alert('Generate document first'); return; }
    if (!formData.emailAddress) { alert('Add customer email first'); return; }
    setShowEmailModal(true);
  };

  const handleConfirmSendForSigning = async () => {
    if (!companyEmail) return;
    setSendingForSigning(true);
    setShowEmailModal(false);
    try {
      const response = await fetch('/api/docusign/send-for-signing-vehicle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id, documentType: mode, customerEmail: formData.emailAddress,
          customerName: formData.customerName, companySignerEmail: companyEmail,
          documentTitle: mode === 'reservation' ? 'Vehicle Reservation Form' : 'Vehicle Invoice',
          pdfUrl: currentPdfUrl, formData
        })
      });
      if (!response.ok) throw new Error('Failed to send');
      const result = await response.json();
      setDocusignEnvelopeId(result.envelopeId);
      setSigningStatus('sent');
    } catch (error) {
      alert('Failed to send for signing');
    } finally {
      setSendingForSigning(false);
    }
  };

  const handleAddCharge = async () => {
    if (!newCharge.unit_price) return;
    
    const chargeData = {
      id: `pending-${Date.now()}`,
      charge_type: newCharge.charge_type,
      description: newCharge.description || CHARGE_TYPES.find(c => c.value === newCharge.charge_type)?.label || '',
      unit_price: newCharge.unit_price,
      total_amount: newCharge.unit_price, // For now, same as unit_price (qty=1)
      vat_applicable: newCharge.vat_applicable,
      vat_amount: 0
    };

    if (reservationId) {
      // Save to DB if reservation exists
      setSaving(true);
      try {
        await supabase.from('uv_charges').insert({
          reservation_id: reservationId, charge_type: chargeData.charge_type,
          description: chargeData.description,
          quantity: 1, unit_price: chargeData.unit_price, vat_applicable: chargeData.vat_applicable,
          display_order: charges.length, created_by: user?.id
        });
        await loadData();
      } catch (error) { alert('Failed to add charge'); } finally { setSaving(false); }
    } else {
      // Store locally until Generate is clicked
      setPendingCharges(prev => [...prev, chargeData]);
    }
    
    setShowAddCharge(false);
    setNewCharge({ charge_type: 'vehicle_sale', description: '', unit_price: 0, vat_applicable: false });
  };

  const handleDeleteCharge = async (id: string) => {
    if (!confirm('Delete this charge?')) return;
    
    if (id.startsWith('pending-')) {
      // Remove from pending (local) state
      setPendingCharges(prev => prev.filter(c => c.id !== id));
    } else {
      // Remove from DB
      await supabase.from('uv_charges').delete().eq('id', id);
      await loadData();
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount) return;
    
    const paymentData = {
      id: `pending-${Date.now()}`,
      payment_method: newPayment.payment_method,
      amount: newPayment.amount,
      reference_number: newPayment.reference_number || '',
      notes: newPayment.notes || '',
      bank_name: newPayment.bank_name || '',
      cheque_number: newPayment.cheque_number || '',
      cheque_date: newPayment.cheque_date || '',
      part_exchange_vehicle: newPayment.part_exchange_vehicle || '',
      part_exchange_chassis: newPayment.part_exchange_chassis || '',
      payment_date: new Date().toISOString(),
      status: 'pending'
    };

    if (reservationId) {
      // Save to DB if reservation exists
      setSaving(true);
      try {
        const { data: dbPayment } = await supabase.from('uv_payments').insert({
          lead_id: lead.id, payment_method: newPayment.payment_method, amount: newPayment.amount,
          reference_number: newPayment.reference_number || null, notes: newPayment.notes || null,
          bank_name: newPayment.bank_name || null, cheque_number: newPayment.cheque_number || null,
          cheque_date: newPayment.cheque_date || null, part_exchange_vehicle: newPayment.part_exchange_vehicle || null,
          part_exchange_chassis: newPayment.part_exchange_chassis || null, created_by: user?.id
        }).select().single();

        if (dbPayment && chargesTotals.balanceDue > 0) {
          const allocateAmount = Math.min(newPayment.amount, chargesTotals.balanceDue);
          await supabase.from('uv_payment_allocations').insert({ payment_id: dbPayment.id, reservation_id: reservationId, allocated_amount: allocateAmount, created_by: user?.id });
          await supabase.from('uv_payments').update({ allocated_amount: allocateAmount, status: allocateAmount >= newPayment.amount ? 'allocated' : 'partially_allocated' }).eq('id', dbPayment.id);
        }

        await loadData();
      } catch (error) { alert('Failed to record payment'); } finally { setSaving(false); }
    } else {
      // Store locally until Generate is clicked
      setPendingPayments(prev => [...prev, paymentData]);
    }
    
    setShowAddPayment(false);
    setNewPayment({ payment_method: 'cash', amount: 0, reference_number: '', notes: '', bank_name: '', cheque_number: '', cheque_date: '', part_exchange_vehicle: '', part_exchange_chassis: '' });
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0 }).format(n);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (!isOpen) return null;

  const isPaid = (chargesTotals.balanceDue <= 0 && chargesTotals.grandTotal > 0) || (formData.amountDue <= 0 && formData.invoiceTotal > 0);

  // ============================================================
  // RENDER
  // ============================================================
  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      {/* Override browser autofill styles */}
      <style>{`
        .account-modal input,
        .account-modal select,
        .account-modal textarea {
          background-color: #1a1a1a !important;
        }
        .account-modal input:-webkit-autofill,
        .account-modal input:-webkit-autofill:hover,
        .account-modal input:-webkit-autofill:focus,
        .account-modal input:-webkit-autofill:active,
        .account-modal select:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #1a1a1a inset !important;
          -webkit-text-fill-color: white !important;
          caret-color: white !important;
          background-color: #1a1a1a !important;
        }
      `}</style>
      <div className="account-modal bg-[#0d0d0d] rounded-xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-[#333]">
        
        {/* ============ HEADER ============ */}
        <div className="shrink-0 bg-gradient-to-b from-[#1a1a1a] to-[#111] border-b border-[#333]">
          {/* Top bar with customer info and close */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#888] to-[#444] flex items-center justify-center text-white font-semibold text-sm">
                {(formData.customerName || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-white">
                    {formData.customerName || 'Customer'}
                  </h2>
                  {customerNumber && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-[#444] to-[#333] text-[#ccc] text-[11px] font-mono rounded border border-[#555]">
                      {customerNumber}
                    </span>
                  )}
                  {isPaid && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[11px] font-medium rounded flex items-center gap-1">
                      <Check className="w-3 h-3" /> Paid
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[13px] text-[#888]">
                  <span>{formData.contactNo}</span>
                  {formData.emailAddress && (
                    <>
                      <span className="text-[#444]">•</span>
                      <span>{formData.emailAddress}</span>
                    </>
                  )}
                  <span className="text-[#444]">•</span>
                  <span>{formData.makeModel} {formData.modelYear > 0 && formData.modelYear}</span>
                </div>
              </div>
            </div>
            
            {/* Stats & Close */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-5 text-right">
                <div>
                  <p className="text-[11px] text-[#666] uppercase tracking-wide">Total</p>
                  <p className="text-sm font-semibold text-white">AED {formatCurrency(chargesTotals.grandTotal || formData.invoiceTotal)}</p>
                </div>
                <div className="w-px h-8 bg-[#333]" />
                <div>
                  <p className="text-[11px] text-[#666] uppercase tracking-wide">Paid</p>
                  <p className="text-sm font-semibold text-emerald-400">AED {formatCurrency(chargesTotals.totalPaid)}</p>
                </div>
                <div className="w-px h-8 bg-[#333]" />
                <div>
                  <p className="text-[11px] text-[#666] uppercase tracking-wide">Balance</p>
                  <p className={`text-sm font-semibold ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                    AED {formatCurrency(Math.max(0, (chargesTotals.grandTotal || formData.invoiceTotal) - chargesTotals.totalPaid))}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[#333] rounded-lg transition-colors">
                <X className="w-5 h-5 text-[#666] hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-4">
            {[
              { key: 'form', label: 'Details', icon: ClipboardList },
              { key: 'charges', label: 'Charges', icon: Receipt, count: allCharges.length },
              { key: 'payments', label: 'Payments', icon: CreditCard, count: allPayments.length },
              { key: 'documents', label: 'Documents', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`relative flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab.key 
                    ? 'text-white bg-gradient-to-t from-[#222] to-transparent border-[#888]' 
                    : 'text-[#666] hover:text-[#999] hover:bg-[#0d0d0d] border-transparent'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    activeTab === tab.key ? 'bg-[#444] text-white' : 'bg-[#333] text-[#888]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ============ VALIDATION ERRORS ============ */}
        {validationErrors.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <X className="w-3 h-3 text-red-400" />
              </div>
              <div>
                <p className="text-red-400 font-medium text-sm mb-2">Please fix the following errors:</p>
                <ul className="text-red-400/80 text-sm space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
              <button onClick={() => setValidationErrors([])} className="ml-auto text-red-400/50 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============ CONTENT ============ */}
        <div className="flex-1 overflow-y-auto p-6 relative min-h-0 bg-[#0a0a0a]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#333] border-t-[#888] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* FORM TAB */}
              {activeTab === 'form' && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Customer Information */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#333] bg-[#111]">
                      <h3 className="text-[13px] font-medium text-[#999] flex items-center gap-2">
                        <User className="w-4 h-4" /> Customer Information
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[12px] text-[#666] mb-2">Full Name</label>
                          <input type="text" value={formData.customerName} onChange={(e) => handleInputChange('customerName', e.target.value)} placeholder="Customer Name" className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner placeholder-[#555] focus:outline-none focus:border-[#666] transition-colors" required />
                        </div>
                        <div>
                          <label className="block text-[12px] text-[#666] mb-2">Phone Number</label>
                          <input type="tel" value={formData.contactNo} onChange={(e) => handleInputChange('contactNo', e.target.value)} placeholder="+971 XX XXX XXXX" className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner placeholder-[#555] focus:outline-none focus:border-[#666] transition-colors" required />
                        </div>
                        <div>
                          <label className="block text-[12px] text-[#666] mb-2">Email Address</label>
                          <input type="email" value={formData.emailAddress} onChange={(e) => handleInputChange('emailAddress', e.target.value)} placeholder="customer@email.com" className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner placeholder-[#555] focus:outline-none focus:border-[#666] transition-colors" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-4">
                        <div>
                          <label className="block text-[12px] text-[#666] mb-2">ID Type</label>
                          <select value={formData.customerIdType} onChange={(e) => handleInputChange('customerIdType', e.target.value)} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner focus:outline-none focus:border-[#666] transition-colors h-[42px]">
                            <option value="EID" className="bg-[#0d0d0d]">EID</option>
                            <option value="Passport" className="bg-[#0d0d0d]">Passport</option>
                          </select>
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[12px] text-[#666] mb-2">ID Number</label>
                          <input type="text" value={formData.customerIdNumber} onChange={(e) => handleInputChange('customerIdNumber', e.target.value)} placeholder="784-XXXX-XXXXXXX-X" className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner placeholder-[#555] focus:outline-none focus:border-[#666] transition-colors" required />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#333] bg-[#111]">
                      <h3 className="text-[13px] font-medium text-[#999] flex items-center gap-2">
                        <Car className="w-4 h-4" /> Vehicle Information
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2"><label className="block text-[12px] text-[#666] mb-2">Make & Model</label><input type="text" value={formData.makeModel} readOnly className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner cursor-not-allowed" /></div>
                        <div><label className="block text-[12px] text-[#666] mb-2">Year</label><input type="number" value={formData.modelYear} readOnly className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner cursor-not-allowed" /></div>
                        <div><label className="block text-[12px] text-[#666] mb-2">Mileage (km)</label><input type="number" value={formData.mileage} readOnly className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner cursor-not-allowed" /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div><label className="block text-[12px] text-[#666] mb-2">Exterior Colour</label><input type="text" value={formData.exteriorColour} readOnly className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner cursor-not-allowed" /></div>
                        <div><label className="block text-[12px] text-[#666] mb-2">Interior Colour</label><input type="text" value={formData.interiorColour} readOnly className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner cursor-not-allowed" /></div>
                        <div><label className="block text-[12px] text-[#666] mb-2">Chassis Number</label><input type="text" value={formData.chassisNo} readOnly className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner font-mono cursor-not-allowed" /></div>
                      </div>
                    </div>
                  </div>

                  {/* Coverage & Warranty */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Manufacturer Warranty */}
                    <div className={`bg-[#0a0a0a] rounded-lg border overflow-hidden transition-all ${formData.manufacturerWarranty ? 'border-[#555]' : 'border-[#333]'}`}>
                      <div className="px-4 py-3 flex items-center justify-between border-b border-[#333]">
                        <div>
                          <p className="text-sm font-medium text-white">Manufacturer Warranty</p>
                          <p className="text-[12px] text-[#666] mt-0.5">Factory coverage details</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInputChange('manufacturerWarranty', !formData.manufacturerWarranty)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${formData.manufacturerWarranty ? 'bg-gradient-to-r from-[#666] to-[#888]' : 'bg-[#333]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${formData.manufacturerWarranty ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                      {formData.manufacturerWarranty && (
                        <div className="p-4 grid grid-cols-2 gap-3 bg-[#0d0d0d]">
                          <div>
                            <label className="block text-[11px] text-[#666] uppercase tracking-wide mb-1.5">Expiry Date</label>
                            <input type="date" value={formData.manufacturerWarrantyExpiryDate} onChange={(e) => handleInputChange('manufacturerWarrantyExpiryDate', e.target.value)} className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner focus:outline-none focus:border-[#666]" />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#666] uppercase tracking-wide mb-1.5">Mileage Limit</label>
                            <input type="number" value={formData.manufacturerWarrantyExpiryMileage} onChange={(e) => handleInputChange('manufacturerWarrantyExpiryMileage', parseInt(e.target.value) || 0)} placeholder="e.g. 100000" className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner placeholder-[#555] focus:outline-none focus:border-[#666]" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dealer Service Package */}
                    <div className={`bg-[#0a0a0a] rounded-lg border overflow-hidden transition-all ${formData.dealerServicePackage ? 'border-[#555]' : 'border-[#333]'}`}>
                      <div className="px-4 py-3 flex items-center justify-between border-b border-[#333]">
                        <div>
                          <p className="text-sm font-medium text-white">Dealer Service Package</p>
                          <p className="text-[12px] text-[#666] mt-0.5">Prepaid service plan</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInputChange('dealerServicePackage', !formData.dealerServicePackage)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${formData.dealerServicePackage ? 'bg-gradient-to-r from-[#666] to-[#888]' : 'bg-[#333]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${formData.dealerServicePackage ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                      {formData.dealerServicePackage && (
                        <div className="p-4 grid grid-cols-2 gap-3 bg-[#0d0d0d]">
                          <div>
                            <label className="block text-[11px] text-[#666] uppercase tracking-wide mb-1.5">Expiry Date</label>
                            <input type="date" value={formData.dealerServicePackageExpiryDate} onChange={(e) => handleInputChange('dealerServicePackageExpiryDate', e.target.value)} className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner focus:outline-none focus:border-[#666]" />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#666] uppercase tracking-wide mb-1.5">Mileage Limit</label>
                            <input type="number" value={formData.dealerServicePackageExpiryMileage} onChange={(e) => handleInputChange('dealerServicePackageExpiryMileage', parseInt(e.target.value) || 0)} placeholder="e.g. 60000" className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner placeholder-[#555] focus:outline-none focus:border-[#666]" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#333] bg-[#111]">
                      <h3 className="text-[13px] font-medium text-[#999]">Additional Notes</h3>
                    </div>
                    <div className="p-4">
                      <textarea value={formData.additionalNotes} onChange={(e) => handleInputChange('additionalNotes', e.target.value)} rows={3} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner resize-none placeholder-[#555] focus:outline-none focus:border-[#666] transition-colors" placeholder="Any notes for this transaction..." />
                    </div>
                  </div>
                </form>
              )}

              {/* CHARGES TAB */}
              {activeTab === 'charges' && (
                <div className="space-y-5">
                  {/* Info banner when building quote */}
                  {!reservationId && pendingCharges.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-400 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Building quote - charges will be saved when you Generate the document
                    </div>
                  )}
                  <>
                      {/* Quick Add Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {CHARGE_TYPES.map((type) => {
                          const getDefaultPrice = () => {
                            if (type.value === 'vehicle_sale') return inventoryCar?.advertised_price_aed || formData.vehicleSalePrice || 0;
                            if (type.value === 'rta_fees') return 2800;
                            return 0;
                          };
                          const getDescription = () => {
                            if (type.value === 'vehicle_sale') return `Vehicle Sale - ${formData.makeModel || 'Vehicle'}`;
                            if (type.value === 'rta_fees') return 'RTA Registration & Transfer Fees';
                            return type.label;
                          };
                          return (
                            <button 
                              key={type.value} 
                              onClick={() => { 
                                setNewCharge({ 
                                  charge_type: type.value, 
                                  description: getDescription(), 
                                  unit_price: getDefaultPrice(), 
                                  vat_applicable: false 
                                }); 
                                setShowAddCharge(true); 
                              }} 
                              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                                type.value === 'discount' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20' 
                                  : 'bg-[#222] text-[#aaa] border border-[#333] hover:bg-[#333] hover:text-white'
                              }`}
                            >
                              {type.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Add Form */}
                      {showAddCharge && (
                        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#333]">
                          <h4 className="text-sm font-medium text-white mb-4">Add Charge</h4>
                          <div className="grid grid-cols-4 gap-4 items-end">
                            <div><label className="block text-[12px] text-[#666] mb-2">Type</label><select value={newCharge.charge_type} onChange={(e) => setNewCharge(prev => ({ ...prev, charge_type: e.target.value, description: CHARGE_TYPES.find(c => c.value === e.target.value)?.label || '' }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner">{CHARGE_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-[#0d0d0d]">{t.label}</option>)}</select></div>
                            <div><label className="block text-[12px] text-[#666] mb-2">Description</label><input type="text" value={newCharge.description} onChange={(e) => setNewCharge(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                            <div><label className="block text-[12px] text-[#666] mb-2">Amount (AED)</label><input type="number" value={newCharge.unit_price} onChange={(e) => setNewCharge(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                            <div className="flex gap-2">
                              <button onClick={handleAddCharge} disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#555] to-[#666] text-white text-sm font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors">{saving ? '...' : 'Add'}</button>
                              <button onClick={() => setShowAddCharge(false)} className="px-4 py-2.5 bg-[#333] text-white text-sm rounded-md hover:bg-[#444]">Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Charges Table */}
                      <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                        <table className="w-full">
                          <thead><tr className="border-b border-[#333] bg-[#111]"><th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Description</th><th className="px-4 py-3 text-right text-[11px] font-medium text-[#666] uppercase tracking-wider">Amount</th><th className="px-4 py-3 w-12"></th></tr></thead>
                          <tbody className="divide-y divide-[#333]">
                            {allCharges.length === 0 ? <tr><td colSpan={3} className="px-4 py-12 text-center text-[#555]">No charges added yet. Click a button above to add.</td></tr> : allCharges.map((c) => (
                              <tr key={c.id} className="hover:bg-[#0d0d0d] transition-colors">
                                <td className="px-4 py-3 text-white text-sm">{c.description}</td>
                                <td className={`px-4 py-3 text-right font-medium text-sm ${c.unit_price < 0 ? 'text-emerald-400' : 'text-white'}`}>{c.unit_price < 0 ? '-' : ''}AED {formatCurrency(Math.abs(c.total_amount || c.unit_price))}</td>
                                <td className="px-4 py-3"><button onClick={() => handleDeleteCharge(c.id)} className="p-1.5 hover:bg-red-500/20 rounded text-[#555] hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                          {allCharges.length > 0 && (
                            <tfoot><tr className="bg-[#0d0d0d] border-t border-[#333]"><td className="px-4 py-3 text-sm font-semibold text-white">Grand Total</td><td className="px-4 py-3 text-right text-base font-bold text-white">AED {formatCurrency(chargesTotals.grandTotal)}</td><td></td></tr></tfoot>
                          )}
                        </table>
                      </div>
                    </>
                </div>
              )}

              {/* PAYMENTS TAB */}
              {activeTab === 'payments' && (
                <div className="space-y-5">
                  {/* Balance Header */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-[#0f0f0f] rounded-lg border border-[#333]">
                    <div><p className="text-[11px] text-[#666] uppercase tracking-wide">Invoice Total</p><p className="text-xl font-bold text-white mt-1">AED {formatCurrency(chargesTotals.grandTotal || formData.invoiceTotal)}</p></div>
                    <div><p className="text-[11px] text-[#666] uppercase tracking-wide">Total Paid</p><p className="text-xl font-bold text-emerald-400 mt-1">AED {formatCurrency(chargesTotals.totalPaid)}</p></div>
                    <div className="text-right"><p className="text-[11px] text-[#666] uppercase tracking-wide">Balance Due</p><p className={`text-xl font-bold mt-1 ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>AED {formatCurrency(Math.max(0, (chargesTotals.grandTotal || formData.invoiceTotal) - chargesTotals.totalPaid))}</p></div>
                  </div>

                  {/* Add Payment Button */}
                  {!showAddPayment && !isPaid && (
                    <button onClick={() => { setNewPayment(prev => ({ ...prev, amount: chargesTotals.balanceDue || formData.amountDue })); setShowAddPayment(true); }} className="w-full py-3 border border-dashed border-[#333] hover:border-[#555] rounded-lg text-[#666] hover:text-white transition-all flex items-center justify-center gap-2 group">
                      <Plus className="w-4 h-4" /> Record New Payment
                    </button>
                  )}

                  {/* Add Payment Form */}
                  {showAddPayment && (
                    <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#333]">
                      <h4 className="text-sm font-medium text-white mb-4">Record Payment</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-[12px] text-[#666] mb-2">Method</label><select value={newPayment.payment_method} onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner">{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value} className="bg-[#0d0d0d]">{m.label}</option>)}</select></div>
                        <div><label className="block text-[12px] text-[#666] mb-2">Amount (AED)</label><input type="number" value={newPayment.amount} onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                        <div><label className="block text-[12px] text-[#666] mb-2">Reference</label><input type="text" value={newPayment.reference_number} onChange={(e) => setNewPayment(prev => ({ ...prev, reference_number: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" placeholder="Ref #" /></div>
                      </div>
                      {newPayment.payment_method === 'cheque' && (
                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#333]">
                          <div><label className="block text-[12px] text-[#666] mb-2">Bank</label><input type="text" value={newPayment.bank_name} onChange={(e) => setNewPayment(prev => ({ ...prev, bank_name: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                          <div><label className="block text-[12px] text-[#666] mb-2">Cheque #</label><input type="text" value={newPayment.cheque_number} onChange={(e) => setNewPayment(prev => ({ ...prev, cheque_number: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                          <div><label className="block text-[12px] text-[#666] mb-2">Date</label><input type="date" value={newPayment.cheque_date} onChange={(e) => setNewPayment(prev => ({ ...prev, cheque_date: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                        </div>
                      )}
                      {newPayment.payment_method === 'part_exchange' && (
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#333]">
                          <div><label className="block text-[12px] text-[#666] mb-2">Vehicle</label><input type="text" value={newPayment.part_exchange_vehicle} onChange={(e) => setNewPayment(prev => ({ ...prev, part_exchange_vehicle: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" placeholder="Make/Model/Year" /></div>
                          <div><label className="block text-[12px] text-[#666] mb-2">Chassis</label><input type="text" value={newPayment.part_exchange_chassis} onChange={(e) => setNewPayment(prev => ({ ...prev, part_exchange_chassis: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                        </div>
                      )}
                      <div className="flex gap-3 mt-4">
                        <button onClick={handleAddPayment} disabled={saving || !newPayment.amount} className="px-4 py-2.5 bg-gradient-to-r from-[#555] to-[#666] text-white text-sm font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors disabled:opacity-50">{saving ? '...' : 'Save Payment'}</button>
                        <button onClick={() => setShowAddPayment(false)} className="px-4 py-2.5 bg-[#333] text-white text-sm rounded-md hover:bg-[#444]">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Info banner when building quote */}
                  {!reservationId && pendingPayments.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-400 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Payments will be saved when you Generate the document
                    </div>
                  )}

                  {/* Payments Table */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-[#333] bg-[#111]"><th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Date</th><th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Method</th><th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Reference</th><th className="px-4 py-3 text-right text-[11px] font-medium text-[#666] uppercase tracking-wider">Amount</th><th className="px-4 py-3 text-center text-[11px] font-medium text-[#666] uppercase tracking-wider">Status</th></tr></thead>
                      <tbody className="divide-y divide-[#333]">
                        {allPayments.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-[#555]">No payments recorded</td></tr> : allPayments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-[#0d0d0d] transition-colors">
                            <td className="px-4 py-3 text-[#999] text-sm">{formatDate(p.payment_date)}</td>
                            <td className="px-4 py-3 text-white text-sm capitalize">{p.payment_method.replace('_', ' ')}</td>
                            <td className="px-4 py-3 text-[#666] font-mono text-sm">{p.reference_number || '-'}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-400 text-sm">AED {formatCurrency(p.amount)}</td>
                            <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-[11px] font-medium ${p.status === 'allocated' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#333] text-[#888]'}`}>{p.status?.replace('_', ' ') || 'pending'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DOCUMENTS TAB */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {/* RESERVATION DOCUMENT - Always show in reservation mode, view-only in invoice mode */}
                  <div className={`rounded-lg border overflow-hidden ${reservationPdfUrl ? 'bg-[#0f0f0f] border-[#333]' : 'bg-[#0d0d0d] border-[#222]'}`}>
                    <div className="px-4 py-3 border-b border-[#333] bg-[#111] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${reservationPdfUrl ? 'bg-[#444]' : 'bg-[#333]'}`}>
                          <FileText className={`w-4 h-4 ${reservationPdfUrl ? 'text-[#ccc]' : 'text-[#666]'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-white">Reservation Form</h3>
                            {reservationNumber && (
                              <span className="px-1.5 py-0.5 bg-[#444] text-[#ccc] text-[10px] font-mono rounded">
                                {reservationNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#666] mt-0.5">
                            {reservationPdfUrl 
                              ? (signingStatus === 'completed' ? 'Signed' : 'Ready') 
                              : 'Not generated'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {mode === 'reservation' && (
                          <button 
                            onClick={handleSubmit} 
                            disabled={saving} 
                            className="px-3 py-1.5 bg-gradient-to-r from-[#555] to-[#666] text-white text-sm font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            {reservationPdfUrl ? 'Regenerate' : 'Generate'}
                          </button>
                        )}
                        {reservationPdfUrl && (
                          <>
                            <button onClick={() => window.open(signedPdfUrl || reservationPdfUrl, '_blank')} className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md flex items-center gap-2 transition-colors">
                              <Eye className="w-4 h-4" /> View
                            </button>
                            <button onClick={() => window.open(signedPdfUrl || reservationPdfUrl, '_blank')} className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md flex items-center gap-2 transition-colors">
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Send for Signing - Reservation */}
                    {mode === 'reservation' && reservationPdfUrl && signingStatus !== 'completed' && (
                      <div className="px-4 py-4 border-t border-[#333] bg-gradient-to-r from-[#1a1a1a] to-[#111]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#555] to-[#333] flex items-center justify-center">
                              <Mail className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">Send for DocuSign</p>
                              <p className="text-[12px] text-[#888]">
                                {formData.emailAddress ? `Will be sent to ${formData.emailAddress}` : 'Add customer email in Details tab first'}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={handleSendForSigning} 
                            disabled={sendingForSigning || !formData.emailAddress} 
                            className="px-4 py-2 bg-gradient-to-r from-[#555] to-[#666] hover:from-[#666] hover:to-[#777] text-white text-sm font-medium rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {sendingForSigning ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <FileText className="w-4 h-4" />
                                Send for Signing
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Signed Badge */}
                    {signingStatus === 'completed' && signedPdfUrl && (
                      <div className="px-4 py-3 border-t border-[#333] flex items-center justify-between bg-emerald-500/5">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Check className="w-4 h-4" />
                          <span className="text-[12px] font-medium">Document Signed via DocuSign</span>
                        </div>
                        <button onClick={() => window.open(signedPdfUrl, '_blank')} className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[12px] rounded-md transition-colors flex items-center gap-1.5">
                          <Download className="w-3.5 h-3.5" /> Download Signed
                        </button>
                      </div>
                    )}
                  </div>

                  {/* INVOICE DOCUMENT - Only show in invoice mode */}
                  {mode === 'invoice' && (
                    <div className={`rounded-lg border overflow-hidden ${invoicePdfUrl ? 'bg-[#0f0f0f] border-[#333]' : 'bg-[#0d0d0d] border-[#222]'}`}>
                      <div className="px-4 py-3 border-b border-[#333] bg-[#111] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-md flex items-center justify-center ${invoicePdfUrl ? 'bg-emerald-500/10' : 'bg-[#333]'}`}>
                            <Receipt className={`w-4 h-4 ${invoicePdfUrl ? 'text-emerald-400' : 'text-[#666]'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-white">Invoice</h3>
                              {documentNumber && documentNumber.startsWith('INV') && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded">
                                  {documentNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-[#666] mt-0.5">
                              {invoicePdfUrl ? 'Ready' : 'Not generated'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSubmit} 
                            disabled={saving} 
                            className="px-3 py-1.5 bg-gradient-to-r from-[#555] to-[#666] text-white text-sm font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            {invoicePdfUrl ? 'Regenerate' : 'Generate'}
                          </button>
                          {invoicePdfUrl && (
                            <>
                              <button onClick={() => window.open(invoicePdfUrl, '_blank')} className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md flex items-center gap-2 transition-colors">
                                <Eye className="w-4 h-4" /> View
                              </button>
                              <button onClick={() => window.open(invoicePdfUrl, '_blank')} className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md flex items-center gap-2 transition-colors">
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Send for Signing - Invoice */}
                      {invoicePdfUrl && formData.emailAddress && (
                        <div className="px-4 py-3 border-t border-[#333] flex items-center justify-between bg-[#0d0d0d]">
                          <p className="text-[12px] text-[#888]">Send to {formData.emailAddress} for signing</p>
                          <button 
                            onClick={handleSendForSigning} 
                            disabled={sendingForSigning} 
                            className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md transition-colors disabled:opacity-50"
                          >
                            {sendingForSigning ? 'Sending...' : 'Send for Signing'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ============ FOOTER ============ */}
        <div className="px-6 py-4 border-t border-[#333] flex items-center justify-between shrink-0 bg-[#111]">
          <p className="text-[13px] text-[#666]">{formData.salesExecutive} • {formatDate(formData.date)}</p>
          <button onClick={onClose} className="px-4 py-2 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md transition-colors">Close</button>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#0d0d0d] rounded-xl w-full max-w-md shadow-2xl border border-[#333]">
            <div className="px-5 py-4 border-b border-[#333]">
              <h3 className="text-base font-semibold text-white">Company Signer</h3>
              <p className="text-[13px] text-[#666] mt-1">Enter the email of who should sign first from SilberArrows</p>
            </div>
            <div className="p-5">
              <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="email@silberarrows.ae" className="w-full px-3 py-2.5 bg-[#111] border border-[#333] rounded-md text-white placeholder-[#555] focus:outline-none focus:border-[#666] transition-colors" autoFocus />
            </div>
            <div className="px-5 py-4 border-t border-[#333] flex gap-3 justify-end">
              <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 bg-[#333] text-white rounded-md hover:bg-[#444] transition-colors">Cancel</button>
              <button onClick={handleConfirmSendForSigning} disabled={!companyEmail} className="px-4 py-2 bg-gradient-to-r from-[#555] to-[#666] text-white font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors disabled:opacity-50">Send for Signing</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
}
