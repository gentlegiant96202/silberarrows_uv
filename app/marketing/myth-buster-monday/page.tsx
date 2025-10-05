'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/shared/AuthProvider';
import RouteProtector from '@/components/shared/RouteProtector';
import MythBusterMondayBoard from '@/components/modules/marketing/MythBusterMondayBoard';

function MythBusterMondayContent() {
  return (
    <div className="h-full bg-black">
      <div className="flex h-full">
        <div className="flex-1 overflow-auto">
          <MythBusterMondayBoard />
        </div>
      </div>
    </div>
  );
}

export default function MythBusterMondayPage() {
  return (
    <RouteProtector moduleName="marketing">
      <Suspense fallback={
        <div className="h-full bg-black flex items-center justify-center">
          <div className="text-white">Loading Myth Buster Monday...</div>
        </div>
      }>
        <MythBusterMondayContent />
      </Suspense>
    </RouteProtector>
  );
}
