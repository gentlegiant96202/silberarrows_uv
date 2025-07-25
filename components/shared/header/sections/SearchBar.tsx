"use client";
import { useSearchStore } from '@/lib/searchStore';

export default function SearchBar() {
  const { query, setQuery } = useSearchStore();

  return (
    <input
      type="text"
      placeholder="Search…"
      value={query}
      onChange={(e) => setQuery(e.target.value.toUpperCase())}
      className="hidden sm:block w-32 md:w-40 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white text-xs md:text-sm placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
    />
  );
} 