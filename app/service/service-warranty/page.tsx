"use client";

import RouteProtector from '@/components/shared/RouteProtector';
import ServiceWarrantyContent from '@/components/shared/ServiceWarrantyContent';

export default function ServiceWarrantyPage() {
  return (
    <RouteProtector moduleName="service">
      <div className="min-h-screen bg-black flex flex-col">
        <ServiceWarrantyContent />
      </div>
    </RouteProtector>
  );
} 