import React from 'react';
import { 
  Phone, 
  MapPin, 
  Award, 
  Clock, 
  Navigation, 
  Settings, 
  Star, 
  ShieldCheck, 
  FileText, 
  Shield, 
  Truck, 
  Check, 
  Mail,
  MessageCircle,
  Calendar,
  DollarSign,
  Car,
  Users,
  Zap,
  X,
  Key,
  Undo,
  CheckCircle,
  XCircle,
  CreditCard,
  TrendingUp,
  Handshake,
  Info
} from 'lucide-react';

interface IconProps {
  name: string;
  className?: string;
  size?: number | string;
  variant?: 'white' | 'dark' | 'gold' | 'silver' | 'inherit';
  flip?: boolean;
}

const Icon: React.FC<IconProps> = ({ name, className = '', size = 24, variant = 'white', flip = false }) => {
  const iconMap: { [key: string]: React.ElementType | string } = {
    'phone': Phone,
    'location-dot': MapPin,
    'medal': Award,
    'clock': Clock,
    'directions': Navigation,
    'cogs': Settings,
    'star': Star,
    'user-shield': ShieldCheck,
    'file-contract': FileText,
    'shield-alt': Shield,
    'truck': Truck,
    'check': Check,
    'phone-alt': Phone,
    'whatsapp': MessageCircle,
    'mail': Mail,
    'calendar': Calendar,
    'dollar-sign': DollarSign,
    'car': Car,
    'users': Users,
    'zap': Zap,
    'dirham': '/dirham-symbol.svg',
    'times': X,
    'close': X,
    'x': X,
    'key': Key,
    'undo': Undo,
    'check-circle': CheckCircle,
    'x-circle': XCircle,
    'card': CreditCard,
    'chart-line': TrendingUp,
    'handshake': Handshake,
    'info-circle': Info
  };

  const iconSource = iconMap[name];
  
  if (!iconSource) {
    return null;
  }

  const sizeValue = typeof size === 'number' ? size : parseInt(size);

  // Color mapping for different variants
  const getColor = (variant: string) => {
    switch (variant) {
      case 'white':
        return '#ffffff';
      case 'dark':
        return '#000000';
      case 'gold':
        return '#E5E5E5'; // Silver/gold tone matching UK site
      case 'silver':
        return '#C0C0C0'; // Pure silver
      case 'inherit':
        return 'currentColor';
      default:
        return '#ffffff';
    }
  };

  // If it's a string (SVG path), render as img
  if (typeof iconSource === 'string') {
    return (
      <img
        src={iconSource}
        alt={`${name} icon`}
        className={`icon ${className}`}
        style={{
          width: `${sizeValue}px`,
          height: `${sizeValue}px`,
          display: 'inline-block',
          verticalAlign: 'middle',
          transform: flip ? 'scaleX(-1)' : 'none',
          flexShrink: 0,
          filter: variant === 'dark' ? 'brightness(0)' : variant === 'gold' ? 'brightness(0) saturate(100%) invert(85%) sepia(10%) saturate(200%) hue-rotate(180deg) brightness(90%)' : variant === 'silver' ? 'brightness(0) saturate(100%) invert(75%) sepia(0%)' : 'none'
        }}
      />
    );
  }

  // Otherwise render as React component
  const IconComponent = iconSource as React.ElementType;
  return (
    <IconComponent
      size={sizeValue}
      color={getColor(variant)}
      className={`icon ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        transform: flip ? 'scaleX(-1)' : 'none',
        flexShrink: 0
      }}
    />
  );
};

export default Icon;


