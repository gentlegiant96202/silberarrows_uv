"use client";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/Header';
import { Copy } from 'lucide-react';

interface LeadRow {
  id: string;
  full_name: string;
  country_code: string;
  phone_number: string;
  model_of_interest: string;
  status: string;
  max_age: string;
  payment_type: string;
  monthly_budget: number;
  total_budget: number;
  created_at: string;
  lost_reason?: string;
  lost_reason_notes?: string;
  lost_at?: string;
}

const statusOptions = [
  'new_customer',
  'negotiation',
  'won',
  'delivered',
  'lost',
];

const maxAgeOptions = ['1yr', '2yrs', '3yrs', '4yrs', '5yrs', '6yrs', '7yrs', '8yrs', '9yrs', '10yrs'];

const lostReasonOptions = [
  'Price',
  'Availability', 
  'Timeline',
  'Finance Approval',
  'Customer Service',
  'No Response'
];

// Dynamic model list will be fetched from DB
// fallback initial empty array

export default function CustomersPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('');
  const [status, setStatus] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    const pageSize = 50;
    const from = page * pageSize;
    const to = from + pageSize; // request one extra row to check next page

    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (model) query = query.eq('model_of_interest', model);
    if (status) query = query.eq('status', status);
    if (maxAge) query = query.eq('max_age', maxAge);
    if (lostReason) query = query.eq('lost_reason', lostReason);

    const { data } = await query;
    const fetched = (data as LeadRow[]) || [];
    setHasNext(fetched.length > pageSize); // more rows beyond current page
    setRows(fetched.slice(0, pageSize));
    setLoading(false);
  };

  const fetchModels = useCallback(async () => {
    const { data } = await supabase.from('leads').select('model_of_interest');
    if (data) {
      const unique = Array.from(new Set(data.map((d: any) => d.model_of_interest))).filter(Boolean);
      unique.sort();
      setModelOptions(unique);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // initial + whenever page or filters change
  useEffect(() => {
    fetchRows();
  }, [model, status, maxAge, lostReason, page]);

  // reset page to 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [model, status, maxAge, lostReason]);

  // Reset lost reason when status changes to non-lost
  useEffect(() => {
    if (status !== 'lost') {
      setLostReason('');
    }
  }, [status]);

  // CSV Export functionality
  const exportToCSV = () => {
    if (rows.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'Name',
      'Phone',
      'Model',
      'Status', 
      'Max Age',
      'Payment Type',
      'Budget',
      'Created Date',
      'Lost Reason',
      'Lost Notes',
      'Lost Date'
    ];

    const csvData = rows.map(row => [
      row.full_name,
      `${row.country_code} ${row.phone_number}`,
      row.model_of_interest,
      row.status.replace('_', ' '),
      row.max_age,
      row.payment_type,
      row.payment_type === 'monthly' 
        ? `AED ${row.monthly_budget?.toLocaleString() || 0}/mo`
        : `AED ${row.total_budget?.toLocaleString() || 0}`,
      new Date(row.created_at).toLocaleDateString(),
      row.lost_reason || '',
      row.lost_reason_notes || '',
      row.lost_at ? new Date(row.lost_at).toLocaleDateString() : ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="p-4 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-black border border-white/10 text-white text-sm px-4 py-2 rounded"
          >
            <option value="">Model (Any)</option>
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value)}
            className="bg-black border border-white/10 text-white text-sm px-4 py-2 rounded"
          >
            <option value="">Max Age (Any)</option>
            {maxAgeOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-black border border-white/10 text-white text-sm px-4 py-2 rounded"
          >
            <option value="">Status (Any)</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Conditional Lost Reason Filter - Only shows when status is 'lost' */}
          {status === 'lost' && (
            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="bg-black border border-white/10 text-white text-sm px-4 py-2 rounded"
            >
              <option value="">Lost Reason (Any)</option>
              {lostReasonOptions.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setModel('');
              setStatus('');
              setMaxAge('');
              setLostReason('');
            }}
            className="px-4 py-2 bg-white/10 text-white text-sm rounded hover:bg-white/20 transition-colors"
          >
            Clear Filters
          </button>

          {/* CSV Export Button - Small Excel Icon */}
          <button
            onClick={exportToCSV}
            disabled={loading || rows.length === 0}
            title="Export to Excel"
            className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              <path d="M15.5 11L13.5 13L15.5 15L14 16.5L12 14.5L10 16.5L8.5 15L10.5 13L8.5 11L10 9.5L12 11.5L14 9.5L15.5 11Z" />
            </svg>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-white/10 rounded-lg">
          <table className="min-w-full text-sm text-white">
            <thead className="bg-white/5 backdrop-blur-sm text-left sticky top-0 z-10 shadow-md shadow-black/40">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Model</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Max Age</th>
                <th className="px-4 py-2">Payment</th>
                <th className="px-4 py-2">Budget</th>
                {status === 'lost' && <th className="px-4 py-2">Lost Reason</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={status === 'lost' ? 8 : 7} className="text-center py-6">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={status === 'lost' ? 8 : 7} className="py-12 text-center text-white/60">
                    <div className="flex flex-col items-center gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="w-10 h-10 text-white/40"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 19a7 7 0 100-14 7 7 0 000 14z" />
                      </svg>
                      <span>No customers match these filters</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r, index) => (
                  <tr
                    key={r.id}
                    className="border-t border-white/10 hover:bg-white/10 odd:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-2 whitespace-nowrap">{r.full_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="group inline-flex items-center gap-1">
                        {r.country_code} {r.phone_number}
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(`${r.country_code} ${r.phone_number}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-white"
                          title="Copy phone"
                        >
                          <Copy size={14} />
                        </button>
                      </span>
                    </td>
                    <td className="px-4 py-2">{r.model_of_interest}</td>
                    <td className="px-4 py-2 capitalize">
                      {r.status.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-2">{r.max_age}</td>
                    <td className="px-4 py-2 capitalize">{r.payment_type}</td>
                    <td className="px-4 py-2">
                      {r.payment_type === 'monthly'
                        ? `AED ${r.monthly_budget?.toLocaleString() || 0}/mo`
                        : `AED ${r.total_budget?.toLocaleString() || 0}`}
                    </td>
                    {status === 'lost' && (
                      <td className="px-4 py-2">
                        <div className="max-w-xs">
                          {r.lost_reason && (
                            <div className="text-xs">
                              <span className="font-medium text-red-400">{r.lost_reason}</span>
                              {r.lost_reason_notes && (
                                <div className="text-white/60 mt-1 truncate" title={r.lost_reason_notes}>
                                  {r.lost_reason_notes}
                                </div>
                              )}
                              {r.lost_at && (
                                <div className="text-white/40 text-xs mt-1">
                                  {new Date(r.lost_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          )}
                          {!r.lost_reason && (
                            <span className="text-white/40 text-xs">No reason recorded</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-3 text-xs text-white/70">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={page === 0}
            className="px-3 py-1 rounded bg-white/10 disabled:opacity-30 hover:bg-white/20 transition-colors"
          >
            ← Prev
          </button>
          <span>
            Page {page + 1}
          </span>
          <button
            onClick={() => setPage((p) => (hasNext ? p + 1 : p))}
            disabled={!hasNext}
            className="px-3 py-1 rounded bg-white/10 disabled:opacity-30 hover:bg-white/20 transition-colors"
          >
            Next →
          </button>
        </div>
      </main>
    </div>
  );
} 