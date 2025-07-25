"use client";
import { useState } from 'react';
import { Calculator } from 'lucide-react';

export default function FinanceCalculator() {
  const [showFinance, setShowFinance] = useState(false);
  const [finPrice, setFinPrice] = useState('');
  const [finYears, setFinYears] = useState(5);

  const calcMonthly = () => {
    const p = parseFloat(finPrice || '0');
    if(!p) return { zero: 0, twenty: 0 };
    const r = 0.03/12;
    const n = finYears*12;
    const pay = (principal:number)=> Math.round(principal*r/(1-Math.pow(1+r,-n)));
    return { zero: pay(p), twenty: pay(p*0.8) };
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowFinance(p => !p)}
        className="w-5 h-5 flex items-center justify-center text-white/60 hover:text-white"
        title="Finance Calculator"
      >
        <Calculator className="w-4 h-4" />
      </button>
      {showFinance && (
        <div className="fixed right-32 top-16 w-60 bg-black/90 backdrop-blur border border-white/10 rounded-lg shadow-lg p-4 z-50 origin-top transition-transform transition-opacity duration-200">
          <p className="text-white/70 text-sm mb-2">Finance Calculator</p>
          <label className="block text-white/60 text-xs mb-0.5">Vehicle Price (AED)</label>
          <input
            type="number"
            value={finPrice}
            onChange={e => setFinPrice(e.target.value)}
            className="w-full px-2 py-1 rounded bg-black/40 border border-white/20 text-white text-xs mb-2"
            placeholder="0"
          />

          <label className="block text-white/60 text-xs mb-0.5">Loan Term (Years)</label>
          <select
            value={finYears}
            onChange={e => setFinYears(parseInt(e.target.value))}
            className="w-full px-2 py-1 rounded bg-black/40 border border-white/20 text-white text-xs mb-3"
          >
            {[1,2,3,4,5].map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {(() => {
            const m = calcMonthly(); 
            return (
              <div className="text-white text-sm space-y-0.5">
                <p>0% Down: <span className="font-semibold">AED {m.zero.toLocaleString()}</span>/mo</p>
                <p>20% Down: <span className="font-semibold">AED {m.twenty.toLocaleString()}</span>/mo</p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
} 