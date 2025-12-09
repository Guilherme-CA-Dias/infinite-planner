import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { DayEvent } from '@/types/event';
import { EventCard } from './EventCard';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface DayColumnProps {
  date: string;
  events: DayEvent[];
  onToggleComplete: (id: string) => void;
  onAddEvent: (date: string) => void;
  onEditEvent: (event: DayEvent) => void;
  onDeleteEvent: (event: DayEvent) => void;
}

export function DayColumn({ date, events, onToggleComplete, onAddEvent, onEditEvent, onDeleteEvent }: DayColumnProps) {
  const dateObj = parseISO(date);
  const today = isToday(dateObj);
  const tomorrow = isTomorrow(dateObj);
  const yesterday = isYesterday(dateObj);

  const getDateLabel = () => {
    const dayOfWeek = format(dateObj, 'EEEE');
    if (today) return `Today, ${dayOfWeek}`;
    if (tomorrow) return `Tomorrow, ${dayOfWeek}`;
    if (yesterday) return `Yesterday, ${dayOfWeek}`;
    return dayOfWeek;
  };

  const completedCount = events.filter(e => e.completed).length;
  const totalCount = events.length;

  return (
    <div 
      data-day-column
      className={cn(
        "flex-shrink-0 w-[280px] sm:w-72 md:w-80 flex flex-col",
        "animate-fade-in"
      )}
    >
      {/* Day header */}
      <div className={cn(
        "sticky top-0 z-10 px-1 pb-4",
        "bg-gradient-to-b from-background via-background to-transparent"
      )}>
        <div className={cn(
          "rounded-xl p-3 md:p-4 transition-all",
          today 
            ? "bg-primary text-primary-foreground shadow-glow" 
            : "bg-card border border-border/50 shadow-soft"
        )}>
          <div className="flex items-center justify-between mb-1">
            <span className={cn(
              "text-xl md:text-2xl font-display font-bold",
              !today && "text-foreground"
            )}>
              {format(dateObj, 'd')}
            </span>
            {totalCount > 0 && (
              <span className={cn(
                "text-xs font-medium px-1.5 md:px-2 py-0.5 md:py-1 rounded-full",
                today 
                  ? "bg-primary-foreground/20 text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {completedCount}/{totalCount}
              </span>
            )}
          </div>
          <p className={cn(
            "text-xs md:text-sm font-medium",
            today ? "text-primary-foreground/90" : "text-muted-foreground"
          )}>
            {getDateLabel()}
          </p>
          <p className={cn(
            "text-[10px] md:text-xs",
            today ? "text-primary-foreground/70" : "text-muted-foreground/70"
          )}>
            {format(dateObj, 'MMMM yyyy')}
          </p>
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 px-1 space-y-2 md:space-y-3 pb-4 md:pb-6">
        {events.map((event, index) => (
          <EventCard
            key={event.id}
            event={event}
            onToggleComplete={onToggleComplete}
            onEdit={onEditEvent}
            onDelete={onDeleteEvent}
            animationDelay={index * 50}
          />
        ))}
        {/* Add event button */}
        <Button
          variant="ghost"
          className={cn(
            "w-full h-11 md:h-12 border-2 border-dashed border-border/50 rounded-xl",
            "text-muted-foreground hover:text-foreground hover:border-primary/30",
            "hover:bg-accent/50 active:bg-accent transition-all group touch-manipulation",
            "text-sm md:text-base"
          )}
          onClick={() => onAddEvent(date)}
        >
          <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Add reminder</span>
          <span className="sm:hidden">Add</span>
        </Button>
        {events.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground/60">No events</p>
          </div>
        )}
      </div>
    </div>
  );
}

