import { create } from 'zustand';

interface DashboardFilterState {
  year: number;            // e.g. 2024
  months: number[];        // empty array means ALL
  setYear: (year: number) => void;
  toggleMonth: (month: number) => void;
  clearMonths: () => void;
}

const current = new Date();

export const useDashboardFilter = create<DashboardFilterState>((set, get) => ({
  year: current.getFullYear(),
  months: [current.getMonth() + 1],
  setYear: (year) => set({ year }),
  toggleMonth: (month) => {
    const { months } = get();
    if (months.includes(month)) {
      set({ months: months.filter((m) => m !== month) });
    } else {
      set({ months: [...months, month] });
    }
  },
  clearMonths: () => set({ months: [] }),
})); 