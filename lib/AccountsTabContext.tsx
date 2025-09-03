'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AccountsTabContextType {
  activeTab: 'service' | 'sales' | 'leasing';
  setActiveTab: (tab: 'service' | 'sales' | 'leasing') => void;
}

const AccountsTabContext = createContext<AccountsTabContextType | undefined>(undefined);

export function AccountsTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<'service' | 'sales' | 'leasing'>('service');

  return (
    <AccountsTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </AccountsTabContext.Provider>
  );
}

export function useAccountsTab() {
  const context = useContext(AccountsTabContext);
  if (context === undefined) {
    throw new Error('useAccountsTab must be used within an AccountsTabProvider');
  }
  return context;
}
