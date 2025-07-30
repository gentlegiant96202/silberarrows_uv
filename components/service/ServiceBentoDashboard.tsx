"use client";
import React from 'react';
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
  Award,
  Activity
} from 'lucide-react';
import MagicBento, { BentoCardProps } from '@/components/shared/MagicBento';
import type { ServiceDashboardData } from '@/types/service';
import { formatServiceValue } from '@/types/service';

interface ServiceBentoDashboardProps {
  data: ServiceDashboardData | null;
  loading?: boolean;
  error?: string | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-AE', { 
    style: 'currency', 
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export default function ServiceBentoDashboard({ data, loading, error }: ServiceBentoDashboardProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-400/20 border-t-purple-400 mx-auto mb-4"></div>
          <div className="text-white text-lg font-medium">Loading magic dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <div className="text-red-200 text-lg font-medium mb-2">Dashboard Error</div>
          <div className="text-red-300">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-white text-xl font-semibold mb-2">No Data Available</div>
          <div className="text-gray-300">Add metrics in the Data Grid to see the magic!</div>
        </div>
      </div>
    );
  }

  const { inputs, calculated, targets } = data;

  // Calculate performance indicators
  const salesProgress = calculated.current_net_sales_percentage;
  const laborProgress = calculated.current_labour_sales_percentage;
  const estimatedAchievement = calculated.estimated_net_sales_percentage;
  const daysRemaining = Math.max(0, (targets?.number_of_working_days || 0) - inputs.working_days_elapsed);

  const bentoCards: BentoCardProps[] = [
    // Card 1: Current Net Sales (Large card - top left)
    {
      color: "#060010",
      label: "Net Sales",
      title: formatCurrency(inputs.current_net_sales),
      description: `${formatPercentage(salesProgress)} of target achieved`,
      children: (
        <div className="flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <span className="text-sm text-purple-300">💰 Net Sales</span>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold text-white mb-2">
              {formatCurrency(inputs.current_net_sales)}
            </div>
            <div className="text-sm text-gray-300 mb-3">
              {formatPercentage(salesProgress)} of target
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  salesProgress >= 100 ? 'bg-green-400' : 
                  salesProgress >= 80 ? 'bg-blue-400' : 
                  salesProgress >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${Math.min(salesProgress, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Target: {formatCurrency(targets?.net_sales_target || 0)}
            </div>
          </div>
        </div>
      ),
    },
    
    // Card 2: Daily Performance (top right)
    {
      color: "#060010",
      label: "Daily Avg",
      title: formatCurrency(calculated.current_daily_average),
      description: "Average sales per working day",
      children: (
        <div className="flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <span className="text-sm text-purple-300">📅 Daily Average</span>
            <Calendar className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold text-white mb-2">
              {formatCurrency(calculated.current_daily_average)}
            </div>
            <div className="text-sm text-gray-300 mb-2">
              Per working day
            </div>
            <div className="text-xs text-gray-400">
              {inputs.working_days_elapsed} days elapsed
            </div>
          </div>
        </div>
      ),
    },

    // Card 3: Estimated Achievement (Large card spanning 2x2 - center)
    {
      color: "#060010",
      label: "Projection",
      title: `${formatPercentage(estimatedAchievement)} Estimated`,
      description: "Month-end projection based on current pace",
      children: (
        <div className="flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <span className="text-sm text-purple-300">🎯 Projection</span>
            <TrendingUp className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <div className="text-4xl font-bold text-white mb-4">
              {formatPercentage(estimatedAchievement)}
            </div>
            <div className="text-lg text-gray-300 mb-4">
              Estimated Achievement
            </div>
            <div className="text-sm text-gray-400 mb-4">
              {formatCurrency(calculated.estimated_net_sales)} projected
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              estimatedAchievement >= 100 ? 'bg-green-500/20 text-green-300' :
              estimatedAchievement >= 90 ? 'bg-blue-500/20 text-blue-300' :
              estimatedAchievement >= 80 ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-red-500/20 text-red-300'
            }`}>
              {estimatedAchievement >= 100 ? 'Target Exceeded' :
               estimatedAchievement >= 90 ? 'On Track' :
               estimatedAchievement >= 80 ? 'Close to Target' :
               'Below Target'}
            </div>
          </div>
        </div>
      ),
    },

    // Card 4: Labor Sales (bottom left spanning 2x1)
    {
      color: "#060010",
      label: "Labor Sales",
      title: formatCurrency(inputs.current_net_labor_sales),
      description: `${formatPercentage(laborProgress)} of labor target`,
      children: (
        <div className="flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <span className="text-sm text-purple-300">⚡ Labor Sales</span>
            <Clock className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-xl font-bold text-white mb-2">
              {formatCurrency(inputs.current_net_labor_sales)}
            </div>
            <div className="text-sm text-gray-300 mb-3">
              {formatPercentage(laborProgress)} of target
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  laborProgress >= 100 ? 'bg-cyan-400' : 
                  laborProgress >= 80 ? 'bg-teal-400' : 
                  laborProgress >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${Math.min(laborProgress, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Estimated: {formatCurrency(calculated.estimated_labor_sales)}
            </div>
          </div>
        </div>
      ),
    },

    // Card 5: Marketing & Invoices
    {
      color: "#060010",
      label: "Activity",
      title: `${inputs.number_of_invoices} Invoices`,
      description: `${formatCurrency(inputs.current_marketing_spend)} marketing`,
      children: (
        <div className="flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <span className="text-sm text-purple-300">📋 Activity</span>
            <BarChart3 className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold text-white mb-2">
              {inputs.number_of_invoices}
            </div>
            <div className="text-sm text-gray-300 mb-3">
              Invoices issued
            </div>
            <div className="text-xs text-gray-400">
              Marketing: {formatCurrency(inputs.current_marketing_spend)}
            </div>
          </div>
        </div>
      ),
    },

    // Card 6: Days Remaining (bottom right)
    {
      color: "#060010",
      label: "Time Left",
      title: `${daysRemaining} Days`,
      description: `${formatCurrency(calculated.daily_average_needed)} daily target`,
      children: (
        <div className="flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <span className="text-sm text-purple-300">⏰ Time Left</span>
            <Target className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold text-white mb-2">
              {daysRemaining}
            </div>
            <div className="text-sm text-gray-300 mb-2">
              Days remaining
            </div>
            <div className="text-xs text-gray-400">
              Need: {formatCurrency(calculated.daily_average_needed)}/day
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Magic Service Dashboard</h2>
          <p className="text-gray-300">Real-time insights with interactive animations</p>
        </div>
      </div>

      {/* MagicBento Cards */}
      <MagicBento
        cards={bentoCards}
        enableStars={true}
        enableSpotlight={true}
        enableBorderGlow={true}
        enableTilt={true}
        enableMagnetism={true}
        clickEffect={true}
        glowColor="147, 51, 234" // Purple glow to match your theme
        spotlightRadius={400}
        particleCount={8}
      />

      {/* Quick Stats Summary */}
      <div className="mt-8 backdrop-blur-md bg-gradient-to-br from-gray-900/90 via-black/80 to-purple-900/30 rounded-xl border border-purple-500/20 p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-md">
            <Award className="w-4 h-4 text-white" />
          </div>
          <span>Performance Summary</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-purple-800/20 to-purple-900/20 rounded-lg border border-purple-500/20 backdrop-blur-sm">
            <p className="text-2xl font-bold text-purple-400 mb-1">
              {formatPercentage(salesProgress)}
            </p>
            <p className="text-gray-300 text-sm font-medium">Sales Progress</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-cyan-800/20 to-cyan-900/20 rounded-lg border border-cyan-500/20 backdrop-blur-sm">
            <p className="text-2xl font-bold text-cyan-400 mb-1">
              {formatPercentage(laborProgress)}
            </p>
            <p className="text-gray-300 text-sm font-medium">Labor Progress</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-800/20 to-blue-900/20 rounded-lg border border-blue-500/20 backdrop-blur-sm">
            <p className="text-2xl font-bold text-blue-400 mb-1">
              {formatPercentage(estimatedAchievement)}
            </p>
            <p className="text-gray-300 text-sm font-medium">Projected Achievement</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-800/20 to-orange-900/20 rounded-lg border border-orange-500/20 backdrop-blur-sm">
            <p className="text-2xl font-bold text-orange-400 mb-1">
              {daysRemaining}
            </p>
            <p className="text-gray-300 text-sm font-medium">Days Remaining</p>
          </div>
        </div>
      </div>
    </div>
  );
} 