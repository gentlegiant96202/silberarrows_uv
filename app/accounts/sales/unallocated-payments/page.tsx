"use client";
import UnallocatedPayments from '@/components/modules/uv-crm/accounts/UnallocatedPayments';
import RouteProtector from '@/components/shared/RouteProtector';

export default function UnallocatedPaymentsPage() {
  return (
    <RouteProtector moduleName="accounts">
      <div className="h-full">
        <UnallocatedPayments />
      </div>
    </RouteProtector>
  );
}

