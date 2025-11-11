"use client";
import { useState } from 'react';
import { Calculator } from 'lucide-react';

// Fixed policy values (same for all cars)
const FIXED_POLICY = {
  depreciationBasis: 70, // %
  depreciationHorizon: 60, // months
  leaseTerm: 12, // months (all contracts are 12 months)
  buyoutAdminFee: 0, // AED
};

interface BuyoutRow {
  month: number;
  totalDepreciation: number;
  bookValue: number;
  interestCharge: number;
  buyoutPrice: number;
}

export default function LeasingCalculator() {
  const [acquisitionCost, setAcquisitionCost] = useState<number>(178000);
  const [interestRate, setInterestRate] = useState<number>(4);

  // Calculate buyout prices from month 12 to month 60
  const calculateBuyoutTable = (): BuyoutRow[] => {
    const { depreciationBasis, depreciationHorizon, leaseTerm, buyoutAdminFee } = FIXED_POLICY;
    
    const monthlyDepreciation = (acquisitionCost * (depreciationBasis / 100)) / depreciationHorizon;
    const rows: BuyoutRow[] = [];
    
    // Generate rows from month 12 to month 60
    for (let month = 12; month <= 60; month++) {
      const totalDepreciation = monthlyDepreciation * month;
      const bookValue = acquisitionCost - totalDepreciation;
      
      // Interest charge: Book value × Rate × (Lease term / 12)
      const interestCharge = bookValue * (interestRate / 100) * (leaseTerm / 12);
      
      // Buyout price = Book value + Interest + Admin fee
      const buyoutPrice = bookValue + interestCharge + buyoutAdminFee;
      
      rows.push({
        month,
        totalDepreciation,
        bookValue,
        interestCharge,
        buyoutPrice,
      });
    }
    
    return rows;
  };

  const buyoutTable = calculateBuyoutTable();

  return (
    <div className="h-full bg-black overflow-auto flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/60 backdrop-blur-2xl border-b border-white/10 px-6 py-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 rounded-xl flex items-center justify-center shadow-2xl">
            <Calculator className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-100 via-white to-gray-300 bg-clip-text text-transparent">
              Lease-to-Own Buyout Calculator
            </h1>
            <p className="text-sm text-white/50">Calculate buyout prices from month 12 to month 60</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-full mx-auto">
          <div className="grid grid-cols-1 gap-6">
            {/* Top Section: Inputs & Policy - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User Inputs */}
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                <h2 className="text-lg font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent mb-5">
                  INPUTS
                </h2>
                
                <div className="space-y-5">
                  {/* Acquisition Cost */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Acquisition cost (AED)
                    </label>
                    <input
                      type="number"
                      value={acquisitionCost}
                      onChange={(e) => setAcquisitionCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-black/40 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-400/50 transition-all shadow-lg"
                      placeholder="178000"
                    />
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Interest rate (annual %)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-black/40 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-400/50 transition-all shadow-lg"
                      placeholder="4"
                    />
                  </div>
                </div>
              </div>

              {/* Fixed Policy Values */}
              <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-gray-300 mb-4 tracking-wider">FIXED POLICY (ALL VEHICLES)</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-xs text-white/50">Depreciation basis</span>
                    <span className="text-sm text-gray-200 font-mono font-bold">{FIXED_POLICY.depreciationBasis}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-xs text-white/50">Depreciation horizon</span>
                    <span className="text-sm text-gray-200 font-mono font-bold">{FIXED_POLICY.depreciationHorizon} months</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-white/50">Lease term (contract)</span>
                    <span className="text-sm text-gray-200 font-mono font-bold">{FIXED_POLICY.leaseTerm} months</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-lg">
                <h4 className="text-sm font-bold text-gray-300 mb-3 tracking-wider">NOTES</h4>
                <ul className="text-xs text-white/50 space-y-2 leading-relaxed">
                  <li>• All contracts are 12-month leases</li>
                  <li>• Depreciation: 70% of acquisition cost over 60 months</li>
                  <li>• Buyout = Book value + Interest charge</li>
                  <li>• Book value decreases monthly as depreciation accumulates</li>
                </ul>
              </div>
            </div>

            {/* Bottom Section: Buyout Table - Full Width */}
            <div>
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Table Header */}
                <div className="bg-gradient-to-r from-gray-400/10 to-gray-500/10 backdrop-blur-md px-6 py-4 border-b border-white/10">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                    Buyout Prices (Month 12 - 60)
                  </h2>
                  <p className="text-xs text-white/50 mt-1">Scroll to view all months</p>
                </div>

                {/* Table */}
                <div className="overflow-y-auto max-h-[calc(100vh-250px)] custom-scrollbar-black">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gradient-to-r from-neutral-800 to-neutral-900 z-10">
                      <tr>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-200 border-b border-white/10">
                          Month
                        </th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-200 border-b border-white/10">
                          Book Value (AED)
                        </th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-white border-b border-white/10">
                          Interest Charge (AED)
                        </th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-200 border-b border-white/10">
                          BUYOUT PRICE (AED)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-black/20 backdrop-blur-xl">
                      {buyoutTable.map((row, index) => (
                        <tr 
                          key={row.month}
                          className={`transition-colors hover:bg-white/5 ${
                            index !== buyoutTable.length - 1 ? 'border-b border-white/5' : ''
                          }`}
                        >
                          <td className="px-6 py-4 text-gray-100 font-bold">
                            Month {row.month}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-300 font-mono text-sm">
                            {row.bookValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-300 font-mono text-sm">
                            {row.interestCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right bg-gradient-to-r from-gray-500/10 to-gray-600/10">
                            <span className="text-lg font-bold bg-gradient-to-r from-gray-100 via-white to-gray-300 bg-clip-text text-transparent">
                              {row.buyoutPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Summary Stats - Full Width */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-lg">
                  <div className="text-xs text-white/50 mb-1">Lowest Buyout (Month 60)</div>
                  <div className="text-xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                    {buyoutTable[buyoutTable.length - 1]?.buyoutPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} AED
                  </div>
                </div>
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-lg">
                  <div className="text-xs text-white/50 mb-1">Highest Buyout (Month 12)</div>
                  <div className="text-xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                    {buyoutTable[0]?.buyoutPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} AED
                  </div>
                </div>
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-lg">
                  <div className="text-xs text-white/50 mb-1">Monthly Depreciation</div>
                  <div className="text-xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                    {((acquisitionCost * 0.7) / 60).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} AED
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
