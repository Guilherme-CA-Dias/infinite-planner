'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { getIconComponent } from '@/lib/iconHelper';

interface Planner {
  _id: string;
  name: string;
  color: string;
  icon?: string;
}

interface EditEventDialogProps {
  open: boolean;
  event: {
    id: string;
    title: string;
    description?: string;
    date: string;
    plannerId?: string;
    recurringEventId?: string;
  };
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    date: string;
    plannerId?: string;
  }) => Promise<void>;
  userId: string;
}

export function EditEventDialog({
  open,
  event,
  onClose,
  onSave,
  userId,
}: EditEventDialogProps) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || '');
  const [selectedDate, setSelectedDate] = useState(event.date);
  const [selectedPlannerId, setSelectedPlannerId] = useState<string>(event.plannerId || '');
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [loadingPlanners, setLoadingPlanners] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(event.title);
      setDescription(event.description || '');
      setSelectedDate(event.date);
      setSelectedPlannerId(event.plannerId || '');
      fetchPlanners();
    }
  }, [open, event, userId]);

  const fetchPlanners = async () => {
    setLoadingPlanners(true);
    try {
      const response = await fetch('/api/planners', {
        headers: {
          'x-user-id': userId,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Combine owned and shared planners
        const allPlanners = [
          ...(data.planners || []),
          ...(data.sharedPlanners || [])
        ];
        setPlanners(allPlanners);
      }
    } catch (error) {
      console.error('Error fetching planners:', error);
    } finally {
      setLoadingPlanners(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        date: selectedDate,
        plannerId: selectedPlannerId || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-xl shadow-elevated w-full max-w-md p-4 md:p-6 border border-border/50 mx-4 md:mx-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Edit Reminder</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Take Vitamin D"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Date *
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Planner *
            </label>
            {loadingPlanners ? (
              <div className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground">
                Loading planners...
              </div>
            ) : (
              <select
                value={selectedPlannerId}
                onChange={(e) => setSelectedPlannerId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a planner</option>
                {planners.map((planner) => {
                  const IconComponent = getIconComponent(planner.icon);
                  return (
                    <option key={planner._id} value={planner._id}>
                      {planner.name}
                    </option>
                  );
                })}
              </select>
            )}
            {planners.length === 0 && !loadingPlanners && (
              <p className="text-xs text-muted-foreground mt-1">
                No planners available. Create one first.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="hero"
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

