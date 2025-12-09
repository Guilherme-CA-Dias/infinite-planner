'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface EditEventDialogProps {
  open: boolean;
  event: {
    id: string;
    title: string;
    description?: string;
    date: string;
    color?: string;
    recurringEventId?: string;
  };
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    date: string;
    color?: string;
  }) => Promise<void>;
}

export function EditEventDialog({
  open,
  event,
  onClose,
  onSave,
}: EditEventDialogProps) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || '');
  const [selectedDate, setSelectedDate] = useState(event.date);
  const [color, setColor] = useState(event.color || '#3b82f6');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(event.title);
      setDescription(event.description || '');
      setSelectedDate(event.date);
      setColor(event.color || '#3b82f6');
    }
  }, [open, event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        date: selectedDate,
        color,
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
              Color
            </label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 rounded-lg border border-border cursor-pointer"
            />
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

