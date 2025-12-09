import { DayEvent } from '@/types/event';
import { Check, Clock, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EventMenu } from './EventMenu';

interface EventCardProps {
  event: DayEvent;
  onToggleComplete: (id: string) => void;
  onEdit: (event: DayEvent) => void;
  onDelete: (event: DayEvent) => void;
  animationDelay?: number;
}

const categoryColors: Record<string, string> = {
  Health: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Work: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Home: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Personal: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  Wellness: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

export function EventCard({ event, onToggleComplete, onEdit, onDelete, animationDelay = 0 }: EventCardProps) {
  const categoryClass = event.category 
    ? categoryColors[event.category] || 'bg-muted text-muted-foreground border-border'
    : 'bg-muted text-muted-foreground border-border';

  return (
    <div
      className={cn(
        "group relative bg-card rounded-xl p-3 md:p-4 shadow-soft border border-border/50",
        "hover:shadow-elevated hover:border-border transition-all duration-200",
        "animate-slide-up cursor-pointer",
        event.completed && "opacity-60"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Completion checkbox */}
      <button
        onClick={() => onToggleComplete(event.id)}
        className={cn(
          "absolute top-3 md:top-4 left-3 md:left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center",
          "transition-all duration-200 touch-manipulation",
          event.completed 
            ? "bg-success border-success" 
            : "border-border hover:border-primary active:scale-95"
        )}
      >
        {event.completed && (
          <Check className="w-3 h-3 text-success-foreground" />
        )}
      </button>

      {/* More options */}
      <div className="absolute top-2 md:top-3 right-2 md:right-3">
        <EventMenu
          event={event}
          onEdit={() => onEdit(event)}
          onDelete={() => onDelete(event)}
        />
      </div>

      {/* Content */}
      <div className="pl-7 md:pl-8 pr-5 md:pr-6">
        <h4 className={cn(
          "font-medium text-sm md:text-base text-foreground mb-1 transition-all",
          event.completed && "line-through text-muted-foreground"
        )}>
          {event.title}
        </h4>
        {event.description && (
          <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3 line-clamp-2">
            {event.description}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {event.time && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{event.time}</span>
            </div>
          )}
          {event.category && (
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
              categoryClass
            )}>
              {event.category}
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Repeat className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
