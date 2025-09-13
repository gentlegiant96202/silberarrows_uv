"use client";
import KanbanBoard from '@/components/modules/uv-crm/kanban/KanbanBoard';
import RouteProtector from '@/components/shared/RouteProtector';

export default function CRMPage() {
  return (
    <RouteProtector moduleName="uv_crm">
      <div className="flex h-full">
        <div className="flex-1 overflow-hidden">
          <KanbanBoard />
        </div>
      </div>
    </RouteProtector>
  );
} 