"use client";
import KanbanBoard from '@/components/modules/uv-crm/kanban/KanbanBoard';
import RouteProtector from '@/components/shared/RouteProtector';

export default function CRMPage() {
  return (
    <RouteProtector moduleName="uv_crm">
      {/* DEBUG: mount banner */}
      <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
        <div className="mx-auto mt-2 w-fit px-2 py-0.5 rounded bg-emerald-600/80 text-[10px] text-white shadow">
          CRM mounted
        </div>
      </div>
      <div className="flex h-full">
        <div className="flex-1 overflow-hidden">
          <KanbanBoard />
        </div>
      </div>
    </RouteProtector>
  );
} 