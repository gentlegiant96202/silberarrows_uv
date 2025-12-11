"use client";
import BankFinanceList from '@/components/modules/uv-crm/accounts/BankFinanceList';
import RouteProtector from '@/components/shared/RouteProtector';

export default function BankFinancePage() {
  return (
    <RouteProtector moduleName="accounts">
      <div className="h-full">
        <BankFinanceList />
      </div>
    </RouteProtector>
  );
}

