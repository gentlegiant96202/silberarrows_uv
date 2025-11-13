import React from 'react';

interface MercedesStarProps {
  className?: string;
  size?: number;
}

export const MercedesStar: React.FC<MercedesStarProps> = ({ 
  className = '', 
  size = 24 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle */}
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Three-pointed star */}
      <path
        d="M12 2.5 L12 12 M12 12 L3.5 18.5 M12 12 L20.5 18.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Star points (filled triangles for better look) */}
      <path
        d="M12 3.5 L11 11 L13 11 Z"
        fill="currentColor"
      />
      <path
        d="M4.5 17.5 L11 11.5 L9.5 13.5 Z"
        fill="currentColor"
      />
      <path
        d="M19.5 17.5 L13 11.5 L14.5 13.5 Z"
        fill="currentColor"
      />
    </svg>
  );
};

export default MercedesStar;

