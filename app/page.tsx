"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/shared/AuthProvider';
import Header from '@/components/Header'
import KanbanBoard from '@/components/modules/uv-crm/kanban/KanbanBoard'

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return null; // or a spinner placeholder
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="flex h-[calc(100vh-72px)]">
        <div className="flex-1 overflow-auto">
      <KanbanBoard />
        </div>
      </div>
    </main>
  )
} 