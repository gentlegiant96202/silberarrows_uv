import Image from 'next/image';

interface PulsatingLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  text?: string;
}

export default function PulsatingLogo({ 
  size = 48, 
  className = "", 
  showText = true, 
  text = "Loading..." 
}: PulsatingLogoProps) {
  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Pulsating Logo */}
      <div className="relative">
        <Image
          src="/MAIN LOGO.png"
          alt="SilberArrows Logo"
          width={size}
          height={size}
          className="object-contain animate-pulse"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(209, 213, 219, 0.4))',
            animation: 'logoGlow 2s ease-in-out infinite'
          }}
        />
      </div>
      
      {/* Optional Loading Text */}
      {showText && (
        <p className="text-white/70 text-sm animate-pulse">{text}</p>
      )}
    </div>
  );
}
