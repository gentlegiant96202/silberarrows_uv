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
  { value: 'vehicle_sale', label: 'Vehicle Sale', icon: '🚗' },
  { value: 'extended_warranty', label: 'Extended Warranty', icon: '🛡️' },
  { value: 'ceramic_treatment', label: 'Ceramic Treatment', icon: '✨' },
  { value: 'service_care', label: 'ServiceCare', icon: '🔧' },
  { value: 'window_tints', label: 'Window Tints', icon: '🪟' },
  { value: 'rta_fees', label: 'RTA Fees', icon: '📋' },
  { value: 'other_addon', label: 'Other', icon: '➕' },
  { value: 'discount', label: 'Discount', icon: '💰' },
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
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [documentNumber, setDocumentNumber] = useState<string | null>(null);
  
  const [docusignEnvelopeId, setDocusignEnvelopeId] = useState<string | null>(null);
  const [signingStatus, setSigningStatus] = useState<string>('pending');
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
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

      const { data: resData } = await supabase.from('vehicle_reservations').select('*').eq('lead_id', lead.id).maybeSingle();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      }

      const response = await fetch('/api/generate-vehicle-document', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  const handleAddCharge = async () => {
    if (!reservationId || !newCharge.unit_price) return;
    setSaving(true);
    try {
      await supabase.from('uv_charges').insert({
        reservation_id: reservationId, charge_type: newCharge.charge_type,
        description: newCharge.description || CHARGE_TYPES.find(c => c.value === newCharge.charge_type)?.label || '',
        quantity: 1, unit_price: newCharge.unit_price, vat_applicable: newCharge.vat_applicable,
        display_order: charges.length, created_by: user?.id
      });
      await loadData();
      setShowAddCharge(false);
      setNewCharge({ charge_type: 'vehicle_sale', description: '', unit_price: 0, vat_applicable: false });
    } catch (error) { alert('Failed to add charge'); } finally { setSaving(false); }
  };

  const handleDeleteCharge = async (id: string) => {
    if (!confirm('Delete this charge?')) return;
    await supabase.from('uv_charges').delete().eq('id', id);
    await loadData();
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount) return;
    setSaving(true);
    try {
      const { data: paymentData } = await supabase.from('uv_payments').insert({
        lead_id: lead.id, payment_method: newPayment.payment_method, amount: newPayment.amount,
        reference_number: newPayment.reference_number || null, notes: newPayment.notes || null,
        bank_name: newPayment.bank_name || null, cheque_number: newPayment.cheque_number || null,
        cheque_date: newPayment.cheque_date || null, part_exchange_vehicle: newPayment.part_exchange_vehicle || null,
        part_exchange_chassis: newPayment.part_exchange_chassis || null, created_by: user?.id
      }).select().single();

      if (reservationId && paymentData && chargesTotals.balanceDue > 0) {
        const allocateAmount = Math.min(newPayment.amount, chargesTotals.balanceDue);
        await supabase.from('uv_payment_allocations').insert({ payment_id: paymentData.id, reservation_id: reservationId, allocated_amount: allocateAmount, created_by: user?.id });
        await supabase.from('uv_payments').update({ allocated_amount: allocateAmount, status: allocateAmount >= newPayment.amount ? 'allocated' : 'partially_allocated' }).eq('id', paymentData.id);
      }

      await loadData();
      setShowAddPayment(false);
      setNewPayment({ payment_method: 'cash', amount: 0, reference_number: '', notes: '', bank_name: '', cheque_number: '', cheque_date: '', part_exchange_vehicle: '', part_exchange_chassis: '' });
    } catch (error) { alert('Failed to record payment'); } finally { setSaving(false); }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0 }).format(n);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (!isOpen) return null;

  const isPaid = (chargesTotals.balanceDue <= 0 && chargesTotals.grandTotal > 0) || (formData.amountDue <= 0 && formData.invoiceTotal > 0);

  // ============================================================
  // RENDER
  // ============================================================
  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-3">
      <div className="bg-gradient-to-br from-zinc-900 via-neutral-900 to-stone-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col relative">
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-black/20 pointer-events-none rounded-2xl" />
        
        {/* ============ HEADER ============ */}
        <div className="relative p-5 border-b border-white/10 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-zinc-700 via-zinc-600 to-zinc-800 flex items-center justify-center shadow-lg border border-white/10">
                <Car className="w-7 h-7 text-white/90" />
              </div>
              {/* Title & Info */}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {formData.makeModel || 'Vehicle Account'}
                  </h2>
                  {documentNumber && (
                    <span className="px-2.5 py-1 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 text-gray-900 text-xs font-mono font-bold rounded-md shadow-sm">
                      {documentNumber}
                    </span>
                  )}
                  {isPaid && (
                    <span className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-md flex items-center gap-1">
                      <Check className="w-3 h-3" /> Paid
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-white/60">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {formData.customerName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {formData.contactNo}
                  </span>
                  {formData.modelYear > 0 && (
                    <span className="text-white/40">
                      {formData.modelYear} • {formData.exteriorColour}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Close Button */}
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors group">
              <X className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
            </button>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">Invoice Total</p>
              <p className="text-lg font-bold text-white">AED {formatCurrency(chargesTotals.grandTotal || formData.invoiceTotal)}</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">Paid</p>
              <p className="text-lg font-bold text-emerald-400">AED {formatCurrency(chargesTotals.totalPaid + (formData.hasPartExchange ? formData.partExchangeValue : 0))}</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">Balance Due</p>
              <p className={`text-lg font-bold ${isPaid ? 'text-emerald-400' : 'text-white'}`}>
                AED {formatCurrency(Math.max(0, formData.amountDue))}
              </p>
            </div>
            <div className="flex-1" />
            <div className="text-right">
              <p className="text-xs text-white/40">{mode === 'reservation' ? 'Reservation' : 'Invoice'}</p>
              <p className="text-sm text-white/70">{formData.salesExecutive}</p>
            </div>
          </div>
        </div>

        {/* ============ TABS ============ */}
        <div className="border-b border-white/10 px-5 shrink-0 relative bg-black/20">
          <div className="flex gap-1">
            {[
              { key: 'form', label: 'Details', icon: ClipboardList },
              { key: 'charges', label: 'Charges', icon: Receipt, count: charges.length },
              { key: 'payments', label: 'Payments', icon: CreditCard, count: payments.length },
              { key: 'documents', label: 'Documents', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all ${
                  activeTab === tab.key 
                    ? 'text-white' 
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    activeTab === tab.key ? 'bg-white/20' : 'bg-white/10'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gray-400 via-white to-gray-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ============ CONTENT ============ */}
        <div className="flex-1 overflow-y-auto p-5 relative">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* FORM TAB */}
              {activeTab === 'form' && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Document & Customer - Combined Row */}
                  <div className="grid grid-cols-2 gap-5">
                    {/* Document Details */}
                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] hover:border-white/10 transition-colors">
                      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> Document Details
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-white/40 mb-1.5">Sales Executive</label>
                          <input type="text" value={formData.salesExecutive} readOnly className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/80 text-sm focus:outline-none focus:border-white/20" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-white/40 mb-1.5">Date</label>
                          <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10" />
                        </div>
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] hover:border-white/10 transition-colors">
                      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <User className="w-3.5 h-3.5" /> Customer
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div><input type="email" value={formData.emailAddress} onChange={(e) => handleInputChange('emailAddress', e.target.value)} placeholder="Email Address" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/20 truncate" required /></div>
                        <div>
                          <select value={formData.customerIdType} onChange={(e) => handleInputChange('customerIdType', e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                            <option value="EID" className="bg-zinc-900">EID</option>
                            <option value="Passport" className="bg-zinc-900">Passport</option>
                          </select>
                        </div>
                        <div><input type="text" value={formData.customerIdNumber} onChange={(e) => handleInputChange('customerIdNumber', e.target.value)} placeholder="ID Number" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/20" required /></div>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] hover:border-white/10 transition-colors">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Car className="w-3.5 h-3.5" /> Vehicle Information
                    </h3>
                    <div className="grid grid-cols-5 gap-3">
                      <div className="col-span-2"><label className="block text-[11px] text-white/40 mb-1.5">Make & Model</label><input type="text" value={formData.makeModel} readOnly className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/80 text-sm truncate" /></div>
                      <div><label className="block text-[11px] text-white/40 mb-1.5">Year</label><input type="number" value={formData.modelYear} readOnly className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/80 text-sm" /></div>
                      <div><label className="block text-[11px] text-white/40 mb-1.5">Exterior</label><input type="text" value={formData.exteriorColour} readOnly className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/80 text-sm truncate" /></div>
                      <div><label className="block text-[11px] text-white/40 mb-1.5">Interior</label><input type="text" value={formData.interiorColour} readOnly className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/80 text-sm truncate" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div><label className="block text-[11px] text-white/40 mb-1.5">Chassis Number</label><input type="text" value={formData.chassisNo} readOnly className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 text-sm font-mono" /></div>
                      <div><label className="block text-[11px] text-white/40 mb-1.5">Mileage (km)</label><input type="number" value={formData.mileage} readOnly className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/80 text-sm" /></div>
                    </div>
                    {/* Warranty Row */}
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                      <label className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors">
                        <input type="checkbox" checked={formData.manufacturerWarranty} onChange={(e) => handleInputChange('manufacturerWarranty', e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-0" />
                        <div className="flex-1">
                          <span className="text-sm text-white/80 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" /> Manufacturer Warranty</span>
                          {formData.manufacturerWarranty && (
                            <div className="flex gap-2 mt-2">
                              <input type="date" value={formData.manufacturerWarrantyExpiryDate} onChange={(e) => handleInputChange('manufacturerWarrantyExpiryDate', e.target.value)} className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                              <input type="number" value={formData.manufacturerWarrantyExpiryMileage} onChange={(e) => handleInputChange('manufacturerWarrantyExpiryMileage', parseInt(e.target.value) || 0)} placeholder="KM" className="w-24 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                            </div>
                          )}
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors">
                        <input type="checkbox" checked={formData.dealerServicePackage} onChange={(e) => handleInputChange('dealerServicePackage', e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-0" />
                        <div className="flex-1">
                          <span className="text-sm text-white/80 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> Dealer Service Package</span>
                          {formData.dealerServicePackage && (
                            <div className="flex gap-2 mt-2">
                              <input type="date" value={formData.dealerServicePackageExpiryDate} onChange={(e) => handleInputChange('dealerServicePackageExpiryDate', e.target.value)} className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                              <input type="number" value={formData.dealerServicePackageExpiryMileage} onChange={(e) => handleInputChange('dealerServicePackageExpiryMileage', parseInt(e.target.value) || 0)} placeholder="KM" className="w-24 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Part Exchange */}
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] hover:border-white/10 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={formData.hasPartExchange} onChange={(e) => handleInputChange('hasPartExchange', e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-0" />
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2"><Car className="w-3.5 h-3.5" /> Part Exchange</span>
                    </label>
                    {formData.hasPartExchange && (
                      <div className="grid grid-cols-4 gap-3 mt-4">
                        <div className="col-span-2"><input type="text" value={formData.partExchangeMakeModel} onChange={(e) => handleInputChange('partExchangeMakeModel', e.target.value)} placeholder="Make & Model" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30" /></div>
                        <div><input type="text" value={formData.partExchangeModelYear} onChange={(e) => handleInputChange('partExchangeModelYear', e.target.value)} placeholder="Year" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30" /></div>
                        <div><input type="number" value={formData.partExchangeValue} onChange={(e) => handleInputChange('partExchangeValue', parseFloat(e.target.value) || 0)} placeholder="Value (AED)" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30" /></div>
                      </div>
                    )}
                  </div>

                  {/* Add-ons */}
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] hover:border-white/10 transition-colors">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" /> Add-ons
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'extendedWarranty', priceKey: 'extendedWarrantyPrice', label: 'Extended Warranty', icon: '🛡️' },
                        { key: 'ceramicTreatment', priceKey: 'ceramicTreatmentPrice', label: 'Ceramic Treatment', icon: '✨' },
                        { key: 'serviceCare', priceKey: 'serviceCarePrice', label: 'ServiceCare', icon: '🔧' },
                        { key: 'windowTints', priceKey: 'windowTintsPrice', label: 'Window Tints', icon: '🪟' },
                      ].map((addon) => (
                        <label key={addon.key} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors">
                          <span className="flex items-center gap-2">
                            <input type="checkbox" checked={formData[addon.key as keyof FormData] as boolean} onChange={(e) => handleInputChange(addon.key as keyof FormData, e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-0" />
                            <span className="text-sm text-white/80">{addon.icon} {addon.label}</span>
                          </span>
                          {formData[addon.key as keyof FormData] && (
                            <input type="number" value={formData[addon.priceKey as keyof FormData] as number} onChange={(e) => handleInputChange(addon.priceKey as keyof FormData, parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm text-right" placeholder="Price" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Summary */}
                  <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-xl p-4 border border-white/10">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5" /> Pricing
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-[11px] text-white/40 mb-1.5">Vehicle Sale Price (AED)</label><input type="number" value={formData.vehicleSalePrice} onChange={(e) => handleInputChange('vehicleSalePrice', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/20" /></div>
                      <div><label className="block text-[11px] text-white/40 mb-1.5">RTA Fees (AED)</label><input type="number" value={formData.rtaFees} onChange={(e) => handleInputChange('rtaFees', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/20" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
                      <div className="bg-white/5 rounded-lg p-3"><p className="text-[10px] text-white/40 uppercase">Add-ons</p><p className="text-lg font-semibold text-white">AED {formatCurrency(formData.addOnsTotal)}</p></div>
                      <div className="bg-white/5 rounded-lg p-3"><p className="text-[10px] text-white/40 uppercase">Invoice Total</p><p className="text-lg font-semibold text-white">AED {formatCurrency(formData.invoiceTotal)}</p></div>
                      <div className="bg-gradient-to-r from-zinc-700 to-zinc-600 rounded-lg p-3 shadow-lg"><p className="text-[10px] text-white/60 uppercase">Balance Due</p><p className="text-xl font-bold text-white">AED {formatCurrency(Math.max(0, formData.invoiceTotal - (chargesTotals.totalPaid || 0) - (formData.hasPartExchange ? formData.partExchangeValue : 0)))}</p></div>
                    </div>
                    <p className="text-[11px] text-white/30 mt-3 text-center">Record deposits and payments in the Payments tab</p>
                  </div>

                  {/* Notes */}
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <label className="block text-[11px] text-white/40 mb-1.5">Additional Notes</label>
                    <textarea value={formData.additionalNotes} onChange={(e) => handleInputChange('additionalNotes', e.target.value)} rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none placeholder-white/30 focus:outline-none focus:border-white/20" placeholder="Any notes for this transaction..." />
                  </div>

                  {/* PDF Status */}
                  {pdfGenerated && generatedPdfUrl && (
                    <div className={`rounded-xl p-4 border ${signingStatus === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${signingStatus === 'completed' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                          <span className={`font-medium ${signingStatus === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {signingStatus === 'completed' ? 'Document Signed' : 'PDF Ready'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => window.open(signedPdfUrl || generatedPdfUrl, '_blank')} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"><Eye className="w-4 h-4" /> View PDF</button>
                          {formData.emailAddress && signingStatus === 'pending' && (
                            <button type="button" onClick={handleSendForSigning} disabled={sendingForSigning} className="px-4 py-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 text-gray-900 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                              {sendingForSigning ? 'Sending...' : 'Send for Signing'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 text-sm rounded-lg transition-colors">Cancel</button>
                    <button type="submit" disabled={saving} className="px-6 py-2.5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 text-gray-900 text-sm font-semibold rounded-lg shadow-lg hover:shadow-xl hover:opacity-95 transition-all disabled:opacity-50 flex items-center gap-2">
                      {saving ? <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" /> : <FileText className="w-4 h-4" />}
                      {saving ? 'Generating...' : pdfGenerated ? 'Regenerate' : 'Generate'} {mode === 'reservation' ? 'Reservation' : 'Invoice'}
                    </button>
                  </div>
                </form>
              )}

              {/* CHARGES TAB */}
              {activeTab === 'charges' && (
                <div className="space-y-5">
                  {!reservationId ? (
                    <div className="text-center py-12 text-white/40">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Generate a reservation/invoice first to add charges</p>
                    </div>
                  ) : (
                    <>
                      {/* Quick Add Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {CHARGE_TYPES.map((type) => (
                          <button key={type.value} onClick={() => { setNewCharge({ charge_type: type.value, description: type.label, unit_price: type.value === 'vehicle_sale' ? formData.vehicleSalePrice : 0, vat_applicable: false }); setShowAddCharge(true); }} className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-lg text-sm text-white/70 hover:text-white transition-all flex items-center gap-2">
                            <span>{type.icon}</span> {type.label}
                          </button>
                        ))}
                      </div>

                      {/* Add Form */}
                      {showAddCharge && (
                        <div className="bg-white/[0.03] rounded-xl p-5 border border-white/10">
                          <h4 className="text-sm font-medium text-white mb-4">Add Charge</h4>
                          <div className="grid grid-cols-4 gap-4 items-end">
                            <div><label className="block text-[11px] text-white/40 mb-1.5">Type</label><select value={newCharge.charge_type} onChange={(e) => setNewCharge(prev => ({ ...prev, charge_type: e.target.value, description: CHARGE_TYPES.find(c => c.value === e.target.value)?.label || '' }))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm">{CHARGE_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-zinc-900">{t.icon} {t.label}</option>)}</select></div>
                            <div><label className="block text-[11px] text-white/40 mb-1.5">Description</label><input type="text" value={newCharge.description} onChange={(e) => setNewCharge(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm" /></div>
                            <div><label className="block text-[11px] text-white/40 mb-1.5">Amount (AED)</label><input type="number" value={newCharge.unit_price} onChange={(e) => setNewCharge(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm" /></div>
                            <div className="flex gap-2">
                              <button onClick={handleAddCharge} disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 text-gray-900 text-sm font-medium rounded-lg">{saving ? '...' : 'Add'}</button>
                              <button onClick={() => setShowAddCharge(false)} className="px-4 py-2.5 bg-white/10 text-white text-sm rounded-lg">Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Charges Table */}
                      <div className="bg-white/[0.02] rounded-xl border border-white/10 overflow-hidden">
                        <table className="w-full">
                          <thead><tr className="border-b border-white/10 bg-white/[0.02]"><th className="px-5 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Description</th><th className="px-5 py-4 text-right text-xs font-medium text-white/50 uppercase tracking-wider">Amount</th><th className="px-5 py-4 w-12"></th></tr></thead>
                          <tbody className="divide-y divide-white/5">
                            {charges.length === 0 ? <tr><td colSpan={3} className="px-5 py-12 text-center text-white/30">No charges added yet</td></tr> : charges.map((c) => (
                              <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-5 py-4 text-white">{c.description}</td>
                                <td className={`px-5 py-4 text-right font-medium ${c.unit_price < 0 ? 'text-emerald-400' : 'text-white'}`}>{c.unit_price < 0 ? '-' : ''}AED {formatCurrency(Math.abs(c.total_amount))}</td>
                                <td className="px-5 py-4"><button onClick={() => handleDeleteCharge(c.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                          {charges.length > 0 && (
                            <tfoot><tr className="bg-gradient-to-r from-zinc-800/80 to-zinc-700/80"><td className="px-5 py-4 text-sm font-bold text-white">Grand Total</td><td className="px-5 py-4 text-right text-lg font-bold text-white">AED {formatCurrency(chargesTotals.grandTotal)}</td><td></td></tr></tfoot>
                          )}
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* PAYMENTS TAB */}
              {activeTab === 'payments' && (
                <div className="space-y-5">
                  {/* Balance Header */}
                  <div className="grid grid-cols-3 gap-4 p-5 bg-gradient-to-r from-zinc-800/50 to-zinc-900/50 rounded-xl border border-white/10">
                    <div><p className="text-xs text-white/40 uppercase tracking-wider">Invoice Total</p><p className="text-2xl font-bold text-white">AED {formatCurrency(chargesTotals.grandTotal || formData.invoiceTotal)}</p></div>
                    <div><p className="text-xs text-white/40 uppercase tracking-wider">Total Paid</p><p className="text-2xl font-bold text-emerald-400">AED {formatCurrency(chargesTotals.totalPaid + (formData.hasPartExchange ? formData.partExchangeValue : 0))}</p></div>
                    <div className="text-right"><p className="text-xs text-white/40 uppercase tracking-wider">Balance Due</p><p className={`text-2xl font-bold ${isPaid ? 'text-emerald-400' : 'text-white'}`}>AED {formatCurrency(Math.max(0, formData.amountDue))}</p></div>
                  </div>

                  {/* Add Payment Button */}
                  {!showAddPayment && !isPaid && (
                    <button onClick={() => { setNewPayment(prev => ({ ...prev, amount: chargesTotals.balanceDue || formData.amountDue })); setShowAddPayment(true); }} className="w-full py-4 border-2 border-dashed border-white/20 hover:border-white/40 rounded-xl text-white/50 hover:text-white transition-all flex items-center justify-center gap-2 group">
                      <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" /> Record New Payment
                    </button>
                  )}

                  {/* Add Payment Form */}
                  {showAddPayment && (
                    <div className="bg-white/[0.03] rounded-xl p-5 border border-white/10">
                      <h4 className="text-sm font-medium text-white mb-4">Record Payment</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-[11px] text-white/40 mb-1.5">Method</label><select value={newPayment.payment_method} onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value }))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm">{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value} className="bg-zinc-900">{m.label}</option>)}</select></div>
                        <div><label className="block text-[11px] text-white/40 mb-1.5">Amount (AED)</label><input type="number" value={newPayment.amount} onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm" /></div>
                        <div><label className="block text-[11px] text-white/40 mb-1.5">Reference</label><input type="text" value={newPayment.reference_number} onChange={(e) => setNewPayment(prev => ({ ...prev, reference_number: e.target.value }))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm" placeholder="Ref #" /></div>
                      </div>
                      {newPayment.payment_method === 'cheque' && (
                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                          <div><label className="block text-[11px] text-white/40 mb-1.5">Bank</label><input type="text" value={newPayment.bank_name} onChange={(e) => setNewPayment(prev => ({ ...prev, bank_name: e.target.value }))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-[11px] text-white/40 mb-1.5">Cheque #</label><input type="text" value={newPayment.cheque_number} onChange={(e) => setNewPayment(prev => ({ ...prev, cheque_number: e.target.value }))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-[11px] text-white/40 mb-1.5">Date</label><input type="date" value={newPayment.cheque_date} onChange={(e) => setNewPayment(prev => ({ ...prev, cheque_date: e.target.value }))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm" /></div>
                        </div>
                      )}
                      {newPayment.payment_method === 'part_exchange' && (
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                          <div><label className="block text-[11px] text-white/40 mb-1.5">Vehicle</label><input type="text" value={newPayment.part_exchange_vehicle} onChange={(e) => setNewPayment(prev => ({ ...prev, part_exchange_vehicle: e.target.value }))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm" placeholder="Make/Model/Year" /></div>
                          <div><label className="block text-[11px] text-white/40 mb-1.5">Chassis</label><input type="text" value={newPayment.part_exchange_chassis} onChange={(e) => setNewPayment(prev => ({ ...prev, part_exchange_chassis: e.target.value }))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm" /></div>
                        </div>
                      )}
                      <div className="flex gap-3 mt-4">
                        <button onClick={handleAddPayment} disabled={saving || !newPayment.amount} className="px-5 py-2.5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 text-gray-900 text-sm font-medium rounded-lg disabled:opacity-50">{saving ? '...' : 'Save Payment'}</button>
                        <button onClick={() => setShowAddPayment(false)} className="px-5 py-2.5 bg-white/10 text-white text-sm rounded-lg">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Payments Table */}
                  <div className="bg-white/[0.02] rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-white/10 bg-white/[0.02]"><th className="px-5 py-4 text-left text-xs font-medium text-white/50 uppercase">Date</th><th className="px-5 py-4 text-left text-xs font-medium text-white/50 uppercase">Method</th><th className="px-5 py-4 text-left text-xs font-medium text-white/50 uppercase">Reference</th><th className="px-5 py-4 text-right text-xs font-medium text-white/50 uppercase">Amount</th><th className="px-5 py-4 text-center text-xs font-medium text-white/50 uppercase">Status</th></tr></thead>
                      <tbody className="divide-y divide-white/5">
                        {payments.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-white/30">No payments recorded</td></tr> : payments.map((p) => (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-4 text-white/70">{formatDate(p.payment_date)}</td>
                            <td className="px-5 py-4 text-white capitalize">{p.payment_method.replace('_', ' ')}</td>
                            <td className="px-5 py-4 text-white/50 font-mono text-sm">{p.reference_number || '-'}</td>
                            <td className="px-5 py-4 text-right font-semibold text-emerald-400">AED {formatCurrency(p.amount)}</td>
                            <td className="px-5 py-4 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.status === 'allocated' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'}`}>{p.status?.replace('_', ' ')}</span></td>
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
                  {/* Reservation Doc */}
                  <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.06] hover:border-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center"><FileText className="w-6 h-6 text-blue-400" /></div>
                        <div><h3 className="text-sm font-medium text-white">Reservation Form</h3><p className="text-xs text-white/40 mt-0.5">{generatedPdfUrl && mode === 'reservation' ? 'Ready to view' : 'Not generated yet'}</p></div>
                      </div>
                      {generatedPdfUrl && mode === 'reservation' && (
                        <div className="flex gap-2">
                          <button onClick={() => window.open(generatedPdfUrl, '_blank')} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"><Eye className="w-5 h-5 text-white/60" /></button>
                          <button onClick={() => window.open(generatedPdfUrl, '_blank')} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"><Download className="w-5 h-5 text-white/60" /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invoice Doc */}
                  <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.06] hover:border-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center"><FileText className="w-6 h-6 text-emerald-400" /></div>
                        <div><h3 className="text-sm font-medium text-white">Invoice Document</h3><p className="text-xs text-white/40 mt-0.5">{documentNumber || 'Not generated yet'}</p></div>
                      </div>
                      {generatedPdfUrl && mode === 'invoice' && (
                        <div className="flex gap-2">
                          <button onClick={() => window.open(generatedPdfUrl, '_blank')} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"><Eye className="w-5 h-5 text-white/60" /></button>
                          <button onClick={() => window.open(generatedPdfUrl, '_blank')} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"><Download className="w-5 h-5 text-white/60" /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signed Doc */}
                  {signedPdfUrl && (
                    <div className="bg-emerald-500/10 rounded-xl p-5 border border-emerald-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center"><Check className="w-6 h-6 text-emerald-400" /></div>
                          <div><h3 className="text-sm font-medium text-emerald-400">Signed Document</h3><p className="text-xs text-emerald-300/60 mt-0.5">Completed via DocuSign</p></div>
                        </div>
                        <button onClick={() => window.open(signedPdfUrl, '_blank')} className="p-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-colors"><Download className="w-5 h-5 text-emerald-400" /></button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ============ FOOTER ============ */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between shrink-0 bg-black/30 relative">
          <p className="text-xs text-white/40">{formData.salesExecutive} • {formatDate(formData.date)}</p>
          <button onClick={onClose} className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-sm rounded-lg transition-colors">Close</button>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 p-0.5 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="bg-zinc-900 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Company Signer</h3>
              <p className="text-sm text-white/50 mb-4">Enter the email of who should sign first from SilberArrows</p>
              <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="email@silberarrows.ae" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 mb-4" autoFocus />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowEmailModal(false)} className="px-5 py-2.5 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
                <button onClick={handleConfirmSendForSigning} disabled={!companyEmail} className="px-5 py-2.5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 text-gray-900 font-medium rounded-lg disabled:opacity-50">Send for Signing</button>
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
