"use client";
import Header from '@/components/Header';
import RouteProtector from '@/components/shared/RouteProtector';
import ServiceWarrantyContent from '@/components/shared/ServiceWarrantyContent';

export default function ServiceWarrantyPage() {
  return (
    <RouteProtector moduleName="service">
      <div className="h-screen bg-black flex flex-col overflow-hidden">
        <Header />
        <ServiceWarrantyContent />
      </div>
    </RouteProtector>
  );
} 