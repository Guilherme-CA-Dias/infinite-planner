'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { KanbanBoard } from '@/components/KanbanBoard';
import { Header } from '@/components/Header';
import CalendarView from '@/components/CalendarView';
import CreateEventModal from '@/components/CreateEventModal';

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [view] = useState<'kanban' | 'calendar'>('kanban');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addEventDialogOpen, setAddEventDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const todayRef = useRef<{ scrollToToday: () => void }>({ scrollToToday: () => {} });

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/login');
      return;
    }
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      setUserId(storedUserId);
      setLoading(false);
    }, 0);
  }, [router]);

  const handleTodayClick = () => {
    if (todayRef.current?.scrollToToday) {
      todayRef.current.scrollToToday();
    }
  };

  if (loading || !userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header 
        onAddEvent={() => setAddEventDialogOpen(true)}
        onTodayClick={handleTodayClick}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {view === 'kanban' ? (
          <KanbanBoard 
            todayRef={todayRef}
            onAddEventClick={() => setAddEventDialogOpen(true)}
            addEventDialogOpen={addEventDialogOpen}
            setAddEventDialogOpen={setAddEventDialogOpen}
            userId={userId}
          />
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <CalendarView userId={userId} />
          </div>
        )}
      </main>

      {/* Create Recurring Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userId={userId}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
