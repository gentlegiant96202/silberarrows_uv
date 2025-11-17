// =====================================================
// RECEIVABLES EXCEL PARSER
// Parses multi-sheet Excel files with service advisor tabs
// =====================================================

import * as XLSX from 'xlsx';
import type { ExcelParseResult, ExcelSheetData, ExcelReceivableRow } from '@/types/receivables';

/**
 * Parses the receivables Excel file with multiple advisor sheets
 * Expected format: Each sheet named after advisor (DANIEL, ESSRAR, LUCY, etc.)
 * 
 * @param file - The Excel file to parse
 * @returns Promise<ExcelParseResult>
 */
export async function parseReceivablesExcel(file: File): Promise<ExcelParseResult> {
  const result: ExcelParseResult = {
    success: false,
    sheets: [],
    errors: [],
    total_records: 0
  };

  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    // Extract report date from first sheet (should be in "AS OF DD.MM.YYYY" format)
    const reportDate = extractReportDate(workbook);

    // Process each sheet (each sheet = one advisor)
    for (const sheetName of workbook.SheetNames) {
      // Skip sheets that don't look like advisor names
      if (sheetName.toLowerCase().includes('summary') || 
          sheetName.toLowerCase().includes('total') ||
          sheetName.length < 3) {
        continue;
      }

      try {
        const sheetData = parseAdvisorSheet(workbook.Sheets[sheetName], sheetName, reportDate);
        if (sheetData.transactions.length > 0) {
          result.sheets.push(sheetData);
          result.total_records += sheetData.transactions.length;
        }
      } catch (error) {
        result.errors.push(`Error parsing sheet "${sheetName}": ${error}`);
      }
    }

    result.success = result.sheets.length > 0 && result.errors.length === 0;
    
    if (result.sheets.length === 0) {
      result.errors.push('No valid advisor sheets found in Excel file');
    }

  } catch (error) {
    result.errors.push(`Failed to read Excel file: ${error}`);
  }

  return result;
}

/**
 * Extract report date from the Excel file
 * Looks for "AS OF DD.MM.YYYY" pattern
 */
function extractReportDate(workbook: XLSX.WorkBook): string {
  try {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1');
    
    // Search first 10 rows for "AS OF" pattern
    for (let row = 0; row <= Math.min(10, range.e.r); row++) {
      for (let col = 0; col <= Math.min(5, range.e.c); col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = firstSheet[cellAddress];
        
        if (cell && cell.v) {
          const cellValue = String(cell.v).toUpperCase();
          // Look for "AS OF DD.MM.YYYY" or "AS OF 01.11.2025"
          const dateMatch = cellValue.match(/AS\s+OF\s+(\d{2})\.(\d{2})\.(\d{4})/);
          if (dateMatch) {
            const [, day, month, year] = dateMatch;
            return `${year}-${month}-${day}`;
          }
        }
      }
    }
  } catch (error) {
  }
  
  // Default to today if not found
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse a single advisor sheet
 */
function parseAdvisorSheet(
  sheet: XLSX.WorkSheet, 
  advisorName: string,
  reportDate: string
): ExcelSheetData {
  const transactions: ExcelReceivableRow[] = [];
  
  // Convert sheet to JSON with header row
  const jsonData = XLSX.utils.sheet_to_json(sheet, { 
    header: 1, 
    raw: false,
    defval: ''
  }) as any[][];

  let currentCustomer: { name: string; id: string } | null = null;
  let inDataSection = false;

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    // Skip empty rows
    if (!row || row.every(cell => !cell || cell === '')) continue;

    const firstCell = String(row[0] || '').trim().toUpperCase();
    
    // Stop at summary or total sections
    if (firstCell.includes('TOTAL') && (firstCell.includes('>>') || firstCell.includes('--'))) {
      break;
    }
    
    if (firstCell.includes('SUMMARY:') || firstCell === 'SUMMARY') {
      break;
    }
    
    if (firstCell.includes('PER AGING') || firstCell.includes('DIFF')) {
      break;
    }

    // Detect start of data section
    if (firstCell.includes('AFTERSALES RECEIVABLE')) {
      inDataSection = true;
      continue;
    }

    if (!inDataSection) continue;

    // Check if this is a customer header row
    // Format: "CUSTOMER NAME (ID)"
    const customerMatch = String(row[0] || '').trim().match(/^([A-Z\s]+)\s*\((\d+)\)$/);
    
    if (customerMatch) {
      currentCustomer = {
        name: customerMatch[1].trim(),
        id: customerMatch[2].trim()
      };
      continue;
    }

    // Parse transaction row (must have a date in first column)
    if (currentCustomer && row.length >= 4) {
      try {
        const transaction = parseTransactionRow(row, currentCustomer, reportDate);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
      }
    }
  }
  return {
    advisor_name: advisorName.toUpperCase(),
    report_date: reportDate,
    transactions
  };
}

