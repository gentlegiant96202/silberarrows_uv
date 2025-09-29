"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, FileText, Receipt, AlertCircle } from "lucide-react";

interface InvoiceCharge {
  id: string;
  lease_id: string;
  billing_period: string;
  charge_type: string;
  total_amount: number;
  comment: string | null;
  quantity: number | null;
  unit_price: number | null;
  status: string;
  invoice_id: string | null;
  invoice_number: string | null;
  created_at: string;
  credit_note_id?: string | null;
}

interface InvoiceSummary {
  invoice_id: string;
  invoice_number: string;
  billing_period: string;
  charges: InvoiceCharge[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceSummary | null;
  onCreditNoteIssued: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-AE", {
    style: "decimal",
    minimumFractionDigits: 2,
  }).format(amount) + " AED";
};

const formatDate = (date: string) => new Date(date).toLocaleDateString("en-GB");

export default function IFRSCreditNoteModal({ isOpen, onClose, invoice, onCreditNoteIssued }: Props) {
  const [nextCreditNoteNumber, setNextCreditNoteNumber] = useState("CN-LE-XXXX");
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<{ [chargeId: string]: string }>({});
  const [reason, setReason] = useState("");
  const [issuing, setIssuing] = useState(false);

  const eligibleCharges = useMemo(() => {
    if (!invoice?.charges) return [] as InvoiceCharge[];
    return invoice.charges.filter((charge) => {
      if (!charge.invoice_id) return false;
      if (charge.charge_type === "vat") return false;
      if (charge.charge_type === "credit_note") return false;
      if (charge.comment?.startsWith("PAYMENT")) return false;
      return charge.status === "invoiced" || charge.status === "paid";
    });
  }, [invoice]);

  const selectedTotal = useMemo(() => {
    return eligibleCharges
      .filter((charge) => selectedChargeIds.includes(charge.id))
      .reduce((sum, charge) => {
        const customAmount = customAmounts[charge.id];
        const amount = customAmount ? parseFloat(customAmount) : charge.total_amount;
        return sum + (isNaN(amount) ? charge.total_amount : amount);
      }, 0);
  }, [eligibleCharges, selectedChargeIds, customAmounts]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedChargeIds([]);
      setCustomAmounts({});
      setReason("");
      return;
    }

    const fetchNextNumber = async () => {
      try {
        const { data, error } = await supabase.rpc("preview_next_credit_note_number");
        if (error) throw error;
        if (typeof data === "string") {
          setNextCreditNoteNumber(data);
        }
      } catch (error) {
        console.error("Error previewing next credit note number:", error);
        setNextCreditNoteNumber("CN-LE-XXXX");
      }
    };

    fetchNextNumber();
  }, [isOpen]);

  const toggleChargeSelection = (chargeId: string) => {
    setSelectedChargeIds((prev) =>
      prev.includes(chargeId)
        ? prev.filter((id) => id !== chargeId)
        : [...prev, chargeId]
    );
  };

  const handleIssueCredit = async () => {
    if (!invoice?.invoice_id) {
      alert("Unable to determine invoice details.");
      return;
    }

    if (selectedChargeIds.length === 0) {
      alert("Select at least one line to credit.");
      return;
    }

    setIssuing(true);
    try {
      const customAmountsArray = selectedChargeIds.map(chargeId => {
        const customAmount = customAmounts[chargeId];
        return customAmount ? parseFloat(customAmount) : null;
      }).filter(amount => amount !== null);

      const { data, error } = await supabase.rpc("ifrs_issue_credit_note", {
        p_invoice_id: invoice.invoice_id,
        p_charge_ids: selectedChargeIds,
        p_custom_amounts: customAmountsArray.length > 0 ? customAmountsArray : null,
        p_reason: reason || null,
      });

      if (error) throw error;

      const payload = typeof data === "string" ? JSON.parse(data) : data;
      alert(
        `Credit note issued successfully.\nCredit Note: ${
          payload?.credit_note_number || nextCreditNoteNumber
        }\nLines: ${payload?.lines || selectedChargeIds.length}\nTotal: ${formatCurrency(
          Math.abs(payload?.total_amount || selectedTotal)
        )}`
      );

      onCreditNoteIssued();
      onClose();
    } catch (error) {
      console.error("Error issuing credit note:", error);
      alert("Failed to issue credit note. Please try again.");
    } finally {
      setIssuing(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <FileText className="h-6 w-6 text-white/80" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Issue Credit Note</h2>
              <p className="text-sm text-white/60">Next sequence: {nextCreditNoteNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6 space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-white font-semibold text-lg">Invoice Overview</h3>
            <p className="text-sm text-white/60 mt-2">
              {invoice.invoice_number || invoice.invoice_id.slice(-8)} • Period {formatDate(invoice.billing_period)}
            </p>
            <p className="text-xs text-white/40 mt-1">Select the lines you wish to reverse. VAT entries are excluded automatically.</p>
          </div>

          {eligibleCharges.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
              No eligible invoice lines available for a credit note.
            </div>
          ) : (
            <div className="space-y-3">
              {eligibleCharges.map((charge) => {
                const isSelected = selectedChargeIds.includes(charge.id);
                return (
                  <label
                    key={charge.id}
                    className={`flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 ${
                      isSelected ? "ring-1 ring-white/30" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleChargeSelection(charge.id)}
                      className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-white focus:ring-white/40"
                    />
                    <div className="flex flex-1 items-start justify-between gap-4">
                      <div>
                        <p className="text-white font-medium">
                          {charge.comment || charge.charge_type.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-xs text-white/40 mt-1">
                          {formatDate(charge.billing_period)} • {charge.status.toUpperCase()}
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-white font-semibold">{formatCurrency(charge.total_amount)}</p>
                        {isSelected && (
                          <div>
                            <label className="block text-xs text-white/60 mb-1">Credit amount</label>
                            <input
                              type="number"
                              step="0.01"
                              max={charge.total_amount}
                              value={customAmounts[charge.id] || charge.total_amount}
                              onChange={(e) => {
                                const value = e.target.value;
                                setCustomAmounts(prev => ({
                                  ...prev,
                                  [charge.id]: value
                                }));
                              }}
                              className="w-24 px-2 py-1 text-xs rounded border border-white/20 bg-black/30 text-white focus:outline-none focus:ring-1 focus:ring-white/40"
                              placeholder={charge.total_amount.toString()}
                            />
                          </div>
                        )}
                        {charge.comment && (
                          <p className="text-xs text-white/40 max-w-[220px] truncate">{charge.comment}</p>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between text-white">
              <span className="text-sm text-white/60">Selected total</span>
              <span className="text-lg font-semibold">
                {formatCurrency(selectedTotal)}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-white/15 bg-black/30 p-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="Explain why this credit note is being issued"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <AlertCircle size={14} />
              Credit note lines will appear as negative charges and link back to the original invoice for audit purposes.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 p-6">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/15 px-4 py-2 text-white/70 transition hover:text-white hover:bg-white/10"
            disabled={issuing}
          >
            Cancel
          </button>
          <button
            onClick={handleIssueCredit}
            disabled={issuing || selectedChargeIds.length === 0}
            className="rounded-lg bg-gradient-to-br from-white/80 via-white/55 to-white/80 px-4 py-2 font-medium text-black/80 shadow-[0_0_28px_rgba(255,255,255,0.15)] transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {issuing ? "Issuing..." : "Issue Credit Note"}
          </button>
        </div>
      </div>
    </div>
  );
}


