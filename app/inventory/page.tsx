"use client";
import Header from '@/components/Header';
import CarKanbanBoard from '@/components/modules/uv-crm/kanban/CarKanbanBoard';
import RouteProtector from '@/components/shared/RouteProtector';

export default function InventoryPage() {
  return (
    <RouteProtector moduleName="uv_crm">
    <div className="min-h-screen flex flex-col">
      <Header />
      <CarKanbanBoard />
    </div>
    </RouteProtector>
  );
} 