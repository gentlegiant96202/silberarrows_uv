"use client";
import CarKanbanBoard from '@/components/modules/uv-crm/kanban/CarKanbanBoard';
import RouteProtector from '@/components/shared/RouteProtector';

export default function InventoryPage() {
  return (
    <RouteProtector moduleName="inventory">
      <CarKanbanBoard />
    </RouteProtector>
  );
} 