/**
 * Parse individual transaction row
 * Expected columns: Date | Reference | Invoice Amt | Receipt Amt | Balance | Age Days
 */
function parseTransactionRow(
  row: any[],
  customer: { name: string; id: string },
  reportDate: string
): ExcelReceivableRow | null {
  try {
    // Find columns (they may shift, so we need to be flexible)
    const dateStr = String(row[0] || '').trim();
    const reference = String(row[1] || '').trim();
    
    // Skip if first column looks like text or is empty
    if (!dateStr || !reference) return null;
    
    // Skip rows that start with common non-date text
    const dateUpper = dateStr.toUpperCase();
    if (dateUpper.includes('TOTAL') || 
        dateUpper.includes('SUMMARY') || 
        dateUpper.includes('PER AGING') ||
        dateUpper.length > 20) {  // Dates shouldn't be longer than 20 chars
      return null;
    }
    
    // Parse date - must be valid
    const transactionDate = parseExcelDate(dateStr);
    if (!transactionDate) return null;

    // Extract amounts - handle various formats
    const invoiceAmt = parseAmount(row[2]);
    const receiptAmt = parseAmount(row[3]);
    const balance = parseAmount(row[4]);
    const ageDays = parseInt(String(row[5] || '0'), 10);

    // Skip rows with no meaningful financial data
    if (balance === 0 && invoiceAmt === 0 && receiptAmt === 0) {
      return null;
    }

    return {
      customer_name: customer.name,
      customer_id: customer.id,
      transaction_date: transactionDate,
      reference_number: reference,
      invoice_amount: invoiceAmt,
      receipt_amount: receiptAmt,
      balance: balance,
      age_days: isNaN(ageDays) ? 0 : ageDays
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse Excel date in various formats
 */
function parseExcelDate(dateStr: string): string | null {
  if (!dateStr) return null;

  try {
    // Handle DD/MM/YYYY format
    const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Handle DD.MM.YYYY format
    const ddmmyyyyDotMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (ddmmyyyyDotMatch) {
      const [, day, month, year] = ddmmyyyyDotMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Handle YYYY-MM-DD format (already correct)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Try parsing as Date object
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
  }

  return null;
}

/**
 * Parse amount from various formats
 * Handles: "45,000", "AED 45000", "45000.50", "(45000)" (negative)
 */
function parseAmount(value: any): number {
  if (value === null || value === undefined || value === '') return 0;

  const str = String(value)
    .replace(/AED/gi, '')
    .replace(/[,\s]/g, '')
    .trim();

  // Handle negative amounts in parentheses
  if (str.startsWith('(') && str.endsWith(')')) {
    const num = parseFloat(str.slice(1, -1));
    return isNaN(num) ? 0 : -num;
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Validate parsed data before import
 */
export function validateParsedData(result: ExcelParseResult): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (result.sheets.length === 0) {
    errors.push('No advisor sheets found in file');
  }

  if (result.total_records === 0) {
    errors.push('No transaction records found in file');
  }

  for (const sheet of result.sheets) {
    if (!sheet.advisor_name) {
      errors.push(`Sheet missing advisor name`);
    }

    if (!sheet.report_date) {
      errors.push(`Sheet ${sheet.advisor_name} missing report date`);
    }

    // Check for data quality
    const invalidTransactions = sheet.transactions.filter(t => 
      !t.customer_name || !t.customer_id || !t.transaction_date
    );

    if (invalidTransactions.length > 0) {
      errors.push(`Sheet ${sheet.advisor_name} has ${invalidTransactions.length} invalid transactions`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

