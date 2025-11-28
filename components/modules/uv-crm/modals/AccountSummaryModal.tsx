'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';
import { useUserRole } from '@/lib/useUserRole';
import { 
  X, FileText, CreditCard, Receipt, ClipboardList,
  Plus, Trash2, Download, Eye, Check, DollarSign, Car, User
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
  { value: 'vehicle_sale', label: 'Vehicle Sale Price' },
  { value: 'extended_warranty', label: 'Extended Warranty' },
  { value: 'ceramic_treatment', label: 'Ceramic Treatment' },
  { value: 'service_care', label: 'ServiceCare Package' },
  { value: 'window_tints', label: 'Window Tints' },
  { value: 'rta_fees', label: 'RTA Registration Fees' },
  { value: 'other_addon', label: 'Other Add-on' },
  { value: 'discount', label: 'Discount' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'part_exchange', label: 'Part Exchange' },
  { value: 'finance', label: 'Finance' },
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

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('form');

  // Get user's display name
  const getUserDisplayName = () => {
    if (!user) return '';
    if (user.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user.email) {
      const emailPrefix = user.email.split('@')[0];
      return emailPrefix.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'User';
  };

  // Form state
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

  // Other state
  const [inventoryCar, setInventoryCar] = useState<InventoryCar | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [documentNumber, setDocumentNumber] = useState<string | null>(null);
  
  // DocuSign state
  const [docusignEnvelopeId, setDocusignEnvelopeId] = useState<string | null>(null);
  const [signingStatus, setSigningStatus] = useState<string>('pending');
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [sendingForSigning, setSendingForSigning] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [companyEmail, setCompanyEmail] = useState('');

  // Accounting state
  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newCharge, setNewCharge] = useState({ charge_type: 'vehicle_sale', description: '', unit_price: 0, vat_applicable: false });
  const [newPayment, setNewPayment] = useState({ payment_method: 'cash', amount: 0, reference_number: '', notes: '', bank_name: '', cheque_number: '', cheque_date: '', part_exchange_vehicle: '', part_exchange_chassis: '' });

  // Calculated totals
  const chargesTotals = {
    subtotal: charges.reduce((sum, c) => sum + (c.total_amount || 0), 0),
    vat: charges.reduce((sum, c) => sum + (c.vat_amount || 0), 0),
    get grandTotal() { return this.subtotal + this.vat; },
    totalPaid: allocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0),
    get balanceDue() { return this.grandTotal - this.totalPaid; }
  };

  // ============================================================
  // DATA LOADING
  // ============================================================
  const loadData = useCallback(async () => {
    if (!lead.id) return;
    setLoading(true);

    try {
      // Load inventory car
      if (lead.inventory_car_id) {
        const { data: carData } = await supabase.from('cars').select('*').eq('id', lead.inventory_car_id).single();
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
        }
      }

      // Load existing reservation
      const { data: resData } = await supabase
        .from('vehicle_reservations')
        .select('*')
        .eq('lead_id', lead.id)
        .maybeSingle();

      if (resData) {
        setIsEditing(true);
        setReservationId(resData.id);
        setDocumentNumber(resData.document_number);
        setGeneratedPdfUrl(mode === 'reservation' ? resData.reservation_pdf_url : resData.invoice_pdf_url);
        setPdfGenerated(!!(mode === 'reservation' ? resData.reservation_pdf_url : resData.invoice_pdf_url));
        setDocusignEnvelopeId(resData.docusign_envelope_id);
        setSigningStatus(resData.signing_status || 'pending');
        setSignedPdfUrl(resData.signed_pdf_url);

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

        // Load charges
        const { data: chargesData } = await supabase.from('uv_charges').select('*').eq('reservation_id', resData.id).order('display_order');
        setCharges(chargesData || []);

        // Load allocations
        const { data: allocData } = await supabase.from('uv_payment_allocations').select('*').eq('reservation_id', resData.id);
        setAllocations(allocData || []);
      }

      // Load payments for lead
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
      loadData();
      setActiveTab('form');
    }
  }, [isOpen, loadData]);

  // Auto-calculate totals
  useEffect(() => {
    const addOnsTotal =
      (formData.extendedWarranty ? formData.extendedWarrantyPrice : 0) +
      (formData.ceramicTreatment ? formData.ceramicTreatmentPrice : 0) +
      (formData.serviceCare ? formData.serviceCarePrice : 0) +
      (formData.windowTints ? formData.windowTintsPrice : 0);
    const invoiceTotal = formData.vehicleSalePrice + formData.rtaFees + addOnsTotal;
    const amountDue = invoiceTotal - formData.deposit - (formData.hasPartExchange ? formData.partExchangeValue : 0);
    setFormData(prev => ({ ...prev, addOnsTotal, invoiceTotal, amountDue }));
  }, [formData.extendedWarrantyPrice, formData.ceramicTreatmentPrice, formData.serviceCarePrice, formData.windowTintsPrice, formData.vehicleSalePrice, formData.rtaFees, formData.deposit, formData.partExchangeValue, formData.extendedWarranty, formData.ceramicTreatment, formData.serviceCare, formData.windowTints, formData.hasPartExchange]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const reservationData = {
        lead_id: lead.id,
        document_type: mode,
        document_status: 'pending',
        sales_executive: formData.salesExecutive,
        document_date: formData.date,
        customer_name: formData.customerName,
        contact_no: formData.contactNo,
        email_address: formData.emailAddress,
        customer_id_type: formData.customerIdType,
        customer_id_number: formData.customerIdNumber,
        vehicle_make_model: formData.makeModel,
        model_year: formData.modelYear,
        chassis_no: formData.chassisNo,
        vehicle_exterior_colour: formData.exteriorColour,
        vehicle_interior_colour: formData.interiorColour,
        vehicle_mileage: formData.mileage,
        manufacturer_warranty: formData.manufacturerWarranty,
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
        rta_fees: formData.rtaFees,
        vehicle_sale_price: formData.vehicleSalePrice,
        add_ons_total: formData.addOnsTotal,
        invoice_total: formData.invoiceTotal,
        deposit: formData.deposit,
        amount_due: formData.amountDue,
        additional_notes: formData.additionalNotes,
        created_by: user?.id || null
      };

      let savedReservation;
      
      if (reservationId) {
        const { data, error } = await supabase
          .from('vehicle_reservations')
          .update({ ...reservationData, updated_at: new Date().toISOString() })
          .eq('id', reservationId)
          .select()
          .single();
        if (error) throw error;
        savedReservation = data;
      } else {
        const { data, error } = await supabase
          .from('vehicle_reservations')
          .insert([reservationData])
          .select()
          .single();
        if (error) throw error;
        savedReservation = data;
        setReservationId(data.id);
      }

      // Generate PDF
      const response = await fetch('/api/generate-vehicle-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, formData, leadId: lead.id, reservationId: savedReservation.id })
      });

      if (!response.ok) throw new Error('Failed to generate document');

      const result = await response.json();
      if (result.pdfUrl) {
        await supabase.from('vehicle_reservations').update({ pdf_url: result.pdfUrl, document_status: 'completed' }).eq('id', savedReservation.id);
        setGeneratedPdfUrl(result.pdfUrl);
        setPdfGenerated(true);
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

  const handleSendForSigning = () => {
    if (!generatedPdfUrl) { alert('Generate document first'); return; }
    if (!formData.emailAddress) { alert('Add customer email first'); return; }
    setShowEmailModal(true);
  };

  const handleConfirmSendForSigning = async () => {
    if (!companyEmail) return;
    setSendingForSigning(true);
    setShowEmailModal(false);
    try {
      const response = await fetch('/api/docusign/send-for-signing-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id, documentType: mode, customerEmail: formData.emailAddress,
          customerName: formData.customerName, companySignerEmail: companyEmail,
          documentTitle: mode === 'reservation' ? 'Vehicle Reservation Form' : 'Vehicle Invoice',
          pdfUrl: generatedPdfUrl, formData
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

  // Charge handlers
  const handleAddCharge = async () => {
    if (!reservationId || !newCharge.unit_price) return;
    setSaving(true);
    try {
      await supabase.from('uv_charges').insert({
        reservation_id: reservationId,
        charge_type: newCharge.charge_type,
        description: newCharge.description || CHARGE_TYPES.find(c => c.value === newCharge.charge_type)?.label || '',
        quantity: 1,
        unit_price: newCharge.unit_price,
        vat_applicable: newCharge.vat_applicable,
        display_order: charges.length,
        created_by: user?.id
      });
      await loadData();
      setShowAddCharge(false);
      setNewCharge({ charge_type: 'vehicle_sale', description: '', unit_price: 0, vat_applicable: false });
    } catch (error) {
      alert('Failed to add charge');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCharge = async (id: string) => {
    if (!confirm('Delete this charge?')) return;
    await supabase.from('uv_charges').delete().eq('id', id);
    await loadData();
  };

  // Payment handlers
  const handleAddPayment = async () => {
    if (!newPayment.amount) return;
    setSaving(true);
    try {
      const { data: paymentData } = await supabase.from('uv_payments').insert({
        lead_id: lead.id,
        payment_method: newPayment.payment_method,
        amount: newPayment.amount,
        reference_number: newPayment.reference_number || null,
        notes: newPayment.notes || null,
        bank_name: newPayment.bank_name || null,
        cheque_number: newPayment.cheque_number || null,
        cheque_date: newPayment.cheque_date || null,
        part_exchange_vehicle: newPayment.part_exchange_vehicle || null,
        part_exchange_chassis: newPayment.part_exchange_chassis || null,
        created_by: user?.id
      }).select().single();

      if (reservationId && paymentData && chargesTotals.balanceDue > 0) {
        const allocateAmount = Math.min(newPayment.amount, chargesTotals.balanceDue);
        await supabase.from('uv_payment_allocations').insert({
          payment_id: paymentData.id, reservation_id: reservationId, allocated_amount: allocateAmount, created_by: user?.id
        });
        await supabase.from('uv_payments').update({
          allocated_amount: allocateAmount,
          status: allocateAmount >= newPayment.amount ? 'allocated' : 'partially_allocated'
        }).eq('id', paymentData.id);
      }

      await loadData();
      setShowAddPayment(false);
      setNewPayment({ payment_method: 'cash', amount: 0, reference_number: '', notes: '', bank_name: '', cheque_number: '', cheque_date: '', part_exchange_vehicle: '', part_exchange_chassis: '' });
    } catch (error) {
      alert('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0 }).format(n);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (!isOpen) return null;

  // ============================================================
  // RENDER
  // ============================================================
  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* HEADER */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white">
              {mode === 'reservation' ? 'Vehicle Reservation' : 'Invoice'} Account
            </h2>
            {documentNumber && (
              <span className="px-2 py-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-gray-900 text-xs font-mono font-bold rounded">
                {documentNumber}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-white/70" /></button>
        </div>

        {/* TABS */}
        <div className="border-b border-white/10 px-4 shrink-0">
          <div className="flex gap-1">
            {[
              { key: 'form', label: 'Details', icon: ClipboardList },
              { key: 'charges', label: 'Charges', icon: Receipt },
              { key: 'payments', label: 'Payments', icon: CreditCard },
              { key: 'documents', label: 'Documents', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full"></div>
            </div>
          ) : (
            <>
              {/* ============ FORM TAB ============ */}
              {activeTab === 'form' && (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  {/* Document Details */}
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <h3 className="text-sm font-medium text-white mb-3">Document Details</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-white/70 mb-1">Sales Executive</label>
                        <input type="text" value={formData.salesExecutive} readOnly className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">Date</label>
                        <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <h3 className="text-sm font-medium text-white mb-3">Customer Information</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs text-white/70 mb-1">Name</label><input type="text" value={formData.customerName} readOnly className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                      <div><label className="block text-xs text-white/70 mb-1">Contact</label><input type="text" value={formData.contactNo} readOnly className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                      <div><label className="block text-xs text-white/70 mb-1">Email</label><input type="email" value={formData.emailAddress} onChange={(e) => handleInputChange('emailAddress', e.target.value)} placeholder="Enter email" className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" required /></div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">ID Type & Number</label>
                        <div className="flex gap-2">
                          <select value={formData.customerIdType} onChange={(e) => handleInputChange('customerIdType', e.target.value)} className="px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs">
                            <option value="EID" className="bg-gray-900">EID</option>
                            <option value="Passport" className="bg-gray-900">Passport</option>
                          </select>
                          <input type="text" value={formData.customerIdNumber} onChange={(e) => handleInputChange('customerIdNumber', e.target.value)} placeholder="ID Number" className="flex-1 px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" required />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <h3 className="text-sm font-medium text-white mb-3">Vehicle Information</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="block text-xs text-white/70 mb-1">Make & Model</label><input type="text" value={formData.makeModel} readOnly className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                      <div><label className="block text-xs text-white/70 mb-1">Year</label><input type="number" value={formData.modelYear} readOnly className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                      <div><label className="block text-xs text-white/70 mb-1">Chassis</label><input type="text" value={formData.chassisNo} readOnly className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                      <div><label className="block text-xs text-white/70 mb-1">Exterior</label><input type="text" value={formData.exteriorColour} readOnly className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                      <div><label className="block text-xs text-white/70 mb-1">Interior</label><input type="text" value={formData.interiorColour} readOnly className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                      <div><label className="block text-xs text-white/70 mb-1">Mileage</label><input type="number" value={formData.mileage} readOnly className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                    </div>
                    {/* Warranty */}
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/10">
                      <div>
                        <label className="flex items-center gap-2 text-xs text-white/80"><input type="checkbox" checked={formData.manufacturerWarranty} onChange={(e) => handleInputChange('manufacturerWarranty', e.target.checked)} className="rounded" /> Manufacturer Warranty</label>
                        {formData.manufacturerWarranty && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <input type="date" value={formData.manufacturerWarrantyExpiryDate} onChange={(e) => handleInputChange('manufacturerWarrantyExpiryDate', e.target.value)} className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs" placeholder="Expiry" />
                            <input type="number" value={formData.manufacturerWarrantyExpiryMileage} onChange={(e) => handleInputChange('manufacturerWarrantyExpiryMileage', parseInt(e.target.value) || 0)} className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs" placeholder="KM" />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs text-white/80"><input type="checkbox" checked={formData.dealerServicePackage} onChange={(e) => handleInputChange('dealerServicePackage', e.target.checked)} className="rounded" /> Dealer Service Package</label>
                        {formData.dealerServicePackage && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <input type="date" value={formData.dealerServicePackageExpiryDate} onChange={(e) => handleInputChange('dealerServicePackageExpiryDate', e.target.value)} className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs" />
                            <input type="number" value={formData.dealerServicePackageExpiryMileage} onChange={(e) => handleInputChange('dealerServicePackageExpiryMileage', parseInt(e.target.value) || 0)} className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Part Exchange */}
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <label className="flex items-center gap-2 text-sm font-medium text-white mb-3"><input type="checkbox" checked={formData.hasPartExchange} onChange={(e) => handleInputChange('hasPartExchange', e.target.checked)} className="rounded" /> Part Exchange</label>
                    {formData.hasPartExchange && (
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className="block text-xs text-white/70 mb-1">Make/Model</label><input type="text" value={formData.partExchangeMakeModel} onChange={(e) => handleInputChange('partExchangeMakeModel', e.target.value)} className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                        <div><label className="block text-xs text-white/70 mb-1">Year</label><input type="text" value={formData.partExchangeModelYear} onChange={(e) => handleInputChange('partExchangeModelYear', e.target.value)} className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                        <div><label className="block text-xs text-white/70 mb-1">Chassis</label><input type="text" value={formData.partExchangeChassisNo} onChange={(e) => handleInputChange('partExchangeChassisNo', e.target.value)} className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                        <div><label className="block text-xs text-white/70 mb-1">Colour</label><input type="text" value={formData.partExchangeExteriorColour} onChange={(e) => handleInputChange('partExchangeExteriorColour', e.target.value)} className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                        <div><label className="block text-xs text-white/70 mb-1">Mileage</label><input type="text" value={formData.partExchangeMileage} onChange={(e) => handleInputChange('partExchangeMileage', e.target.value)} className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                        <div><label className="block text-xs text-white/70 mb-1">Value (AED)</label><input type="number" value={formData.partExchangeValue} onChange={(e) => handleInputChange('partExchangeValue', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                      </div>
                    )}
                  </div>

                  {/* Add-ons */}
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <h3 className="text-sm font-medium text-white mb-3">Add-ons</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs text-white/80"><input type="checkbox" checked={formData.extendedWarranty} onChange={(e) => handleInputChange('extendedWarranty', e.target.checked)} className="rounded" /> Extended Warranty</label>{formData.extendedWarranty && <input type="number" value={formData.extendedWarrantyPrice} onChange={(e) => handleInputChange('extendedWarrantyPrice', parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs" />}</div>
                      <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs text-white/80"><input type="checkbox" checked={formData.ceramicTreatment} onChange={(e) => handleInputChange('ceramicTreatment', e.target.checked)} className="rounded" /> Ceramic Treatment</label>{formData.ceramicTreatment && <input type="number" value={formData.ceramicTreatmentPrice} onChange={(e) => handleInputChange('ceramicTreatmentPrice', parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs" />}</div>
                      <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs text-white/80"><input type="checkbox" checked={formData.serviceCare} onChange={(e) => handleInputChange('serviceCare', e.target.checked)} className="rounded" /> ServiceCare</label>{formData.serviceCare && <input type="number" value={formData.serviceCarePrice} onChange={(e) => handleInputChange('serviceCarePrice', parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs" />}</div>
                      <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs text-white/80"><input type="checkbox" checked={formData.windowTints} onChange={(e) => handleInputChange('windowTints', e.target.checked)} className="rounded" /> Window Tints</label>{formData.windowTints && <input type="number" value={formData.windowTintsPrice} onChange={(e) => handleInputChange('windowTintsPrice', parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs" />}</div>
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <h3 className="text-sm font-medium text-white mb-3">Payment</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="block text-xs text-white/70 mb-1">RTA Fees</label><input type="number" value={formData.rtaFees} onChange={(e) => handleInputChange('rtaFees', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                      <div><label className="block text-xs text-white/70 mb-1">Sale Price</label><input type="number" value={formData.vehicleSalePrice} onChange={(e) => handleInputChange('vehicleSalePrice', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                      <div><label className="block text-xs text-white/70 mb-1">Deposit</label><input type="number" value={formData.deposit} onChange={(e) => handleInputChange('deposit', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs" /></div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-white/10">
                      <div><label className="block text-xs text-white/50 mb-1">Add-ons</label><div className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs">AED {formatCurrency(formData.addOnsTotal)}</div></div>
                      <div><label className="block text-xs text-white/50 mb-1">Invoice Total</label><div className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs font-medium">AED {formatCurrency(formData.invoiceTotal)}</div></div>
                      <div><label className="block text-xs text-white/50 mb-1">Deposit + P/X</label><div className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs">AED {formatCurrency(formData.deposit + (formData.hasPartExchange ? formData.partExchangeValue : 0))}</div></div>
                      <div><label className="block text-xs text-white/50 mb-1">Amount Due</label><div className="px-2 py-1.5 bg-gradient-to-r from-gray-700 to-gray-600 border border-white/20 rounded text-white text-xs font-bold">AED {formatCurrency(formData.amountDue)}</div></div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <label className="block text-xs text-white/70 mb-1">Additional Notes</label>
                    <textarea value={formData.additionalNotes} onChange={(e) => handleInputChange('additionalNotes', e.target.value)} rows={2} className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs resize-none" placeholder="Notes..." />
                  </div>

                  {/* PDF Status */}
                  {pdfGenerated && generatedPdfUrl && (
                    <div className={`rounded-lg p-3 border ${signingStatus === 'completed' ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${signingStatus === 'completed' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`}></div>
                          <span className={`text-sm font-medium ${signingStatus === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {signingStatus === 'completed' ? 'Signed' : 'PDF Generated'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => window.open(signedPdfUrl || generatedPdfUrl, '_blank')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded flex items-center gap-1"><Eye className="w-3 h-3" /> View</button>
                          {formData.emailAddress && signingStatus === 'pending' && (
                            <button type="button" onClick={handleSendForSigning} disabled={sendingForSigning} className="px-3 py-1.5 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-gray-900 text-xs rounded">{sendingForSigning ? 'Sending...' : 'Send for Signing'}</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs rounded">Cancel</button>
                    <button type="submit" disabled={saving} className="px-4 py-2 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-gray-900 text-xs font-medium rounded disabled:opacity-50">
                      {saving ? 'Generating...' : pdfGenerated ? 'Regenerate' : 'Generate'} {mode === 'reservation' ? 'Reservation' : 'Invoice'}
                    </button>
                  </div>
                </form>
              )}

              {/* ============ CHARGES TAB ============ */}
              {activeTab === 'charges' && (
                <div className="space-y-4">
                  {!reservationId ? (
                    <div className="text-center py-8 text-white/50">Generate a reservation/invoice first to add charges</div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {CHARGE_TYPES.map((type) => (
                          <button key={type.value} onClick={() => { setNewCharge({ charge_type: type.value, description: type.label, unit_price: type.value === 'vehicle_sale' ? formData.vehicleSalePrice : 0, vat_applicable: false }); setShowAddCharge(true); }} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/70 hover:text-white">+ {type.label}</button>
                        ))}
                      </div>

                      {showAddCharge && (
                        <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                          <div className="grid grid-cols-4 gap-4 items-end">
                            <div><label className="block text-xs text-white/60 mb-1">Type</label><select value={newCharge.charge_type} onChange={(e) => setNewCharge(prev => ({ ...prev, charge_type: e.target.value, description: CHARGE_TYPES.find(c => c.value === e.target.value)?.label || '' }))} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm">{CHARGE_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-gray-900">{t.label}</option>)}</select></div>
                            <div><label className="block text-xs text-white/60 mb-1">Description</label><input type="text" value={newCharge.description} onChange={(e) => setNewCharge(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm" /></div>
                            <div><label className="block text-xs text-white/60 mb-1">Amount</label><input type="number" value={newCharge.unit_price} onChange={(e) => setNewCharge(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm" /></div>
                            <div className="flex gap-2">
                              <button onClick={handleAddCharge} disabled={saving} className="px-4 py-2 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-gray-900 text-sm rounded">{saving ? '...' : 'Add'}</button>
                              <button onClick={() => setShowAddCharge(false)} className="px-4 py-2 bg-white/10 text-white text-sm rounded">Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-white/10"><th className="px-4 py-3 text-left text-xs text-white/60">Description</th><th className="px-4 py-3 text-right text-xs text-white/60">Amount</th><th className="px-4 py-3 w-10"></th></tr></thead>
                          <tbody className="divide-y divide-white/5">
                            {charges.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-white/40">No charges</td></tr> : charges.map((c) => (
                              <tr key={c.id} className="hover:bg-white/5">
                                <td className="px-4 py-3 text-white">{c.description}</td>
                                <td className={`px-4 py-3 text-right ${c.unit_price < 0 ? 'text-green-400' : 'text-white'}`}>{c.unit_price < 0 ? '-' : ''}AED {formatCurrency(Math.abs(c.total_amount))}</td>
                                <td className="px-4 py-3"><button onClick={() => handleDeleteCharge(c.id)} className="p-1 hover:bg-red-500/20 rounded text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                          {charges.length > 0 && (
                            <tfoot className="border-t border-white/10">
                              <tr className="bg-gradient-to-r from-gray-800/50 to-gray-700/50"><td className="px-4 py-3 text-sm font-bold text-white">Total</td><td className="px-4 py-3 text-right text-sm font-bold text-white">AED {formatCurrency(chargesTotals.grandTotal)}</td><td></td></tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ============ PAYMENTS TAB ============ */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/60">Total: <span className="text-white font-medium">AED {formatCurrency(chargesTotals.grandTotal || formData.invoiceTotal)}</span></p>
                    <p className="text-right"><span className="text-sm text-white/60">Balance:</span> <span className={`text-xl font-bold ${chargesTotals.balanceDue <= 0 ? 'text-green-400' : 'text-white'}`}>AED {formatCurrency(Math.max(0, chargesTotals.balanceDue || formData.amountDue))}</span></p>
                  </div>

                  {!showAddPayment && (chargesTotals.balanceDue > 0 || formData.amountDue > 0) && (
                    <button onClick={() => { setNewPayment(prev => ({ ...prev, amount: chargesTotals.balanceDue || formData.amountDue })); setShowAddPayment(true); }} className="w-full py-3 border-2 border-dashed border-white/20 hover:border-white/40 rounded-lg text-white/60 hover:text-white text-sm flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Record Payment</button>
                  )}

                  {showAddPayment && (
                    <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                      <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-xs text-white/60 mb-1">Method</label><select value={newPayment.payment_method} onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value }))} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm">{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value} className="bg-gray-900">{m.label}</option>)}</select></div>
                        <div><label className="block text-xs text-white/60 mb-1">Amount</label><input type="number" value={newPayment.amount} onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm" /></div>
                        <div><label className="block text-xs text-white/60 mb-1">Reference</label><input type="text" value={newPayment.reference_number} onChange={(e) => setNewPayment(prev => ({ ...prev, reference_number: e.target.value }))} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm" placeholder="Ref #" /></div>
                      </div>
                      {newPayment.payment_method === 'cheque' && (
                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                          <div><label className="block text-xs text-white/60 mb-1">Bank</label><input type="text" value={newPayment.bank_name} onChange={(e) => setNewPayment(prev => ({ ...prev, bank_name: e.target.value }))} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm" /></div>
                          <div><label className="block text-xs text-white/60 mb-1">Cheque #</label><input type="text" value={newPayment.cheque_number} onChange={(e) => setNewPayment(prev => ({ ...prev, cheque_number: e.target.value }))} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm" /></div>
                          <div><label className="block text-xs text-white/60 mb-1">Cheque Date</label><input type="date" value={newPayment.cheque_date} onChange={(e) => setNewPayment(prev => ({ ...prev, cheque_date: e.target.value }))} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm" /></div>
                        </div>
                      )}
                      {newPayment.payment_method === 'part_exchange' && (
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                          <div><label className="block text-xs text-white/60 mb-1">Vehicle</label><input type="text" value={newPayment.part_exchange_vehicle} onChange={(e) => setNewPayment(prev => ({ ...prev, part_exchange_vehicle: e.target.value }))} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm" placeholder="Make/Model/Year" /></div>
                          <div><label className="block text-xs text-white/60 mb-1">Chassis</label><input type="text" value={newPayment.part_exchange_chassis} onChange={(e) => setNewPayment(prev => ({ ...prev, part_exchange_chassis: e.target.value }))} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm" /></div>
                        </div>
                      )}
                      <div className="flex gap-2 mt-4">
                        <button onClick={handleAddPayment} disabled={saving || !newPayment.amount} className="px-4 py-2 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-gray-900 text-sm rounded disabled:opacity-50">{saving ? '...' : 'Save Payment'}</button>
                        <button onClick={() => setShowAddPayment(false)} className="px-4 py-2 bg-white/10 text-white text-sm rounded">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-white/10"><th className="px-4 py-3 text-left text-xs text-white/60">Date</th><th className="px-4 py-3 text-left text-xs text-white/60">Method</th><th className="px-4 py-3 text-left text-xs text-white/60">Reference</th><th className="px-4 py-3 text-right text-xs text-white/60">Amount</th><th className="px-4 py-3 text-center text-xs text-white/60">Status</th></tr></thead>
                      <tbody className="divide-y divide-white/5">
                        {payments.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-white/40">No payments</td></tr> : payments.map((p) => (
                          <tr key={p.id} className="hover:bg-white/5">
                            <td className="px-4 py-3 text-white/70">{formatDate(p.payment_date)}</td>
                            <td className="px-4 py-3 text-white capitalize">{p.payment_method.replace('_', ' ')}</td>
                            <td className="px-4 py-3 text-white/60">{p.reference_number || '-'}</td>
                            <td className="px-4 py-3 text-right font-medium text-green-400">AED {formatCurrency(p.amount)}</td>
                            <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-xs ${p.status === 'allocated' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>{p.status?.replace('_', ' ')}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============ DOCUMENTS TAB ============ */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-400" /></div>
                        <div><h3 className="text-sm font-medium text-white">Reservation Form</h3><p className="text-xs text-white/50">{generatedPdfUrl && mode === 'reservation' ? 'Generated' : 'Not generated'}</p></div>
                      </div>
                      {generatedPdfUrl && mode === 'reservation' && (
                        <div className="flex gap-2">
                          <button onClick={() => window.open(generatedPdfUrl, '_blank')} className="p-2 bg-white/10 hover:bg-white/20 rounded"><Eye className="w-4 h-4 text-white/70" /></button>
                          <button onClick={() => window.open(generatedPdfUrl, '_blank')} className="p-2 bg-white/10 hover:bg-white/20 rounded"><Download className="w-4 h-4 text-white/70" /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center"><FileText className="w-5 h-5 text-green-400" /></div>
                        <div><h3 className="text-sm font-medium text-white">Invoice</h3><p className="text-xs text-white/50">{documentNumber || 'Not generated'}</p></div>
                      </div>
                      {generatedPdfUrl && mode === 'invoice' && (
                        <div className="flex gap-2">
                          <button onClick={() => window.open(generatedPdfUrl, '_blank')} className="p-2 bg-white/10 hover:bg-white/20 rounded"><Eye className="w-4 h-4 text-white/70" /></button>
                          <button onClick={() => window.open(generatedPdfUrl, '_blank')} className="p-2 bg-white/10 hover:bg-white/20 rounded"><Download className="w-4 h-4 text-white/70" /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  {signedPdfUrl && (
                    <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center"><Check className="w-5 h-5 text-green-400" /></div>
                          <div><h3 className="text-sm font-medium text-green-400">Signed Document</h3><p className="text-xs text-green-300/70">Completed via DocuSign</p></div>
                        </div>
                        <button onClick={() => window.open(signedPdfUrl, '_blank')} className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded"><Download className="w-4 h-4 text-green-400" /></button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between shrink-0 bg-black/20">
          <p className="text-xs text-white/50">{formData.salesExecutive}</p>
          <button onClick={onClose} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded">Close</button>
        </div>
      </div>

      {/* Email Modal for DocuSign */}
      {showEmailModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 p-0.5 rounded-xl w-full max-w-md">
            <div className="bg-black/90 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Company Signer Email</h3>
              <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="Enter company signer email" className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white mb-4" autoFocus />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 bg-white/10 text-white rounded-lg">Cancel</button>
                <button onClick={handleConfirmSendForSigning} disabled={!companyEmail} className="px-4 py-2 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-gray-900 rounded-lg disabled:opacity-50">Send</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
}
