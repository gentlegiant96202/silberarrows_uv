import React from 'react';
import DirhamIcon from '@/components/ui/DirhamIcon';

interface DirhamIconSmallProps {
  className?: string;
}

// Wrapper component that renders the Dirham icon at a smaller scale for sidebar use
const DirhamIconSmall: React.FC<DirhamIconSmallProps> = ({ className = '' }) => {
  return (
    <div className={className}>
      <DirhamIcon className="w-[16.8px] h-[16.8px]" />
    </div>
  );
};

export default DirhamIconSmall;

