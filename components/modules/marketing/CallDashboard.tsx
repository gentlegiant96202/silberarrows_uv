'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Target,
  Award,
  AlertTriangle,
  BarChart3,
  Activity
} from 'lucide-react';

// Import the same data structure from CallLogBoard for consistency
interface CallLogEntry {
  id: string;
  date: string;
  time: string;
  customer_name: string;
  phone_number: string;
  reach_out_method: string;
  person_in_charge: string;
  answered_yn: string;
  action_taken: string;
  person_in_charge_2: string;
  answered_yn_2: string;
  notes: string;
}

// Mock data - in real implementation this would come from API
const mockCallLogEntries: CallLogEntry[] = [
  {
    id: '1',
    date: '04/07/2024',
    time: '16:05',
    customer_name: 'Arhama',
    phone_number: '563211666',
    reach_out_method: 'Call',
    person_in_charge: 'Gareth',
    answered_yn: 'No',
    action_taken: 'Transferred to Next Agent',
    person_in_charge_2: 'Gareth',
    answered_yn_2: 'Yes',
    notes: ''
  },
  {
    id: '2',
    date: '04/07/2024',
    time: '16:19',
    customer_name: 'Farsi',
    phone_number: '559866426',
    reach_out_method: 'Call',
    person_in_charge: 'Daniel',
    answered_yn: 'Yes',
    action_taken: 'Closed',
    person_in_charge_2: '',
    answered_yn_2: '',
    notes: ''
  },
  {
    id: '3',
    date: '04/07/2024',
    time: '17:36',
    customer_name: 'Taj',
    phone_number: 'ANONYMOUS',
    reach_out_method: 'Call',
    person_in_charge: 'Gareth',
    answered_yn: 'Yes',
    action_taken: 'Closed',
    person_in_charge_2: '',
    answered_yn_2: '',
    notes: ''
  },
  {
    id: '4',
    date: '04/07/2024',
    time: '17:46',
    customer_name: 'Jim',
    phone_number: '554707449',
    reach_out_method: 'Call',
    person_in_charge: 'Alex',
    answered_yn: 'Yes',
    action_taken: 'Closed',
    person_in_charge_2: '',
    answered_yn_2: '',
    notes: ''
  },
  {
    id: '5',
    date: '05/07/2024',
    time: '10:10',
    customer_name: 'Michael',
    phone_number: 'ANONYMOUS',
    reach_out_method: 'Call',
    person_in_charge: '',
    answered_yn: '',
    action_taken: '',
    person_in_charge_2: '',
    answered_yn_2: '',
    notes: 'enquired service for other car brands (Audi & others)'
  },
  {
    id: '6',
    date: '05/07/2024',
    time: '13:20',
    customer_name: 'Indu',
    phone_number: '505582946',
    reach_out_method: 'Call',
    person_in_charge: 'Alex',
    answered_yn: 'No',
    action_taken: 'Transferred to Next Agent',
    person_in_charge_2: 'Nick',
    answered_yn_2: 'Yes',
    notes: 'was looking for Dan, who was on day off but was adamant in speaking to someone for assistance'
  },
  {
    id: '7',
    date: '05/07/2024',
    time: '15:30',
    customer_name: 'Emar',
    phone_number: '585225699',
    reach_out_method: 'Call',
    person_in_charge: '',
    answered_yn: '',
    action_taken: '',
    person_in_charge_2: '',
    answered_yn_2: '',
    notes: 'call was dropped, called back did not answer - will call again'
  },
  {
    id: '8',
    date: '05/07/2024',
    time: '15:32',
    customer_name: 'Pascal',
    phone_number: '502205307',
    reach_out_method: 'Call',
    person_in_charge: 'Remi',
    answered_yn: 'No',
    action_taken: '',
    person_in_charge_2: '',
    answered_yn_2: '',
    notes: 'was looking for Gareth about collecting his A35 today - posted in Whatsapp call group'
  }
];

