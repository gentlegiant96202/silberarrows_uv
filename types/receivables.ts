// =====================================================
// SERVICE RECEIVABLES TYPES
// TypeScript interfaces for accounts receivable system
// =====================================================

export interface ServiceReceivable {
  id?: string;
  advisor_name: string;
  advisor_id?: string | null;
  customer_id: string;
  customer_name: string;
  transaction_date: string;
  transaction_type: 'INVOICE' | 'RECEIPT' | 'CREDIT';
  reference_number: string;
  invoice_amount: number;
  receipt_amount: number;
  balance: number;
  age_days: number;
  aging_bucket?: '0-30' | '31-60' | '61-90' | '91+';
  import_batch_id?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
}

export interface ReceivablesImport {
  id?: string;
  filename: string;
  report_date: string;
  uploaded_by?: string | null;
  record_count: number;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  created_at?: string;
}

export interface ReceivablesSummary {
  advisor_name: string;
  customer_id: string;
  customer_name: string;
  transaction_count: number;
  total_balance: number;
  balance_0_30: number;
  balance_31_60: number;
  balance_61_90: number;
  balance_91_plus: number;
  oldest_transaction_days: number;
  latest_transaction_date: string;
}

export interface AgingBucket {
  label: string;
  min_days: number;
  max_days: number | null;
  total: number;
  color: string;
}

export interface AdvisorReceivablesData {
  advisor_name: string;
  total_receivables: number;
  aging_breakdown: {
    days_0_30: number;
    days_31_60: number;
    days_61_90: number;
    days_91_plus: number;
  };
  customer_count: number;
  customers: ReceivablesSummary[];
}

// Excel parsing types
export interface ExcelReceivableRow {
  customer_name: string;
  customer_id: string;
  transaction_date: string;
  reference_number: string;
  invoice_amount: number;
  receipt_amount: number;
  balance: number;
  age_days: number;
}

export interface ExcelSheetData {
  advisor_name: string;
  report_date: string;
  transactions: ExcelReceivableRow[];
}

export interface ExcelParseResult {
  success: boolean;
  sheets: ExcelSheetData[];
  errors: string[];
  total_records: number;
}

// Filter types for UI
export interface ReceivablesFilter {
  advisor?: string;
  customer_id?: string;
  aging_bucket?: '0-30' | '31-60' | '61-90' | '91+' | 'all';
  min_balance?: number;
  date_from?: string;
  date_to?: string;
}

// Stats for dashboard cards
export interface ReceivablesStats {
  total_outstanding: number;
  total_customers: number;
  total_advisors: number;
  aging_breakdown: {
    days_0_30: number;
    days_31_60: number;
    days_61_90: number;
    days_91_plus: number;
  };
  at_risk_amount: number; // 91+ days
  latest_import_date?: string;
}

