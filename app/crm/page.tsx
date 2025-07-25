"use client";
import Header from '@/components/Header';
import KanbanBoard from '@/components/modules/uv-crm/kanban/KanbanBoard';

export default function CRMPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="flex h-[calc(100vh-72px)]">
        <div className="flex-1 overflow-auto">
          <KanbanBoard />
        </div>
      </div>
    </main>
  );
} 