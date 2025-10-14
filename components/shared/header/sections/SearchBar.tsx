"use client";
import { useSearchStore } from '@/lib/searchStore';
import React from 'react';

function SearchBar() {
  const { query, setQuery } = useSearchStore();

  return (
    <div className="w-40 flex-shrink-0"> {/* Fixed width container to prevent layout shifts */}
      <input
        type="text"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value.toUpperCase())}
        className="w-full px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-white text-xs placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
      />
    </div>
  );
}

// Memoize SearchBar to prevent unnecessary re-renders
export default React.memo(SearchBar); 