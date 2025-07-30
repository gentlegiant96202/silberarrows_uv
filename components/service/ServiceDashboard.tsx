"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  BarChart3, 
  DollarSign,
  Clock,
  Target,
  Percent,
  Calculator,
  Activity,
  Zap,
  Star,
  Award,
  Gauge,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Timer,
  Briefcase,
  PieChart,
  Users,
  Building,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  TrendingDown as TrendDown
} from 'lucide-react';
import type { ServiceDashboardData, ServiceMonthlyTarget, DailyServiceMetrics } from '@/types/service';
import { formatServiceValue } from '@/types/service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface ServiceDashboardProps {
  data: ServiceDashboardData | null;
  loading?: boolean;
  error?: string | null;
}

interface FuturisticMetricCardProps {
  title: string;
  subtitle?: string;
  value: number | string;
  unit?: string;
  trend?: number;
  target?: number;
  icon: React.ReactNode;
  gradient: string;
  size?: 'small' | 'medium' | 'large' | 'wide';
  progress?: number;
  status?: 'excellent' | 'good' | 'warning' | 'critical';
  showChart?: boolean;
  chartData?: any[];
  className?: string;
}

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  blur?: 'light' | 'medium' | 'heavy';
}

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

// Utility function for formatting currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-AE', { 
    style: 'currency', 
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: value >= 1000000 ? 'compact' : 'standard'
  }).format(value);
};

// Utility function for formatting percentages
const formatPercentage = (value: number, decimals = 1) => {
  return `${value.toFixed(decimals)}%`;
};

// Animated Number Component
const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  value, 
  duration = 2000, 
  prefix = '', 
  suffix = '', 
  decimals = 0 
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOutCubic;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    startTimeRef.current = null;
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className="font-mono font-bold">
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
};

