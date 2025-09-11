import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types for the store
interface Lead {
  id: string;
  status: string;
  full_name: string;
  phone_number: string;
  country_code: string;
  model_of_interest: string;
  max_age: string;
  payment_type: string;
  monthly_budget: number;
  total_budget: number;
  appointment_date: string;
  time_slot: string;
  notes: string;
  timeline_notes?: any[];
  created_at: string;
  updated_at: string;
  inventory_car_id?: string;
  lost_reason?: string;
  lost_reason_notes?: string;
  lost_at?: string;
  archived_at?: string;
}

interface Car {
  id: string;
  stock_number: string;
  model_year: number;
  vehicle_model: string;
  colour: string;
  advertised_price_aed: number;
  status: string;
  sale_status: string;
  stock_age_days: number | null;
  ownership_type: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  vehicle_details_pdf_url?: string | null;
  archived_at?: string | null;
  customer_disclosed_accident?: boolean | null;
  customer_disclosed_flood_damage?: boolean | null;
  damage_disclosure_details?: string | null;
  current_mileage_km?: number | null | undefined;
  horsepower_hp?: number | null | undefined;
}

interface UVCrmState {
  // CRM Leads Data
  leads: Lead[];
  columnData: Record<string, Lead[]>;
  columnLoading: Record<string, boolean>;
  
  // Car Inventory Data
  cars: Car[];
  carColumnData: Record<string, Car[]>;
  carColumnLoading: Record<string, boolean>;
  carThumbs: Record<string, string>;
  
  // Dashboard Data
  dashboardMetrics: any[];
  dashboardTargets: any[];
  dashboardLoaded: boolean;
  
