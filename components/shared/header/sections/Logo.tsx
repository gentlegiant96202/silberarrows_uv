import Link from 'next/link';
import Image from 'next/image';

export default function Logo() {
  return (
    <Link href="/module-selection" className="flex items-center mr-10 cursor-pointer hover:opacity-80 transition-opacity">
      <div className="w-10 h-10 flex items-center justify-center">
        <Image 
          src="/MAIN LOGO.png" 
          alt="SilberArrows Logo" 
          width={40}
          height={40}
          className="w-10 h-10 object-contain"
        />
      </div>
    </Link>
  );
} 