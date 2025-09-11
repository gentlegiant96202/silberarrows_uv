"use client";
import CarKanbanBoard from '@/components/modules/uv-crm/kanban/CarKanbanBoard';
import RouteProtector from '@/components/shared/RouteProtector';

export default function InventoryPage() {
  return (
    <RouteProtector moduleName="inventory">
      {/* DEBUG: mount banner */}
      <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
        <div className="mx-auto mt-2 w-fit px-2 py-0.5 rounded bg-emerald-600/80 text-[10px] text-white shadow">
          Inventory mounted
        </div>
      </div>
      <CarKanbanBoard />
    </RouteProtector>
  );
} 