  // Actions for CRM Leads
  setLeads: (leads: Lead[] | ((prev: Lead[]) => Lead[])) => void;
  setColumnData: (columnData: Record<string, Lead[]> | ((prev: Record<string, Lead[]>) => Record<string, Lead[]>)) => void;
  setColumnLoading: (columnLoading: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  updateLeadInColumns: (lead: Lead) => void;
  removeLeadFromColumns: (leadId: string) => void;
  
  // Actions for Car Inventory
  setCars: (cars: Car[] | ((prev: Car[]) => Car[])) => void;
  setCarColumnData: (carColumnData: Record<string, Car[]> | ((prev: Record<string, Car[]>) => Record<string, Car[]>)) => void;
  setCarColumnLoading: (carColumnLoading: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setCarThumbs: (carThumbs: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  updateCarInColumns: (car: Car) => void;
  removeCarFromColumns: (carId: string) => void;
  
  // Actions for Dashboard
  setDashboardMetrics: (metrics: any[]) => void;
  setDashboardTargets: (targets: any[]) => void;
  setDashboardLoaded: (loaded: boolean) => void;
  
  // Utility actions
  clearAllData: () => void;
  isDataLoaded: () => boolean;
}

export const useUVCrmStore = create<UVCrmState>()(
  persist(
    (set, get) => ({
      // Initial state - CRM Leads
      leads: [],
      columnData: {
        new_lead: [],
        new_customer: [],
        negotiation: [],
        won: [],
        delivered: [],
        lost: [],
        archived: []
      },
      columnLoading: {
        new_lead: true,
        new_customer: true,
        negotiation: true,
        won: true,
        delivered: true,
        lost: true,
        archived: true
      },
      
      // Initial state - Car Inventory
      cars: [],
      carColumnData: {
        marketing: [],
        qc_ceo: [],
        inventory: [],
        reserved: [],
        sold: [],
        returned: [],
        archived: []
      },
      carColumnLoading: {
        marketing: true,
        qc_ceo: true,
        inventory: true,
        reserved: true,
        sold: true,
        returned: true,
        archived: true
      },
      carThumbs: {},
      
      // Initial state - Dashboard
      dashboardMetrics: [],
      dashboardTargets: [],
      dashboardLoaded: false,
      
      // CRM Lead Actions
      setLeads: (leads) => set((state) => ({ 
        leads: typeof leads === 'function' ? leads(state.leads) : leads 
      })),
      setColumnData: (columnData) => set((state) => ({ 
        columnData: typeof columnData === 'function' ? columnData(state.columnData) : columnData 
      })),
      setColumnLoading: (columnLoading) => set((state) => ({ 
        columnLoading: typeof columnLoading === 'function' ? columnLoading(state.columnLoading) : columnLoading 
      })),
      
      updateLeadInColumns: (lead) => set((state) => {
        const normalizedStatus = (lead.status || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_");
        
        const newColumnData = { ...state.columnData };
        
        // Remove from all columns first
        Object.keys(newColumnData).forEach(key => {
          newColumnData[key] = newColumnData[key].filter(l => l.id !== lead.id);
        });
        
        // Add to correct column
        if (newColumnData[normalizedStatus]) {
          newColumnData[normalizedStatus] = [lead, ...newColumnData[normalizedStatus]];
        }
        
        return {
          columnData: newColumnData,
          leads: state.leads.map(l => l.id === lead.id ? lead : l)
        };
      }),
      
      removeLeadFromColumns: (leadId) => set((state) => {
        const newColumnData = { ...state.columnData };
        Object.keys(newColumnData).forEach(key => {
          newColumnData[key] = newColumnData[key].filter(l => l.id !== leadId);
        });
        
        return {
          columnData: newColumnData,
          leads: state.leads.filter(l => l.id !== leadId)
        };
      }),
      
      // Car Inventory Actions
      setCars: (cars) => set((state) => ({ 
        cars: typeof cars === 'function' ? cars(state.cars) : cars 
      })),
      setCarColumnData: (carColumnData) => set((state) => ({ 
        carColumnData: typeof carColumnData === 'function' ? carColumnData(state.carColumnData) : carColumnData 
      })),
      setCarColumnLoading: (carColumnLoading) => set((state) => ({ 
        carColumnLoading: typeof carColumnLoading === 'function' ? carColumnLoading(state.carColumnLoading) : carColumnLoading 
      })),
      setCarThumbs: (carThumbs) => set((state) => ({ 
        carThumbs: typeof carThumbs === 'function' ? carThumbs(state.carThumbs) : carThumbs 
      })),
      
      updateCarInColumns: (car) => set((state) => {
        let targetColumn: string | null = null;
        
        if (car.status === 'marketing') targetColumn = 'marketing';
        else if (car.status === 'qc_ceo') targetColumn = 'qc_ceo';
        else if (car.status === 'inventory') {
          if (car.sale_status === 'available') targetColumn = 'inventory';
          else if (car.sale_status === 'reserved') targetColumn = 'reserved';
          else if (car.sale_status === 'sold') targetColumn = 'sold';
          else if (car.sale_status === 'returned') targetColumn = 'returned';
          else if (car.sale_status === 'archived') targetColumn = 'archived';
        }
        
        const newCarColumnData = { ...state.carColumnData };
        
        // Remove from all columns first
        Object.keys(newCarColumnData).forEach(key => {
          newCarColumnData[key] = newCarColumnData[key].filter(c => c.id !== car.id);
        });
        
        // Add to correct column
        if (targetColumn && newCarColumnData[targetColumn]) {
          newCarColumnData[targetColumn] = [car, ...newCarColumnData[targetColumn]];
        }
        
        return {
          carColumnData: newCarColumnData,
          cars: state.cars.map(c => c.id === car.id ? car : c)
        };
      }),
      
      removeCarFromColumns: (carId) => set((state) => {
        const newCarColumnData = { ...state.carColumnData };
        Object.keys(newCarColumnData).forEach(key => {
          newCarColumnData[key] = newCarColumnData[key].filter(c => c.id !== carId);
        });
        
        return {
          carColumnData: newCarColumnData,
          cars: state.cars.filter(c => c.id !== carId)
        };
      }),
      
      // Dashboard Actions
      setDashboardMetrics: (metrics) => set({ dashboardMetrics: metrics }),
      setDashboardTargets: (targets) => set({ dashboardTargets: targets }),
      setDashboardLoaded: (loaded) => set({ dashboardLoaded: loaded }),
      
      // Utility Actions
      clearAllData: () => set({
        leads: [],
        columnData: {
          new_lead: [], new_customer: [], negotiation: [],
          won: [], delivered: [], lost: [], archived: []
        },
        cars: [],
        carColumnData: {
          marketing: [], qc_ceo: [], inventory: [],
          reserved: [], sold: [], returned: [], archived: []
        },
        carThumbs: {},
        dashboardMetrics: [],
        dashboardTargets: [],
        dashboardLoaded: false
      }),
      
      isDataLoaded: () => {
        const state = get();
        return state.leads.length > 0 || state.cars.length > 0 || state.dashboardLoaded;
      }
    }),
    {
      name: 'uv-crm-storage', // localStorage key
      // Only persist essential data, not loading states
      partialize: (state) => ({
        leads: state.leads,
        columnData: state.columnData,
        cars: state.cars,
        carColumnData: state.carColumnData,
        carThumbs: state.carThumbs,
        dashboardMetrics: state.dashboardMetrics,
        dashboardTargets: state.dashboardTargets,
        dashboardLoaded: state.dashboardLoaded
      }),
    }
  )
);
