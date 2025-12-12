"use client";

import React, { useEffect, useMemo, useState } from "react";
import RouteProtector from "@/components/shared/RouteProtector";
import LeasingDashboard from "@/components/leasing/LeasingDashboard";
import { useLeasingData } from "@/lib/useLeasingData";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/shared/AuthProvider";

// Simple greeting helper
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Filter bar with greeting
function LeasingFilterInline({
  leasingYear,
  leasingMonth,
  setLeasingYear,
  setLeasingMonth,
  userName,
}: {
  leasingYear: number;
  leasingMonth: number;
  setLeasingYear: (year: number) => void;
  setLeasingMonth: (month: number) => void;
  userName: string;
}) {
  const greeting = getGreeting();
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-3 backdrop-blur-md bg-gradient-to-r from-white/10 to-white/5 border border-white/10 rounded-lg shadow-inner mb-4">
      <div className="flex items-center gap-2">
        <span className="text-white text-sm font-medium">{greeting},</span>
        <span className="text-white/80 text-sm">{userName}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-white/60 text-xs font-medium whitespace-nowrap">
            Year:
          </span>
          <select
            value={leasingYear}
            onChange={(e) => setLeasingYear(Number(e.target.value))}
            className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-white/40 backdrop-blur-sm"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year} className="bg-gray-800 text-white">
                {year}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-white/60 text-xs font-medium whitespace-nowrap">
            Month:
          </span>
          <select
            value={leasingMonth}
            onChange={(e) => setLeasingMonth(Number(e.target.value))}
            className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-white/40 backdrop-blur-sm"
          >
            {[
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
            ].map((month) => (
              <option key={month.value} value={month.value} className="bg-gray-800 text-white">
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function LeasingDashboardPage() {
  const { user } = useAuth();
  const { fetchLeasingMetrics, loading: leasingLoading } = useLeasingData();

  const [allLeasingMetrics, setAllLeasingMetrics] = useState<any[]>([]);
  const [allLeasingTargets, setAllLeasingTargets] = useState<any[]>([]);
  const [leasingYear, setLeasingYear] = useState(new Date().getFullYear());
  const [leasingMonth, setLeasingMonth] = useState(new Date().getMonth() + 1);

  const displayName = useMemo(() => {
    if (!user) return "User";
    if (user.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user.email) {
      const prefix = user.email.split("@")[0];
      return prefix.replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return "User";
  }, [user?.user_metadata?.full_name, user?.email]);

  const fetchAllLeasingTargets = async () => {
    try {
      const { data, error } = await supabase
        .from("leasing_monthly_targets")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) return [];
      setAllLeasingTargets(data || []);
      return data || [];
    } catch {
      return [];
    }
  };

  const handleRefresh = async () => {
    try {
      const [metrics, targets] = await Promise.all([
        fetchLeasingMetrics(),
        fetchAllLeasingTargets(),
      ]);
      setAllLeasingMetrics(metrics || []);
      setAllLeasingTargets(targets || []);
    } catch {
      // swallow
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <RouteProtector moduleName="leasing">
      <div className="min-h-screen bg-black px-3 sm:px-4 py-4">
        <div className="w-full">
          <LeasingFilterInline
            leasingYear={leasingYear}
            leasingMonth={leasingMonth}
            setLeasingYear={setLeasingYear}
            setLeasingMonth={setLeasingMonth}
            userName={displayName}
          />

          <LeasingDashboard
            metrics={allLeasingMetrics}
            targets={allLeasingTargets}
            loading={leasingLoading}
            leasingYear={leasingYear}
            leasingMonth={leasingMonth}
          />
        </div>
      </div>
    </RouteProtector>
  );
}