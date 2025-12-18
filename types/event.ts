export interface DayEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  completed: boolean;
  color?: string;
  category?: string;
  time?: string;
  recurringEventId?: string;
  plannerId?: string;
  plannerColor?: string;
}

