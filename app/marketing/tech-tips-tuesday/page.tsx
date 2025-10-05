'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/shared/AuthProvider';
import RouteProtector from '@/components/shared/RouteProtector';
import TechTipsTuesdayBoard from '@/components/modules/marketing/TechTipsTuesdayBoard';

function TechTipsTuesdayContent() {
  return (
    <div className="h-full bg-black">
      <div className="flex h-full">
        <div className="flex-1 overflow-auto">
          <TechTipsTuesdayBoard />
        </div>
      </div>
    </div>
  );
}

export default function TechTipsTuesdayPage() {
  return (
    <RouteProtector moduleName="marketing">
      <Suspense fallback={
        <div className="h-full bg-black flex items-center justify-center">
          <div className="text-white">Loading Tech Tips Tuesday...</div>
        </div>
      }>
        <TechTipsTuesdayContent />
      </Suspense>
    </RouteProtector>
  );
}
