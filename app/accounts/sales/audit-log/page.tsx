"use client";
import AuditLog from '@/components/modules/uv-crm/accounts/AuditLog';
import RouteProtector from '@/components/shared/RouteProtector';

export default function AuditLogPage() {
  return (
    <RouteProtector moduleName="accounts">
      <div className="h-full">
        <AuditLog />
      </div>
    </RouteProtector>
  );
}

