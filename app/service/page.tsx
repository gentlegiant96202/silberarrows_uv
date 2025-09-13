"use client";
import RouteProtector from '@/components/shared/RouteProtector';
import ServiceWarrantyContent from '@/components/shared/ServiceWarrantyContent';

export default function ServicePage() {
  return (
    <RouteProtector moduleName="service">
      <ServiceWarrantyContent />
    </RouteProtector>
  );
} 