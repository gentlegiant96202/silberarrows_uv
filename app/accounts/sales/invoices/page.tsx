"use client";
import InvoicesList from '@/components/modules/uv-crm/accounts/InvoicesList';
import RouteProtector from '@/components/shared/RouteProtector';

export default function SalesInvoicesPage() {
  return (
    <RouteProtector moduleName="accounts">
      <div className="h-full">
        <InvoicesList />
      </div>
    </RouteProtector>
  );
}

