'use client';

import { X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type ActionType = 'delete' | 'modify';
type ScopeType = 'this' | 'future' | 'all';

interface EventActionDialogProps {
  open: boolean;
  action: ActionType;
  isRecurring: boolean;
  onClose: () => void;
  onConfirm: (scope: ScopeType) => void;
}

export function EventActionDialog({
  open,
  action,
  isRecurring,
  onClose,
  onConfirm,
}: EventActionDialogProps) {
  if (!open) return null;

  const actionText = action === 'delete' ? 'Delete' : 'Modify';
  const actionTextLower = action === 'delete' ? 'delete' : 'modify';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-xl shadow-elevated w-full max-w-md p-4 md:p-6 border border-border/50 mx-4 md:mx-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {actionText} Reminder
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {isRecurring ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              This is a recurring reminder. Would you like to {actionTextLower} this event only, or all future occurrences?
            </p>
            <div className="space-y-2">
              <button
                onClick={() => onConfirm('this')}
                className={cn(
                  "w-full px-4 py-3 text-left rounded-lg border-2 border-border",
                  "hover:border-primary hover:bg-accent/50 transition-all",
                  "flex flex-col"
                )}
              >
                <span className="font-medium text-foreground">This event only</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {actionText} only this occurrence
                </span>
              </button>
              <button
                onClick={() => onConfirm('future')}
                className={cn(
                  "w-full px-4 py-3 text-left rounded-lg border-2 border-border",
                  "hover:border-primary hover:bg-accent/50 transition-all",
                  "flex flex-col"
                )}
              >
                <span className="font-medium text-foreground">This and all future events</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {actionText} this occurrence and all future ones
                </span>
              </button>
              <button
                onClick={() => onConfirm('all')}
                className={cn(
                  "w-full px-4 py-3 text-left rounded-lg border-2 border-border",
                  "hover:border-destructive hover:bg-destructive/10 transition-all",
                  "flex flex-col"
                )}
              >
                <span className="font-medium text-destructive">All events in series</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {actionText} all past and future occurrences
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to {actionTextLower} this reminder?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant={action === 'delete' ? 'destructive' : 'hero'}
                onClick={() => onConfirm('this')}
              >
                {actionText}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

