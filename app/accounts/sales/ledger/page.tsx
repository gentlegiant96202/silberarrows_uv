"use client";
import AccountsLedger from '@/components/modules/uv-crm/accounts/AccountsLedger';
import RouteProtector from '@/components/shared/RouteProtector';

export default function SalesLedgerPage() {
  return (
    <RouteProtector moduleName="accounts">
      <div className="h-full">
        <AccountsLedger />
      </div>
    </RouteProtector>
  );
}

