"use client";
import Header from '@/components/Header';
import dynamic from 'next/dynamic';

// Lazy load the Kanban board to reduce initial bundle size
const ConsignmentKanbanBoard = dynamic(() => import('@/components/ConsignmentKanbanBoard'), { ssr: false });

export default function ConsignmentsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <ConsignmentKanbanBoard />
    </div>
  );
} 