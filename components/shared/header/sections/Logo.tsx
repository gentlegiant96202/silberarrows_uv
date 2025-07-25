import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/module-selection" className="flex items-center mr-10 cursor-pointer hover:opacity-80 transition-opacity">
      <div className="w-10 h-10 flex items-center justify-center">
        <img 
          src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" 
          alt="Logo" 
          className="w-10 h-10 object-contain"
        />
      </div>
    </Link>
  );
} 