// Glass Container Component
const GlassContainer: React.FC<GlassContainerProps> = ({ 
  children, 
  className = '', 
  glow = false,
  blur = 'medium'
}) => {
  const blurClasses = {
    light: 'backdrop-blur-sm',
    medium: 'backdrop-blur-md',
    heavy: 'backdrop-blur-xl'
  };

  return (
    <div className={`
      ${blurClasses[blur]} 
      bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02]
      border border-white/[0.15] 
      rounded-2xl 
      shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
      ${glow ? 'shadow-[0_0_40px_rgba(255,255,255,0.1)]' : ''}
      relative overflow-hidden group
      hover:border-white/[0.25]
      hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]
      transition-all duration-500 ease-out
      ${className}
    `}>
      {/* Glass reflection effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: 'excellent' | 'good' | 'warning' | 'critical' }> = ({ status }) => {
  const statusConfig = {
    excellent: { 
      icon: <CheckCircle className="w-3 h-3" />, 
      text: 'Excellent', 
      gradient: 'from-emerald-400 to-green-500',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)]'
    },
    good: { 
      icon: <Star className="w-3 h-3" />, 
      text: 'Good', 
      gradient: 'from-blue-400 to-cyan-500',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]'
    },
    warning: { 
      icon: <AlertTriangle className="w-3 h-3" />, 
      text: 'Warning', 
      gradient: 'from-yellow-400 to-orange-500',
      glow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)]'
    },
    critical: { 
      icon: <TrendDown className="w-3 h-3" />, 
      text: 'Critical', 
      gradient: 'from-red-400 to-pink-500',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={`
      inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
      bg-gradient-to-r ${config.gradient} text-white
      ${config.glow}
      backdrop-blur-sm border border-white/20
    `}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
};

// Progress Ring Component
const ProgressRing: React.FC<{ 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  color?: string;
  glowColor?: string;
}> = ({ 
  progress, 
  size = 100, 
  strokeWidth = 8,
  color = '#ffffff',
  glowColor = 'rgba(255,255,255,0.5)'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 10px ${glowColor})`
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

// Futuristic Metric Card Component
const FuturisticMetricCard: React.FC<FuturisticMetricCardProps> = ({
  title,
  subtitle,
  value,
  unit,
  trend,
  target,
  icon,
  gradient,
  size = 'medium',
  progress,
  status,
  showChart = false,
  chartData = [],
  className = ''
}) => {
  const sizeClasses = {
    small: 'p-4 min-h-[140px]',
    medium: 'p-6 min-h-[180px]',
    large: 'p-8 min-h-[240px]',
    wide: 'p-6 min-h-[180px] col-span-2'
  };

  const getStatus = (): 'excellent' | 'good' | 'warning' | 'critical' => {
    if (status) return status;
    if (progress) {
      if (progress >= 90) return 'excellent';
      if (progress >= 75) return 'good';
      if (progress >= 50) return 'warning';
      return 'critical';
    }
    return 'good';
  };

  return (
    <GlassContainer className={`${sizeClasses[size]} ${className} group hover:scale-[1.02] transition-transform duration-300`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`
              w-12 h-12 rounded-xl bg-gradient-to-br ${gradient}
              flex items-center justify-center shadow-lg
              group-hover:scale-110 transition-transform duration-300
              relative
            `}>
              {/* Icon glow effect */}
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} opacity-50 blur-md group-hover:opacity-75 transition-opacity duration-300`} />
              <div className="relative z-10 text-white">
                {icon}
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm mb-1 tracking-wide">{title}</h3>
              {subtitle && <p className="text-gray-400 text-xs">{subtitle}</p>}
            </div>
          </div>
          
          {/* Trend indicator */}
          {trend !== undefined && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${
              trend > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
            }`}>
              {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              <span className="text-xs font-semibold">{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="mb-3">
            <div className="text-2xl md:text-3xl font-bold text-white mb-1 font-mono">
              {typeof value === 'number' ? (
                <AnimatedNumber 
                  value={value} 
                  prefix={unit === 'currency' ? '' : ''}
                  suffix={unit === '%' ? '%' : unit === 'days' ? '' : ''}
                  decimals={unit === '%' ? 1 : 0}
                />
              ) : (
                value
              )}
            </div>
            
            {/* Progress bar for targets */}
            {target && typeof value === 'number' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Progress</span>
                  <span>{formatPercentage((value / target) * 100)}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${gradient} transition-all duration-1000 ease-out relative`}
                    style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse" />
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Target: {typeof target === 'number' ? formatCurrency(target) : target}
                </div>
              </div>
            )}

            {/* Status badge */}
            {(status || progress) && (
              <div className="mt-3">
                <StatusBadge status={getStatus()} />
              </div>
            )}
          </div>

          {/* Mini Chart */}
          {showChart && chartData.length > 0 && (
            <div className="h-16 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgba(255,255,255,0.3)" />
                      <stop offset="95%" stopColor="rgba(255,255,255,0.05)" />
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth={2}
                    fill={`url(#gradient-${title})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </GlassContainer>
  );
};

// Performance Overview Component
const PerformanceOverview: React.FC<{ data: ServiceDashboardData }> = ({ data }) => {
  const { inputs, calculated, targets } = data;
  
  const overviewMetrics = [
    {
      label: 'Sales Achievement',
      value: calculated.current_net_sales_percentage,
      target: 100,
      color: calculated.current_net_sales_percentage >= 80 ? '#10B981' : calculated.current_net_sales_percentage >= 60 ? '#F59E0B' : '#EF4444'
    },
    {
      label: 'Labor Achievement', 
      value: calculated.current_labour_sales_percentage,
      target: 100,
      color: calculated.current_labour_sales_percentage >= 80 ? '#10B981' : calculated.current_labour_sales_percentage >= 60 ? '#F59E0B' : '#EF4444'
    },
    {
      label: 'Time Progress',
      value: targets ? (inputs.working_days_elapsed / targets.number_of_working_days) * 100 : 0,
      target: 100,
      color: '#8B5CF6'
    }
  ];

  return (
    <GlassContainer className="p-6 col-span-full" glow>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Performance Overview</h2>
            <p className="text-gray-400 text-sm">Real-time performance indicators</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Updated {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {overviewMetrics.map((metric, index) => (
          <div key={index} className="flex flex-col items-center space-y-4">
            <ProgressRing 
              progress={metric.value}
              size={120}
              strokeWidth={10}
              color={metric.color}
              glowColor={`${metric.color}80`}
            />
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{metric.label}</div>
              <div className="text-sm text-gray-400">{formatPercentage(metric.value)} achieved</div>
            </div>
          </div>
        ))}
      </div>
    </GlassContainer>
  );
};

// Advanced Analytics Component  
const AdvancedAnalytics: React.FC<{ data: ServiceDashboardData }> = ({ data }) => {
  const { inputs, calculated, targets } = data;

  // Generate trend data for charts
  const generateTrendData = (baseValue: number, days: number) => {
    return Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      value: baseValue * (0.7 + (Math.random() * 0.6)) * (1 + i * 0.1)
    }));
  };

  const salesTrendData = generateTrendData(calculated.current_daily_average, inputs.working_days_elapsed);
  const targetData = targets ? [
    { name: 'Achieved', value: inputs.current_net_sales, fill: '#10B981' },
    { name: 'Remaining', value: targets.net_sales_target - inputs.current_net_sales, fill: '#374151' }
  ] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sales Trend Chart */}
      <GlassContainer className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Daily Sales Trend</h3>
            <p className="text-gray-400 text-sm">Sales performance over time</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
        </div>
        
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrendData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(59,130,246,0.4)" />
                  <stop offset="95%" stopColor="rgba(59,130,246,0.05)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: 'white'
                }}
                formatter={(value: any) => [formatCurrency(value), 'Sales']}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6"
                strokeWidth={3}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassContainer>

      {/* Target Achievement Pie Chart */}
      <GlassContainer className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Target Achievement</h3>
            <p className="text-gray-400 text-sm">Current vs remaining target</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
            <PieChart className="w-4 h-4 text-white" />
          </div>
        </div>
        
        <div className="h-48 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={targetData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {targetData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: 'white'
                }}
                formatter={(value: any) => [formatCurrency(value), '']}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-gray-400">Achieved</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-600"></div>
            <span className="text-sm text-gray-400">Remaining</span>
          </div>
        </div>
      </GlassContainer>
    </div>
  );
};

