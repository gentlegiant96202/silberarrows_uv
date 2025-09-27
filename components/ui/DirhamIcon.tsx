import { useEffect } from 'react';

interface DirhamIconProps {
  size?: number;
  className?: string;
}

export default function DirhamIcon({ size = 24, className = "" }: DirhamIconProps) {
  useEffect(() => {
    // Import the dirham symbol CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/node_modules/new-dirham-symbol/dist/uae-symbol.css';
    document.head.appendChild(link);

    return () => {
      // Cleanup
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  return (
    <span 
      className={`dirham-symbol inline-flex items-center justify-center ${className}`}
      style={{ 
        fontSize: `${size}px`, 
        width: `${size}px`, 
        height: `${size}px`,
        fontFamily: 'UAESymbol, sans-serif',
        fontWeight: 'bold'
      }}
    >
      &#xea;
    </span>
  );
}

// Alternative component for text usage
export function DirhamText({ amount, className = "" }: { amount: number; className?: string }) {
  useEffect(() => {
    // Import the dirham symbol CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/node_modules/new-dirham-symbol/dist/uae-symbol.css';
    document.head.appendChild(link);

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <span className={className}>
      <span 
        className="dirham-symbol"
        style={{ 
          fontFamily: 'UAESymbol, sans-serif',
          fontWeight: 'bold'
        }}
      >
        &#xea;
      </span>{' '}
      {formatAmount(amount)}
    </span>
  );
}
