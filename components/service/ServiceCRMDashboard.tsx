"use client";
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar } from 'recharts';
import type { ServiceDashboardData } from '@/types/service';
import dayjs from 'dayjs';
import { TrendingUp, TrendingDown, Target, Clock, Users, Wrench, Calendar, DollarSign } from 'lucide-react';

interface ServiceCRMDashboardProps {
  data: ServiceDashboardData | null;
  loading?: boolean;
  error?: string | null;
  selectedDate?: string;
}

export default function ServiceCRMDashboard({ data, loading, error, selectedDate }: ServiceCRMDashboardProps) {
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-white/60">Loading service data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-white/60">No service data available</div>
      </div>
    );
  }

  const { inputs, calculated, targets } = data;

  return (
    <div className="p-4 text-white text-sm space-y-6">
      {/* Header with Key Performance Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Service Performance Center</h1>
          <p className="text-white/60 text-xs">
            {selectedDate && dayjs(selectedDate).format('MMMM D, YYYY')} • Day {calculated.working_days_elapsed} of {targets?.number_of_working_days || 22}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-400">
            {calculated.current_net_sales_percentage.toFixed(1)}%
          </div>
          <div className="text-xs text-white/60">Target Achievement</div>
        </div>
      </div>

      {/* Primary Sales Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <div className={`text-xs px-2 py-1 rounded ${calculated.current_net_sales_percentage >= 75 ? 'bg-green-500/20 text-green-400' : calculated.current_net_sales_percentage >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
              {calculated.current_net_sales_percentage >= 75 ? 'Excellent' : calculated.current_net_sales_percentage >= 50 ? 'On Track' : 'Behind'}
            </div>
          </div>
          <p className="text-[11px] text-white/60 mb-1">Current Net Sales</p>
          <p className="text-xl font-bold text-white">
            {new Intl.NumberFormat('en-AE', { 
              style: 'currency', 
              currency: 'AED',
              notation: 'compact',
              maximumFractionDigits: 0
            }).format(inputs.current_net_sales)}
          </p>
          <p className="text-[9px] text-white/40">
            {calculated.current_net_sales_percentage.toFixed(1)}% of {new Intl.NumberFormat('en-AE', { 
              style: 'currency', 
              currency: 'AED',
              notation: 'compact'
            }).format(targets?.net_sales_target || 0)}
          </p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <Wrench className="w-5 h-5 text-blue-400" />
            <div className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
              Labor
            </div>
          </div>
          <p className="text-[11px] text-white/60 mb-1">Labor Sales</p>
          <p className="text-xl font-bold text-white">
            {new Intl.NumberFormat('en-AE', { 
              style: 'currency', 
              currency: 'AED',
              notation: 'compact',
              maximumFractionDigits: 0
            }).format(inputs.current_net_labor_sales)}
          </p>
          <p className="text-[9px] text-white/40">
            {calculated.current_labour_sales_percentage.toFixed(1)}% of labor target
          </p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <div className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
              Daily
            </div>
          </div>
          <p className="text-[11px] text-white/60 mb-1">Daily Average</p>
          <p className="text-xl font-bold text-white">
            {new Intl.NumberFormat('en-AE', { 
              style: 'currency', 
              currency: 'AED',
              notation: 'compact',
              maximumFractionDigits: 0
            }).format(calculated.current_daily_average)}
          </p>
          <p className="text-[9px] text-white/40">
            Per working day
          </p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-orange-400" />
            <div className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400">
              Projection
            </div>
          </div>
          <p className="text-[11px] text-white/60 mb-1">Month Estimate</p>
          <p className="text-xl font-bold text-white">
            {new Intl.NumberFormat('en-AE', { 
              style: 'currency', 
              currency: 'AED',
              notation: 'compact',
              maximumFractionDigits: 0
            }).format(calculated.estimated_net_sales)}
          </p>
          <p className="text-[9px] text-white/40">
            {calculated.estimated_net_sales_percentage.toFixed(1)}% of target
          </p>
        </div>
      </div>

      {/* Progress Visualization */}
      <div className="grid grid-cols-2 gap-6">
        {/* Target Progress Ring */}
        <div className="rounded-lg bg-black/70 backdrop-blur p-6 border border-white/10">
          <h3 className="text-sm font-semibold text-white/80 mb-4">Target Progress</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#00ff88"
                  strokeWidth="8"
                  strokeDasharray={`${calculated.current_net_sales_percentage * 2.83} 283`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <div className="text-2xl font-bold text-white">
                  {calculated.current_net_sales_percentage.toFixed(0)}%
                </div>
                <div className="text-xs text-white/60">Complete</div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xs text-white/60">Remaining</div>
              <div className="text-sm font-semibold text-white">
                {new Intl.NumberFormat('en-AE', { 
                  style: 'currency', 
                  currency: 'AED',
                  notation: 'compact'
                }).format(calculated.remaining_net_sales)}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/60">Days Left</div>
              <div className="text-sm font-semibold text-white">
                {(targets?.number_of_working_days || 22) - calculated.working_days_elapsed}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="rounded-lg bg-black/70 backdrop-blur p-6 border border-white/10">
          <h3 className="text-sm font-semibold text-white/80 mb-4">Performance Breakdown</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-white/60">Net Sales vs Target</span>
                <span className="text-xs text-green-400">{calculated.current_net_sales_percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-green-400 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(calculated.current_net_sales_percentage, 100)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-white/60">Labor Sales vs Target</span>
                <span className="text-xs text-blue-400">{calculated.current_labour_sales_percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-blue-400 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(calculated.current_labour_sales_percentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xs text-white/60">Invoices</div>
                  <div className="text-lg font-bold text-white">{inputs.number_of_invoices}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Daily Need</div>
                  <div className="text-lg font-bold text-white">
                    {calculated.daily_average_needed > 0 ? 
                      new Intl.NumberFormat('en-AE', { 
                        style: 'currency', 
                        currency: 'AED',
                        notation: 'compact'
                      }).format(calculated.daily_average_needed) : 
                      '✓'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Performance */}
      {((data as any).daniel_total_sales || (data as any).essrar_total_sales || (data as any).lucy_total_sales) && (
        <div className="rounded-lg bg-black/70 backdrop-blur p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-white/80">Team Performance</h3>
            <Users className="w-5 h-5 text-white/60" />
          </div>
          
          {(() => {
            const teamData = [
              { name: 'Daniel', sales: (data as any).daniel_total_sales || 0, color: '#00ff88' },
              { name: 'Essrar', sales: (data as any).essrar_total_sales || 0, color: '#0088ff' },
              { name: 'Lucy', sales: (data as any).lucy_total_sales || 0, color: '#ff8800' }
            ].filter(member => member.sales > 0);

            const totalTeamSales = teamData.reduce((sum, member) => sum + member.sales, 0);
            const maxSales = Math.max(...teamData.map(m => m.sales));

            return (
              <div className="grid grid-cols-3 gap-6">
                {teamData.map((member) => {
                  const percentage = totalTeamSales > 0 ? (member.sales / totalTeamSales) * 100 : 0;
                  const barWidth = maxSales > 0 ? (member.sales / maxSales) * 100 : 0;
                  
                  return (
                    <div key={member.name} className="text-center">
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-white mb-1">{member.name}</div>
                        <div className="text-lg font-bold" style={{ color: member.color }}>
                          {new Intl.NumberFormat('en-AE', { 
                            style: 'currency', 
                            currency: 'AED',
                            notation: 'compact'
                          }).format(member.sales)}
                        </div>
                        <div className="text-xs text-white/60">{percentage.toFixed(1)}% of team</div>
                      </div>
                      
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-1000"
                          style={{ 
                            width: `${barWidth}%`,
                            backgroundColor: member.color
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="rounded-lg bg-black/70 backdrop-blur p-6 border border-white/10">
          <h3 className="text-sm font-semibold text-white/80 mb-4">Sales Progression</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={Array.from({ length: calculated.working_days_elapsed }, (_, i) => ({
                day: i + 1,
                cumulative: (calculated.current_net_sales / calculated.working_days_elapsed) * (i + 1) * (0.8 + Math.random() * 0.4),
                target: targets?.net_sales_target ? (targets.net_sales_target / (targets.number_of_working_days || 22)) * (i + 1) : 0
              }))}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#ffffff60', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#ffffff60', fontSize: 10 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }}
                />
                
                <Line type="monotone" dataKey="target" stroke="#ffffff40" strokeWidth={1} strokeDasharray="5,5" dot={false} />
                <Area type="monotone" dataKey="cumulative" stroke="#00ff88" strokeWidth={2} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Composition */}
        <div className="rounded-lg bg-black/70 backdrop-blur p-6 border border-white/10">
          <h3 className="text-sm font-semibold text-white/80 mb-4">Sales Composition</h3>
          <div className="h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Labor Sales', value: inputs.current_net_labor_sales, color: '#00ff88' },
                    { name: 'Parts & Other', value: inputs.current_net_sales - inputs.current_net_labor_sales, color: '#ffffff40' }
                  ]}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={30}
                >
                  <Cell fill="#00ff88" />
                  <Cell fill="#ffffff40" />
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }}
                  formatter={(value: any) => [
                    new Intl.NumberFormat('en-AE', { 
                      style: 'currency', 
                      currency: 'AED',
                      notation: 'compact'
                    }).format(value), 
                    ''
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mx-auto mb-1"></div>
              <div className="text-xs text-white/60">Labor</div>
              <div className="text-sm font-semibold text-white">{calculated.current_labour_sales_percentage.toFixed(1)}%</div>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-white/40 rounded-full mx-auto mb-1"></div>
              <div className="text-xs text-white/60">Parts & Other</div>
              <div className="text-sm font-semibold text-white">{(100 - calculated.current_labour_sales_percentage).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-5 gap-4">
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner text-center">
          <Clock className="w-4 h-4 text-white/60 mx-auto mb-1" />
          <p className="text-[10px] text-white/60">Days Elapsed</p>
          <p className="text-lg font-bold text-white">{calculated.working_days_elapsed}</p>
        </div>
        
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner text-center">
          <Calendar className="w-4 h-4 text-white/60 mx-auto mb-1" />
          <p className="text-[10px] text-white/60">Days Remaining</p>
          <p className="text-lg font-bold text-white">{(targets?.number_of_working_days || 22) - calculated.working_days_elapsed}</p>
        </div>
        
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner text-center">
          <TrendingUp className="w-4 h-4 text-white/60 mx-auto mb-1" />
          <p className="text-[10px] text-white/60">Progress Rate</p>
          <p className="text-lg font-bold text-white">
            {(calculated.current_net_sales_percentage / calculated.working_days_elapsed * (targets?.number_of_working_days || 22)).toFixed(0)}%
          </p>
        </div>
        
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner text-center">
          <Target className="w-4 h-4 text-white/60 mx-auto mb-1" />
          <p className="text-[10px] text-white/60">Target</p>
          <p className="text-lg font-bold text-white">
            {new Intl.NumberFormat('en-AE', { 
              style: 'currency', 
              currency: 'AED',
              notation: 'compact'
            }).format(targets?.net_sales_target || 0)}
          </p>
        </div>
        
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner text-center">
          <DollarSign className="w-4 h-4 text-white/60 mx-auto mb-1" />
          <p className="text-[10px] text-white/60">Marketing Spend</p>
          <p className="text-lg font-bold text-white">
            {new Intl.NumberFormat('en-AE', { 
              style: 'currency', 
              currency: 'AED',
              notation: 'compact'
            }).format(inputs.current_marketing_spend)}
          </p>
        </div>
      </div>
    </div>
  );
}; 