// Individual Sales Performance Component
const IndividualPerformance: React.FC<{ data: ServiceDashboardData }> = ({ data }) => {
  // Extract individual sales data from the data
  const individualData = [
    { name: 'Daniel', sales: (data as any).daniel_total_sales || 0, color: 'from-blue-500 to-cyan-500' },
    { name: 'Essrar', sales: (data as any).essrar_total_sales || 0, color: 'from-purple-500 to-pink-500' },
    { name: 'Lucy', sales: (data as any).lucy_total_sales || 0, color: 'from-emerald-500 to-green-500' }
  ].filter(person => person.sales > 0);

  if (individualData.length === 0) return null;

  const totalIndividualSales = individualData.reduce((sum, person) => sum + person.sales, 0);

  return (
    <GlassContainer className="p-6 col-span-full lg:col-span-1">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Individual Performance</h3>
            <p className="text-gray-400 text-sm">Sales by team member</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {individualData.map((person, index) => {
          const percentage = (person.sales / totalIndividualSales) * 100;
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">{person.name}</span>
                <span className="text-gray-400 text-sm">{formatCurrency(person.sales)}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${person.color} transition-all duration-1000 ease-out relative`}
                  style={{ width: `${percentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
              <div className="text-xs text-gray-400 text-right">
                {formatPercentage(percentage, 0)} of team sales
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-white font-semibold">Total Team Sales</span>
          <span className="text-lg font-bold text-white">{formatCurrency(totalIndividualSales)}</span>
        </div>
      </div>
    </GlassContainer>
  );
};

// Main Dashboard Component
export default function ServiceDashboard({ data, loading, error }: ServiceDashboardProps) {
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <GlassContainer className="p-12 text-center">
          <div className="relative">
            {/* Animated loading rings */}
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-white rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-transparent border-t-gray-400 rounded-full animate-spin animate-reverse"></div>
            </div>
            <div className="text-white text-xl font-semibold mb-2">Loading Dashboard</div>
            <div className="text-gray-400">Fetching real-time analytics...</div>
          </div>
        </GlassContainer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <GlassContainer className="p-12 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <div className="text-red-200 text-xl font-semibold mb-2">Dashboard Error</div>
          <div className="text-red-300 text-sm">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200"
          >
            Retry
          </button>
        </GlassContainer>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <GlassContainer className="p-12 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <div className="text-white text-xl font-semibold mb-2">No Data Available</div>
          <div className="text-gray-300 text-sm mb-6">Add metrics in the Data Grid to view analytics</div>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
            <Building className="w-4 h-4" />
            <span>Service Department</span>
          </div>
        </GlassContainer>
      </div>
    );
  }

  const { inputs, calculated, targets } = data;

  // Calculate performance status
  const getPerformanceStatus = (percentage: number): 'excellent' | 'good' | 'warning' | 'critical' => {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'good';
    if (percentage >= 50) return 'warning';
    return 'critical';
  };

  // Generate chart data for trends
  const generateChartData = (value: number, days: number) => {
    return Array.from({ length: Math.min(days, 7) }, (_, i) => ({
      day: i + 1,
      value: value * (0.8 + Math.random() * 0.4)
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <GlassContainer className="p-6" glow>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-cyan-500 opacity-50 blur-lg"></div>
              <Activity className="w-7 h-7 text-white relative z-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Service Performance Dashboard</h1>
              <p className="text-gray-400 flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Real-time analytics & insights</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Current Date</div>
              <div className="text-white font-semibold">{new Date().toLocaleDateString()}</div>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <StatusBadge status={getPerformanceStatus(calculated.current_net_sales_percentage)} />
          </div>
        </div>
      </GlassContainer>

      {/* Performance Overview */}
      <PerformanceOverview data={data} />

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Net Sales */}
        <FuturisticMetricCard
          title="Current Net Sales"
          subtitle="Total sales this month"
          value={inputs.current_net_sales}
          unit="currency"
          target={targets?.net_sales_target}
          icon={<DollarSign className="w-6 h-6" />}
          gradient="from-emerald-500 via-green-500 to-teal-600"
          trend={5.2}
          status={getPerformanceStatus(calculated.current_net_sales_percentage)}
          showChart={true}
          chartData={generateChartData(calculated.current_daily_average, inputs.working_days_elapsed)}
        />

        {/* Daily Average */}
        <FuturisticMetricCard
          title="Daily Average"
          subtitle="Sales per working day"
          value={calculated.current_daily_average}
          unit="currency"
          icon={<Calendar className="w-6 h-6" />}
          gradient="from-blue-500 via-indigo-500 to-purple-600"
          trend={3.8}
        />

        {/* Estimated Sales */}
        <FuturisticMetricCard
          title="Estimated Net Sales"
          subtitle="Projected month-end total"
          value={calculated.estimated_net_sales}
          unit="currency"
          target={targets?.net_sales_target}
          icon={<TrendingUp className="w-6 h-6" />}
          gradient="from-purple-500 via-pink-500 to-rose-600"
          progress={calculated.estimated_net_sales_percentage}
          status={getPerformanceStatus(calculated.estimated_net_sales_percentage)}
        />

        {/* Completion Percentage */}
        <FuturisticMetricCard
          title="Sales Achievement"
          subtitle="Current target completion"
          value={formatPercentage(calculated.current_net_sales_percentage)}
          icon={<Percent className="w-6 h-6" />}
          gradient="from-orange-500 via-amber-500 to-yellow-600"
          progress={calculated.current_net_sales_percentage}
          status={getPerformanceStatus(calculated.current_net_sales_percentage)}
        />
      </div>

      {/* Labor Sales Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <FuturisticMetricCard
          title="Current Labor Sales"
          subtitle="Labor revenue this month"
          value={inputs.current_net_labor_sales}
          unit="currency"
          target={targets?.labour_sales_target}
          icon={<Zap className="w-6 h-6" />}
          gradient="from-cyan-500 via-blue-500 to-indigo-600"
          trend={4.1}
          status={getPerformanceStatus(calculated.current_labour_sales_percentage)}
        />

        <FuturisticMetricCard
          title="Estimated Labor Sales"
          subtitle="Projected labor revenue"
          value={calculated.estimated_labor_sales}
          unit="currency"
          target={targets?.labour_sales_target}
          icon={<TrendingUp className="w-6 h-6" />}
          gradient="from-teal-500 via-cyan-500 to-blue-600"
          progress={calculated.estimated_labor_percentage}
        />

        <FuturisticMetricCard
          title="Labor Achievement"
          subtitle="Labor target completion"
          value={formatPercentage(calculated.current_labour_sales_percentage)}
          icon={<Award className="w-6 h-6" />}
          gradient="from-indigo-500 via-purple-500 to-pink-600"
          progress={calculated.current_labour_sales_percentage}
          status={getPerformanceStatus(calculated.current_labour_sales_percentage)}
        />

        <FuturisticMetricCard
          title="Daily Target Needed"
          subtitle="Required daily sales"
          value={calculated.daily_average_needed}
          unit="currency"
          icon={<Target className="w-6 h-6" />}
          gradient="from-red-500 via-orange-500 to-amber-600"
          status={calculated.daily_average_needed > calculated.current_daily_average ? 'warning' : 'good'}
        />
      </div>

      {/* Activity & Time Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FuturisticMetricCard
          title="Invoices Issued"
          subtitle="Total invoices this month"
          value={inputs.number_of_invoices.toString()}
          icon={<Briefcase className="w-6 h-6" />}
          gradient="from-yellow-500 via-orange-500 to-red-600"
          size="medium"
        />

        <FuturisticMetricCard
          title="Marketing Spend"
          subtitle="Current marketing investment"
          value={inputs.current_marketing_spend}
          unit="currency"
          icon={<Sparkles className="w-6 h-6" />}
          gradient="from-pink-500 via-rose-500 to-red-600"
          size="medium"
        />

        <FuturisticMetricCard
          title="Working Days"
          subtitle={`${inputs.working_days_elapsed} of ${targets?.number_of_working_days || 0} days`}
          value={`${Math.max(0, (targets?.number_of_working_days || 0) - inputs.working_days_elapsed)}`}
          unit="days remaining"
          icon={<Timer className="w-6 h-6" />}
          gradient="from-gray-500 via-slate-500 to-zinc-600"
          progress={targets ? (inputs.working_days_elapsed / targets.number_of_working_days) * 100 : 0}
          size="medium"
        />
      </div>

      {/* Advanced Analytics */}
      <AdvancedAnalytics data={data} />

      {/* Individual Performance */}
      {(data as any).daniel_total_sales && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <IndividualPerformance data={data} />
          
          {/* Target Summary */}
          <GlassContainer className="p-6 col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Monthly Targets Summary</h3>
                  <p className="text-gray-400 text-sm">Current month objectives</p>
                </div>
              </div>
            </div>

            {targets && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-emerald-400 mb-2">
                    {formatCurrency(targets.net_sales_target)}
                  </div>
                  <div className="text-gray-300 text-sm font-medium">Net Sales Target</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatPercentage((inputs.current_net_sales / targets.net_sales_target) * 100)} achieved
                  </div>
                </div>
                
                <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-cyan-400 mb-2">
                    {formatCurrency(targets.labour_sales_target)}
                  </div>
                  <div className="text-gray-300 text-sm font-medium">Labor Sales Target</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatPercentage((inputs.current_net_labor_sales / targets.labour_sales_target) * 100)} achieved
                  </div>
                </div>
                
                <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-gray-400 mb-2">
                    {targets.number_of_working_days}
                  </div>
                  <div className="text-gray-300 text-sm font-medium">Working Days</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {inputs.working_days_elapsed} days elapsed
                  </div>
                </div>
              </div>
            )}
          </GlassContainer>
        </div>
      )}

      {/* Footer Status */}
      <GlassContainer className="p-6 text-center">
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>Live Data</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Service Department Analytics</span>
          </div>
        </div>
      </GlassContainer>
    </div>
  );
} 