export default function CallDashboard() {
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>(mockCallLogEntries);
  const [selectedDateRange, setSelectedDateRange] = useState('7days');
  const [selectedStaff, setSelectedStaff] = useState('all');

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalCalls = callLogs.length;
    const answeredCalls = callLogs.filter(log => 
      log.answered_yn.toLowerCase() === 'yes' || log.answered_yn_2.toLowerCase() === 'yes'
    ).length;
    const closedCalls = callLogs.filter(log => 
      log.action_taken.toLowerCase().includes('closed')
    ).length;
    const transferredCalls = callLogs.filter(log => 
      log.action_taken.toLowerCase().includes('transferred')
    ).length;
    const anonymousCalls = callLogs.filter(log => 
      log.phone_number === 'ANONYMOUS'
    ).length;

    const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;
    const closeRate = totalCalls > 0 ? (closedCalls / totalCalls) * 100 : 0;
    const transferRate = totalCalls > 0 ? (transferredCalls / totalCalls) * 100 : 0;

    // Staff performance
    const staffPerformance = callLogs.reduce((acc, log) => {
      const staff1 = log.person_in_charge;
      const staff2 = log.person_in_charge_2;
      
      if (staff1) {
        if (!acc[staff1]) acc[staff1] = { total: 0, answered: 0, closed: 0 };
        acc[staff1].total += 1;
        if (log.answered_yn.toLowerCase() === 'yes') acc[staff1].answered += 1;
        if (log.action_taken.toLowerCase().includes('closed')) acc[staff1].closed += 1;
      }
      
      if (staff2) {
        if (!acc[staff2]) acc[staff2] = { total: 0, answered: 0, closed: 0 };
        acc[staff2].total += 1;
        if (log.answered_yn_2.toLowerCase() === 'yes') acc[staff2].answered += 1;
        if (log.action_taken.toLowerCase().includes('closed')) acc[staff2].closed += 1;
      }
      
      return acc;
    }, {} as Record<string, { total: number; answered: number; closed: number }>);

    // Daily breakdown
    const dailyBreakdown = callLogs.reduce((acc, log) => {
      if (!acc[log.date]) {
        acc[log.date] = { total: 0, answered: 0, closed: 0 };
      }
      acc[log.date].total += 1;
      if (log.answered_yn.toLowerCase() === 'yes' || log.answered_yn_2.toLowerCase() === 'yes') {
        acc[log.date].answered += 1;
      }
      if (log.action_taken.toLowerCase().includes('closed')) {
        acc[log.date].closed += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; answered: number; closed: number }>);

    return {
      totalCalls,
      answeredCalls,
      closedCalls,
      transferredCalls,
      anonymousCalls,
      answerRate,
      closeRate,
      transferRate,
      staffPerformance,
      dailyBreakdown
    };
  }, [callLogs, selectedDateRange, selectedStaff]);

  const MetricCard = ({ 
    title, 
    value, 
    percentage, 
    icon: Icon, 
    trend, 
    trendValue,
    color = 'blue' 
  }: {
    title: string;
    value: string | number;
    percentage?: number;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  }) => {
    const colorClasses = {
      blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300',
      green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-300',
      yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-300',
      red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-300',
      purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300',
    };

    return (
      <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6 backdrop-blur-sm`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-white/80">{title}</h3>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-white">{value}</div>
          {percentage !== undefined && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/10 rounded-full h-2">
                <div 
                  className="bg-current h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-white/70">{percentage.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 py-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Call Center Dashboard</h1>
              <p className="text-white/60">Performance metrics and analytics</p>
            </div>
          </div>
          
          {/* Date Range Selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Calls"
          value={metrics.totalCalls}
          icon={Phone}
          trend="up"
          trendValue="+12%"
          color="blue"
        />
        <MetricCard
          title="Answer Rate"
          value={`${metrics.answerRate.toFixed(1)}%`}
          percentage={metrics.answerRate}
          icon={CheckCircle}
          trend="up"
          trendValue="+5%"
          color="green"
        />
        <MetricCard
          title="Close Rate"
          value={`${metrics.closeRate.toFixed(1)}%`}
          percentage={metrics.closeRate}
          icon={Target}
          trend="down"
          trendValue="-2%"
          color="yellow"
        />
        <MetricCard
          title="Transfer Rate"
          value={`${metrics.transferRate.toFixed(1)}%`}
          percentage={metrics.transferRate}
          icon={ArrowUpRight}
          trend="down"
          trendValue="-8%"
          color="purple"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Answered Calls"
          value={metrics.answeredCalls}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Closed Calls"
          value={metrics.closedCalls}
          icon={Award}
          color="blue"
        />
        <MetricCard
          title="Anonymous Calls"
          value={metrics.anonymousCalls}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Staff Performance */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Staff Performance</h2>
          </div>
          
          <div className="space-y-4">
            {Object.entries(metrics.staffPerformance).map(([staff, data]) => {
              const answerRate = data.total > 0 ? (data.answered / data.total) * 100 : 0;
              const closeRate = data.total > 0 ? (data.closed / data.total) * 100 : 0;
              
              return (
                <div key={staff} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">{staff}</h3>
                    <div className="text-sm text-white/60">{data.total} calls</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-white/60 mb-1">Answer Rate</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-green-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${answerRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-green-300">{answerRate.toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-white/60 mb-1">Close Rate</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${closeRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-blue-300">{closeRate.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Breakdown */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Daily Breakdown</h2>
          </div>
          
          <div className="space-y-4">
            {Object.entries(metrics.dailyBreakdown).map(([date, data]) => {
              const answerRate = data.total > 0 ? (data.answered / data.total) * 100 : 0;
              
              return (
                <div key={date} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">{date}</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-blue-300">{data.total} calls</span>
                      <span className="text-green-300">{data.answered} answered</span>
                      <span className="text-purple-300">{data.closed} closed</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/10 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-400 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${answerRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-white">{answerRate.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Goals and Targets */}
      <div className="mt-8 bg-gradient-to-br from-indigo-500/20 to-purple-600/10 border border-indigo-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Daily Targets & Goals</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-300 mb-2">85%</div>
            <div className="text-white/60 text-sm">Answer Rate Target</div>
            <div className={`text-xs mt-1 ${metrics.answerRate >= 85 ? 'text-green-400' : 'text-yellow-400'}`}>
              Current: {metrics.answerRate.toFixed(1)}% {metrics.answerRate >= 85 ? '✓' : '⚠'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-300 mb-2">60%</div>
            <div className="text-white/60 text-sm">Close Rate Target</div>
            <div className={`text-xs mt-1 ${metrics.closeRate >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
              Current: {metrics.closeRate.toFixed(1)}% {metrics.closeRate >= 60 ? '✓' : '⚠'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-pink-300 mb-2">50</div>
            <div className="text-white/60 text-sm">Daily Call Target</div>
            <div className={`text-xs mt-1 ${metrics.totalCalls >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
              Current: {metrics.totalCalls} calls {metrics.totalCalls >= 50 ? '✓' : '⚠'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 