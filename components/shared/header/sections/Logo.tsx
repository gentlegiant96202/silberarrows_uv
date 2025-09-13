import Link from 'next/link';
import Image from 'next/image';
import React from 'react';

function Logo() {
  return (
    <Link href="/module-selection" className="flex items-center mr-10 cursor-pointer hover:opacity-80 transition-opacity">
      <div className="w-10 h-10 flex items-center justify-center">
        <Image 
          src="/MAIN LOGO.png" 
          alt="SilberArrows Logo" 
          width={40}
          height={40}
          className="w-10 h-10 object-contain"
          priority // Load immediately to prevent reloading
        />
      </div>
    </Link>
  );
}

// Memoize Logo to prevent unnecessary re-renders
export default React.memo(Logo); 