# UV Accounting System - Training Guide

## Overview

The UV Accounting module manages all financial transactions for vehicle sales, including invoicing, payments, adjustments, and customer statements. It integrates with the CRM to provide a complete sales-to-cash workflow.

---

## 1. SALES ORDER FLOW

### Creating a Sales Order
1. Drag a lead from **New** to **Reserved** in the CRM Kanban
2. Sales Order modal opens automatically
3. Fill in:
   - Customer details (auto-populated from lead)
   - Vehicle details (auto-populated from inventory)
   - Line items (vehicle price, add-ons, discounts, part exchange)
   - Payment method: **Cash** or **Bank Finance**

### Sales Order Status
| Status | Description |
|--------|-------------|
| Draft | Order created, not yet invoiced |
| Invoiced | Invoice generated |
| Lost | Deal cancelled |

---

## 2. INVOICING

### Creating an Invoice
1. Open Sales Order → **Invoices** tab
2. Click **Convert to Invoice** (Admin only)
3. Invoice is generated with unique number (UV-INV-XXXX)

### Invoice Status
| Status | Description |
|--------|-------------|
| Pending | No payments received |
| Partial | Some payments allocated |
| Paid | Fully paid (including credits) |
| Reversed | Invoice cancelled |

### Reversing an Invoice
- Click **Reverse Invoice** (Admin/Accounts only)
- Creates automatic Credit Note for remaining balance
- Payments become unallocated (can be refunded or reallocated)

### Generating Invoice PDF
- Click **Generate Invoice** when fully paid
- PDF includes terms & conditions, payment breakdown
- Shows PAID stamp when balance = 0

---

## 3. PAYMENTS

### Recording a Payment
1. Open Sales Order → **Invoices** tab → **Payments** section
2. Click **Add Payment**
3. Enter:
   - Amount
   - Payment method (Cash, Bank Transfer, Card, Cheque, Bank Finance)
   - Reference number
4. Payment is assigned number (UV-PAY-XXXX)

### Payment Allocation
- Payments are recorded against the **customer**, not the invoice
- Allocate payments to invoices by clicking **Allocate**
- One payment can be split across multiple invoices
- Partially allocated payments appear in **Unallocated Payments** list

### Viewing Unallocated Payments
- Navigate to: **Accounts → Sales → Unallocated Payments**
- Shows all payments with amounts not yet allocated to invoices

---

## 4. ADJUSTMENTS (Admin/Accounts Only)

### Credit Notes
**Purpose:** Reduce what customer owes

**Use cases:**
- Invoice reversal
- Discount after invoice
- Error correction

**Creating:**
1. Open invoice → **Credit Notes** section
2. Click **Add Credit Note**
3. Enter amount (cannot exceed invoice balance) and reason
4. Credit Note number assigned (UV-CN-XXXX)

### Debit Notes
**Purpose:** Increase what customer owes

**Use cases:**
- Cancellation fees
- Additional charges
- Correction of undercharges

**Creating:**
1. Open invoice → **Debit Notes** section
2. Click **Add Debit Note**
3. Enter amount and reason
4. Debit Note number assigned (UV-DN-XXXX)

**Note:** After adding a debit note, you can allocate unallocated payments to cover it.

### Refunds
**Purpose:** Return money to customer

