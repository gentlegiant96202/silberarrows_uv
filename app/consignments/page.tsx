"use client";
import dynamic from 'next/dynamic';
import RouteProtector from '@/components/shared/RouteProtector';

// Lazy load the Kanban board to reduce initial bundle size
const ConsignmentKanbanBoard = dynamic(() => import('@/components/modules/uv-crm/kanban/ConsignmentKanbanBoard'), { ssr: false });

export default function ConsignmentsPage() {
  return (
    <RouteProtector moduleName="uv_crm">
      <ConsignmentKanbanBoard />
    </RouteProtector>
  );
} 