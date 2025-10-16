"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Car,
  FileText,
  Wrench,
  DollarSign,
  Palette,
  Phone,
  Image as ImageIcon,
  Lightbulb,
  CreditCard,
  BookOpen,
  Mail,
  Monitor,
  Globe,
  PieChart,
  TrendingUp,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  Route
} from 'lucide-react';

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  badge?: number;
  subItems?: NavItem[];
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [pendingContractsCount, setPendingContractsCount] = useState(0);

  // Determine current module
  const getCurrentModule = () => {
    if (pathname.startsWith('/workshop')) return 'workshop';
    if (pathname.startsWith('/marketing')) return 'marketing';
    if (pathname.startsWith('/leasing')) return 'leasing';
    if (pathname.startsWith('/accounts')) return 'accounts';
    return 'uv-crm';
  };

  const currentModule = getCurrentModule();

  // Fetch pending contracts count
  useEffect(() => {
    if (!user) return;

    const fetchPendingContracts = async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        
        if (!token) return;

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const serviceResponse = await fetch('/api/service-contracts?type=service&status=created', { headers });
        const warrantyResponse = await fetch('/api/service-contracts?type=warranty&status=created', { headers });

        let count = 0;
        
        if (serviceResponse.ok) {
          const serviceData = await serviceResponse.json();
          count += (serviceData.contracts || []).filter((c: any) => c.workflow_status === 'created').length;
        }
        
        if (warrantyResponse.ok) {
          const warrantyData = await warrantyResponse.json();
          count += (warrantyData.contracts || []).filter((c: any) => c.workflow_status === 'created').length;
        }

        setPendingContractsCount(count);
      } catch (error) {
        console.error('Error fetching pending contracts:', error);
      }
    };

    fetchPendingContracts();
    const interval = setInterval(fetchPendingContracts, 3000);

    return () => clearInterval(interval);
  }, [user]);

  // Navigation items by module
  const navigationByModule: Record<string, NavItem[]> = {
    'uv-crm': [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { key: 'crm', label: 'CRM', icon: Users, href: '/crm' },
      { key: 'customers', label: 'Customers', icon: UserCircle, href: '/customers' },
      { key: 'inventory', label: 'Inventory', icon: Car, href: '/inventory' },
      { key: 'consignments', label: 'Consignments', icon: FileText, href: '/consignments' },
      { key: 'service', label: 'Service & Warranty', icon: Wrench, href: '/service', badge: pendingContractsCount },
      { key: 'accounts', label: 'Accounts', icon: DollarSign, href: '/accounting' }
    ],
    'workshop': [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/workshop/dashboard' },
      { key: 'service', label: 'Service & Warranty', icon: Wrench, href: '/workshop/service-warranty', badge: pendingContractsCount },
      { key: 'xentry', label: 'XENTRY (UK)', icon: Monitor, href: '/workshop/xentry' }
    ],
    'marketing': [
      { key: 'design', label: 'Creative Hub', icon: Palette, href: '/marketing/dashboard?tab=design' },
      { key: 'call_log', label: 'Call Log', icon: Phone, href: '/marketing/dashboard?tab=call_log' },
      { key: 'uv_catalog', label: 'UV Catalog', icon: ImageIcon, href: '/marketing/dashboard?tab=uv_catalog' },
      {
        key: 'content_pillars',
        label: 'Content Pillars',
        icon: Lightbulb,
        subItems: [
          { key: 'myth_buster', label: 'Myth Buster Monday', icon: Lightbulb, href: '/marketing/myth-buster-monday' },
          { key: 'tech_tips', label: 'Tech Tips Tuesday', icon: Lightbulb, href: '/marketing/tech-tips-tuesday' }
        ]
      },
      { key: 'buyer_journey', label: 'Buyer Journey', icon: Route, href: '/marketing/dashboard?tab=buyer_journey' },
      { key: 'business_cards', label: 'Business Cards', icon: CreditCard, href: '/marketing/dashboard?tab=business_cards' },
      { key: 'blog', label: 'Blog', icon: BookOpen, href: '/marketing/dashboard?tab=blog' },
      { key: 'email', label: 'Email Signature', icon: Mail, href: '/marketing/dashboard?tab=email' }
    ],
    'leasing': [
      { key: 'crm', label: 'CRM', icon: Users, href: '/leasing?tab=crm' },
      { key: 'inventory', label: 'Inventory', icon: ShoppingBag, href: '/leasing?tab=inventory' }
    ],
    'accounts': [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/accounts/dashboard' }
    ]
  };

  const currentNavItems = navigationByModule[currentModule] || [];

  // Check if a nav item is active
  const isActive = (item: NavItem): boolean => {
    if (!item.href) return false;
    
    // For items with query params
    if (item.href.includes('?')) {
      const [path, query] = item.href.split('?');
      const params = new URLSearchParams(query);
      const tab = params.get('tab');
      
      if (pathname === path) {
        const currentTab = searchParams.get('tab');
        return currentTab === tab;
      }
      return false;
    }
    
    // For regular paths
    if (item.href === '/dashboard') {
      return pathname === '/dashboard';
    }
    
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  // Check if any subitem is active
  const hasActiveSubItem = (item: NavItem): boolean => {
    if (!item.subItems) return false;
    return item.subItems.some(subItem => isActive(subItem));
  };

  // Toggle expanded state for items with subItems
  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  // Auto-expand items with active subitems
  useEffect(() => {
    const newExpanded = new Set<string>();
    currentNavItems.forEach(item => {
      if (hasActiveSubItem(item)) {
        newExpanded.add(item.key);
      }
    });
    setExpandedItems(newExpanded);
  }, [pathname, currentModule]);

  const handleNavigation = (item: NavItem) => {
    if (item.subItems) {
      toggleExpanded(item.key);
    } else if (item.href) {
      router.push(item.href);
    }
  };

  const renderNavItem = (item: NavItem, isSubItem: boolean = false) => {
    const Icon = item.icon;
    const active = isActive(item);
    const hasSubItems = !!item.subItems;
    const isExpanded = expandedItems.has(item.key);
    const hasActiveSub = hasActiveSubItem(item);

    return (
      <div key={item.key}>
        <button
          onClick={() => handleNavigation(item)}
          className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors duration-200 group relative ${
            isSubItem ? 'pl-12' : ''
          } ${
            active
              ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg'
              : hasActiveSub
              ? 'bg-white/10 text-white'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title={!isHovered ? item.label : ''}
        >
          {/* Icon - always visible */}
          <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-black' : ''}`} />
          
          {/* Label container - fixed position to prevent layout shift */}
          <div className={`flex-1 flex items-center overflow-hidden transition-all duration-200 ${isHovered ? 'ml-3 opacity-100' : 'ml-0 opacity-0 w-0'}`}>
            <span className={`text-sm font-medium whitespace-nowrap ${active ? 'text-black' : ''}`}>
              {item.label}
            </span>
          </div>

          {/* Badge */}
          {item.badge !== undefined && item.badge > 0 && isHovered && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center ml-2 flex-shrink-0">
              {item.badge}
            </span>
          )}

          {/* Expand/Collapse icon for items with subitems */}
          {hasSubItems && isHovered && (
            <div className={`ml-2 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          )}
        </button>

        {/* Sub-items */}
        {hasSubItems && isExpanded && isHovered && item.subItems && (
          <div className="mt-1 space-y-1">
            {item.subItems.map(subItem => renderNavItem(subItem, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className="flex-shrink-0 h-screen relative z-40"
      style={{ width: '64px' }}
    >
      <div
        className={`absolute left-0 top-0 h-full bg-black/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ${
          isHovered ? 'w-[280px]' : 'w-[64px]'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      <div className="flex flex-col h-full">
        {/* Logo at top */}
        <div className="p-3 border-b border-white/10">
          <button
            onClick={() => router.push('/module-selection')}
            className={`flex items-center h-10 w-full hover:opacity-80 transition-opacity duration-200 ${isHovered ? 'justify-start' : 'justify-center'}`}
          >
            {/* Logo Image with animated border glow */}
            <div className="flex-shrink-0 w-10 h-10 relative group">
              {/* Logo container */}
              <div className="relative w-full h-full rounded-lg bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-lg">
                <img 
                  src="/MAIN LOGO.png" 
                  alt="SilberArrows" 
                  className="w-8 h-8 object-contain brightness-150"
                />
              </div>
              {/* Point glow following rectangular border path */}
              <div className="absolute inset-0 z-10 rounded-lg overflow-visible">
                <div className="absolute -translate-x-1/2 -translate-y-1/2 animate-border-glow">
                  <div className="w-1 h-1 rounded-full bg-white shadow-[0_0_8px_3px_rgba(255,255,255,0.8),0_0_12px_6px_rgba(200,200,200,0.3)]">
                    <div className="absolute inset-0 rounded-full bg-white/60 blur-[1px]"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Logo Text - only when expanded */}
            <div className={`flex items-center overflow-hidden transition-all duration-200 ${isHovered ? 'ml-3 opacity-100' : 'ml-0 opacity-0 w-0'}`}>
              <span className="text-base font-bold text-white whitespace-nowrap">
                SilberArrows
              </span>
            </div>
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 custom-scrollbar-black">
          {currentNavItems.map(item => renderNavItem(item))}
        </nav>

        {/* Module switcher at bottom */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => router.push('/module-selection')}
            className="w-full flex items-center px-3 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-200"
            title={!isHovered ? 'Switch Module' : ''}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            <div className={`flex-1 flex items-center overflow-hidden transition-all duration-200 ${isHovered ? 'ml-3 opacity-100' : 'ml-0 opacity-0 w-0'}`}>
              <span className="text-sm font-medium whitespace-nowrap">Switch Module</span>
            </div>
          </button>
        </div>
      </div>
      </div>
    </aside>
  );
}

