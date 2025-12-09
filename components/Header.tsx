import { CalendarDays, Infinity, Plus, Search, Settings } from 'lucide-react';
import { Button } from './ui/button';

interface HeaderProps {
  onAddEvent: () => void;
  onTodayClick: () => void;
}

export function Header({ onAddEvent, onTodayClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Infinity className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base md:text-lg font-display font-bold text-foreground">
              Infinite Planner
            </h1>
            <p className="text-xs text-muted-foreground -mt-0.5">
              Your daily rhythm
            </p>
          </div>
        </div>

        {/* Center Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="soft"
            size="sm"
            className="font-medium text-xs md:text-sm px-2 md:px-3"
            onClick={onTodayClick}
          >
            <CalendarDays className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-1.5" />
            <span className="hidden md:inline">Today</span>
          </Button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon-sm" className="hidden sm:flex">
            <Search className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="hidden sm:flex">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button 
            variant="hero" 
            size="sm"
            onClick={onAddEvent}
            className="ml-1 md:ml-2 text-xs md:text-sm px-2 md:px-3"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-1" />
            <span className="hidden md:inline">New Reminder</span>
            <span className="md:hidden">Add</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

