"use client";
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calculator } from 'lucide-react';

export default function FinanceCalculator() {
  const [showFinance, setShowFinance] = useState(false);
  const [finPrice, setFinPrice] = useState('');
  const [finYears, setFinYears] = useState(5);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside and handle window resize
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowFinance(false);
      }
    }

    function handleResize() {
      if (showFinance) {
        updateDropdownPosition();
      }
    }

    if (showFinance) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleResize);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [showFinance]);

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap below button
        right: window.innerWidth - rect.right // Align right edge with button
      });
    }
  };

  const handleToggleDropdown = () => {
    if (!showFinance) {
      updateDropdownPosition();
    }
    setShowFinance(!showFinance);
  };

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
        ref={buttonRef}
        onClick={handleToggleDropdown}
        className="w-5 h-5 flex items-center justify-center text-white/60 hover:text-white"
        title="Finance Calculator"
      >
        <Calculator className="w-4 h-4" />
      </button>
      {showFinance && typeof window !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-60 bg-black/90 backdrop-blur border border-white/10 rounded-lg shadow-lg p-4 origin-top transition-transform transition-opacity duration-200 animate-in slide-in-from-top-2"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            zIndex: 999999
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
} 