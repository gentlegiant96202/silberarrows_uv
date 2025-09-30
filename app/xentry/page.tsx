"use client";
import RouteProtector from '@/components/shared/RouteProtector';
import XentryContent from '@/components/shared/XentryContent';

export default function XentryPage() {
  return (
    <RouteProtector moduleName="xentry">
      <XentryContent />
    </RouteProtector>
  );
}

