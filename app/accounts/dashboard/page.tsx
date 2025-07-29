"use client";
import React from 'react';
import Header from '@/components/shared/header/Header';
import RouteProtector from '@/components/shared/RouteProtector';
import { Calculator, TrendingUp, DollarSign, FileText, PieChart, BarChart3, Users, Clock } from 'lucide-react';

export default function AccountsDashboard() {
  return (
    <RouteProtector moduleName="accounts">
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-stone-400 via-stone-300 to-stone-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Accounts Department</h1>
                <p className="text-gray-600">Financial reporting, accounting, and business analytics</p>
              </div>
            </div>
          </div>

          {/* Coming Soon Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-stone-400 via-stone-300 to-stone-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Calculator className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Accounts Department Coming Soon</h2>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
              We're building comprehensive financial management tools including reporting, analytics, and accounting workflows.
            </p>

            {/* Feature Preview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Financial Reports</h3>
                <p className="text-gray-600 text-sm">Automated financial reporting and statements</p>
              </div>

              <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Business Analytics</h3>
                <p className="text-gray-600 text-sm">Performance insights and trend analysis</p>
              </div>

              <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <PieChart className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Budget Management</h3>
                <p className="text-gray-600 text-sm">Budget planning and expense tracking</p>
              </div>

              <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Invoice Management</h3>
                <p className="text-gray-600 text-sm">Automated invoicing and payment tracking</p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-stone-50 rounded-lg border border-stone-200 inline-block">
              <div className="flex items-center gap-2 text-stone-700">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Expected Launch: Q2 2024</span>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Features in Development</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">Real-time financial dashboard</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Automated reconciliation</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700">Multi-currency support</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-700">Tax compliance tools</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Plans</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-stone-500 rounded-full"></div>
                  <span className="text-gray-700">Sales data from UV Department</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-stone-500 rounded-full"></div>
                  <span className="text-gray-700">Service revenue from Workshop</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-stone-500 rounded-full"></div>
                  <span className="text-gray-700">Lease payments from Leasing</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-stone-500 rounded-full"></div>
                  <span className="text-gray-700">Marketing spend analytics</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </RouteProtector>
  );
} 