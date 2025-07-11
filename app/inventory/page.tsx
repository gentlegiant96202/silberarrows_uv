"use client";
import Header from '@/components/Header';
import CarKanbanBoard from '@/components/CarKanbanBoard';

export default function InventoryPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CarKanbanBoard />
    </div>
  );
} 