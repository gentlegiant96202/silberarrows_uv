"use client";
import React from "react";
import { useDashboardFilter } from "@/lib/dashboardFilterStore";

export default function DashboardFilterBar() {
  const { year, months, setYear, toggleMonth, clearMonths } = useDashboardFilter();

  // Build year options: last 5 years up to current
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const monthOptions = [
    { value: 1, label: "Jan" },
    { value: 2, label: "Feb" },
    { value: 3, label: "Mar" },
    { value: 4, label: "Apr" },
    { value: 5, label: "May" },
    { value: 6, label: "Jun" },
    { value: 7, label: "Jul" },
    { value: 8, label: "Aug" },
    { value: 9, label: "Sep" },
    { value: 10, label: "Oct" },
    { value: 11, label: "Nov" },
    { value: 12, label: "Dec" },
  ];

  return (
    <div className="grid items-center gap-3 mb-6 w-full grid-cols-[auto_auto_auto_1fr]">
      <label className="text-xs text-white/60">Year</label>
      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="bg-black/70 backdrop-blur border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:outline-none"
      >
        {years.map((y) => (
          <option key={y} value={y} className="bg-black">
            {y}
          </option>
        ))}
      </select>

      <label className="text-xs text-white/60">Months</label>
      <div className="flex flex-1 gap-2 flex-nowrap">
        <button
          onClick={clearMonths}
          className={`flex-1 min-w-0 px-2 py-0.5 rounded-full text-xs transition-all border ${
            months.length === 0
              ? 'bg-brand text-white border-transparent'
              : 'bg-black/70 text-white/70 border-white/20 hover:text-white'
          }`}
        >
          All
        </button>
        {monthOptions.map((m) => {
          const selected = months.includes(m.value);
          return (
            <button
              key={m.value}
              onClick={() => toggleMonth(m.value)}
              className={`flex-1 min-w-0 px-2 py-0.5 rounded-full text-xs transition-all border ${
                selected
                  ? 'bg-brand text-white border-transparent'
                  : 'bg-black/70 text-white/70 border-white/20 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
} 