**Process:**
1. Open invoice → **Refunds** section
2. Click **Add Refund**
3. Select the **payment** to refund from
4. Enter amount (cannot exceed payment's available balance)
5. Enter method, reference, and reason
6. Refund number assigned (UV-REF-XXXX)

**Important:** Refunds are linked to specific payments for audit trail.

---

## 5. STATEMENT OF ACCOUNT (SOA)

### Viewing SOA
1. Open Sales Order → **Statement of Account** tab
2. Shows all transactions chronologically:
   - Invoices (debit)
   - Payments (credit)
   - Credit Notes (credit)
   - Debit Notes (debit)
   - Refunds (debit)

### SOA Summary Cards
| Card | Description |
|------|-------------|
| Invoiced | Total of all invoices |
| Debit Notes | Total additional charges |
| Paid | Total payments received |
| Credit Notes | Total credits applied |
| Refunds | Total money returned |
| Balance | Net amount due (or credit) |

### Downloading SOA
- Click **Download PDF** in SOA tab
- Generates professional PDF with full transaction history
- Landscape A4 format with company letterhead

---

## 6. CUSTOMER LEDGER

### Accessing
Navigate to: **Accounts → Sales → Ledger**

### Features
- Shows ALL customer transactions across all leads
- Filter by:
  - Customer (CIN or name)
  - Date range
  - Transaction type
- Click any row to open customer's Sales Order modal
- Export to Excel
- Running balance calculation

### Document Downloads
- Click PDF icon on any transaction to download/generate document
- Auto-generates if PDF doesn't exist

---

## 7. BANK FINANCE

### When to Use
Select **Bank Finance** as payment method on Sales Order

### Bank Finance Tab Features
1. **New Application** - Start finance application with a bank
2. **Document Collection** - Upload customer documents
3. **Bank Quotation** - Generate quotation for bank (may have different pricing)
4. **Status Tracking:**
   - Pending
   - Docs Collection
   - Submitted
   - Under Review
   - Approved
   - Declined
   - Cancelled

### Bank Finance List
Navigate to: **Accounts → Sales → Bank Finance**
- View all applications across customers
- Filter by status, date, customer
- Track approval amounts and processing time

---

## 8. PERMISSIONS

| Role | Capabilities |
|------|--------------|
| **Sales (CRM)** | View/edit sales orders, record payments, view invoices |
| **Accounts** | All of above + credit notes, debit notes, refunds, convert to invoice |
| **Admin** | All permissions |

---

## 9. DOCUMENT NUMBERS

All documents have gapless sequential numbers:

| Document | Format | Example |
|----------|--------|---------|
| Sales Order | UV-SO-XXXX | UV-SO-1001 |
| Invoice | UV-INV-XXXX | UV-INV-1001 |
| Payment | UV-PAY-XXXX | UV-PAY-1001 |
| Credit Note | UV-CN-XXXX | UV-CN-1001 |
| Debit Note | UV-DN-XXXX | UV-DN-1001 |
| Refund | UV-REF-XXXX | UV-REF-1001 |
| Bank Quotation | BQ-XXXX | BQ-1001 |

---

## 10. KEY FORMULAS

### Invoice Balance
```
Balance Due = Total Amount + Debit Notes - Credit Notes - Paid Amount
```

### Customer SOA Balance
```
Balance = Total Invoiced + Total Debit Notes - Total Paid - Total Credit Notes + Total Refunds
```

### Payment Available for Allocation
```
Available = Payment Amount - Allocated Amount - Refunded Amount
```

---

## 11. QUICK REFERENCE

### Invoice is Fully Paid When:
- `balance_due <= 0` (may include credits)

### Cannot Reverse Invoice If:
- Invoice is already reversed
- Invoice is signed (DocuSign completed)

### Cannot Create Credit Note If:
- Amount > Invoice balance due

### Cannot Create Refund If:
- Amount > Payment's available balance

### Cannot Allocate Payment If:
- Amount > Invoice balance due
- Amount > Payment's available balance

---

## 12. TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| "Invoice generation available once fully paid" | Ensure total payments + credits ≥ invoice amount |
| Payment won't allocate | Check if invoice is reversed or payment is already fully allocated |
| Credit note button disabled | No invoices with balance due > 0 |
| Refund button disabled | No payments with available balance > 0 |
| Can't see Credit/Debit Notes | Only Admin and Accounts roles have access |

---

## 13. AUDIT TRAIL

All transactions are recorded in the **Ledger** with:
- Transaction date
- Document reference
- Description
- Debit/Credit amounts
- Customer details
- PDF links

**Ledger entries are immutable** - corrections are made via new adjustments (credit notes, debit notes), not by modifying existing records.

---

*Last Updated: December 2024*
*SilberArrows Used Car Trading LLC*

