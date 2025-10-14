import { create } from 'zustand';

export type SearchContext = 
  | 'cars' 
  | 'leads' 
  | 'customers' 
  | 'consignments' 
  | 'service' 
  | 'marketing' 
  | 'leasing' 
  | 'accounts'
  | 'general';

interface SearchState {
  query: string;
  context: SearchContext;
  setQuery: (q: string) => void;
  setContext: (ctx: SearchContext) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  context: 'general',
  setQuery: (q) => set({ query: q }),
  setContext: (ctx) => set({ context: ctx }),
  clear: () => set({ query: '', context: 'general' }),
})); 