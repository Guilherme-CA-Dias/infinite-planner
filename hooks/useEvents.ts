import { useState, useCallback, useRef } from 'react';
import { format, parseISO, subDays, addDays } from 'date-fns';
import { DayEvent } from '@/types/event';

interface EventCardData {
  _id: string;
  title: string;
  description?: string;
  date: string;
  completed: boolean;
  color?: string;
  recurringEventId?: string;
}

export function useEvents(userId: string) {
  const [events, setEvents] = useState<DayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const fetchEvents = useCallback(async (startDate: Date, endDate: Date, merge: boolean = false) => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current && !merge) return;
    
    isFetchingRef.current = true;
    try {
      const response = await fetch(
        `/api/events/cards?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            'x-user-id': userId,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      const mappedEvents: DayEvent[] = data.cards.map((card: EventCardData) => ({
        id: card._id,
        title: card.title,
        description: card.description,
        date: format(parseISO(card.date), 'yyyy-MM-dd'),
        completed: card.completed,
        color: card.color,
        recurringEventId: card.recurringEventId,
      }));

      if (merge) {
        // Merge with existing events, avoiding duplicates
        setEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newEvents = mappedEvents.filter(e => !existingIds.has(e.id));
          return [...prev, ...newEvents];
        });
      } else {
        setEvents(mappedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId]);

  const getEventsForDate = useCallback((date: string): DayEvent[] => {
    return events.filter(event => event.date === date);
  }, [events]);

  const toggleComplete = useCallback(async (id: string) => {
    const event = events.find(e => e.id === id);
    if (!event) return;

    try {
      const response = await fetch('/api/events/cards', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          cardId: id,
          updates: {
            completed: !event.completed,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to update event');

      // Optimistically update UI
      setEvents(prev => prev.map(e => 
        e.id === id ? { ...e, completed: !e.completed } : e
      ));
    } catch (error) {
      console.error('Error updating event:', error);
      // Revert on error
      setEvents(prev => prev.map(e => 
        e.id === id ? { ...e, completed: event.completed } : e
      ));
    }
  }, [events, userId]);

  const addEvent = useCallback(async (eventData: {
    title: string;
    description?: string;
    date: string;
    recurrenceType?: string;
    recurrenceConfig?: { interval?: number; days?: number[] };
    endDate?: string;
    color?: string;
  }) => {
    try {
      if (eventData.recurrenceType) {
        // Create recurring event
        const response = await fetch('/api/events/recurring', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({
            title: eventData.title,
            description: eventData.description,
            recurrenceType: eventData.recurrenceType,
            recurrenceConfig: eventData.recurrenceConfig || {},
            startDate: eventData.date,
            color: eventData.color,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create event');
        }
      } else {
        // Create single event card
        const response = await fetch('/api/events/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({
            title: eventData.title,
            description: eventData.description,
            date: eventData.date,
            color: eventData.color,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create event');
        }
      }

      // Refresh events - fetch a wider range to ensure we have the new event
      const eventDate = new Date(eventData.date);
      const start = subDays(eventDate, 7);
      const end = addDays(eventDate, 7);
      await fetchEvents(start, end, true); // merge = true to avoid losing existing events
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  }, [userId, fetchEvents]);

  const deleteEvent = useCallback(async (event: DayEvent, scope: 'this' | 'future' | 'all' = 'this') => {
    try {
      if (event.id.startsWith('recurring_')) {
        // This is a generated recurring event card
        const parts = event.id.split('_');
        if (parts.length >= 3) {
          const recurringEventId = parts[1];
          const response = await fetch(`/api/events/recurring/${recurringEventId}?scope=${scope}&eventDate=${event.date}`, {
            method: 'DELETE',
            headers: {
              'x-user-id': userId,
            },
          });
          if (!response.ok) throw new Error('Failed to delete recurring event');
        }
      } else if (event.recurringEventId) {
        // This is a stored card from a recurring event
        if (scope === 'this') {
          // Delete just this card
          const response = await fetch(`/api/events/cards/${event.id}`, {
            method: 'DELETE',
            headers: {
              'x-user-id': userId,
            },
          });
          if (!response.ok) throw new Error('Failed to delete event');
        } else {
          // Delete recurring event with scope
          const response = await fetch(`/api/events/recurring/${event.recurringEventId}?scope=${scope}&eventDate=${event.date}`, {
            method: 'DELETE',
            headers: {
              'x-user-id': userId,
            },
          });
          if (!response.ok) throw new Error('Failed to delete recurring event');
        }
      } else {
        // Regular single event
        const response = await fetch(`/api/events/cards/${event.id}`, {
          method: 'DELETE',
          headers: {
            'x-user-id': userId,
          },
        });
        if (!response.ok) throw new Error('Failed to delete event');
      }

      // Refresh events
      const today = new Date();
      const start = subDays(today, 30);
      const end = addDays(today, 30);
      await fetchEvents(start, end, true);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }, [userId, fetchEvents]);

  const updateEvent = useCallback(async (event: DayEvent, updates: {
    title?: string;
    description?: string;
    date?: string;
    color?: string;
  }, scope: 'this' | 'future' | 'all' = 'this') => {
    try {
      if (event.id.startsWith('recurring_')) {
        // This is a generated recurring event card
        const parts = event.id.split('_');
        if (parts.length >= 3) {
          const recurringEventId = parts[1];
          const response = await fetch(`/api/events/recurring/${recurringEventId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
            },
            body: JSON.stringify({
              scope,
              eventDate: event.date,
              updates,
            }),
          });
          if (!response.ok) throw new Error('Failed to update recurring event');
        }
      } else if (event.recurringEventId) {
        // This is a stored card from a recurring event
        if (scope === 'this') {
          // Update just this card
          const response = await fetch(`/api/events/cards/${event.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
            },
            body: JSON.stringify({ updates }),
          });
          if (!response.ok) throw new Error('Failed to update event');
        } else {
          // Update recurring event with scope
          const response = await fetch(`/api/events/recurring/${event.recurringEventId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
            },
            body: JSON.stringify({
              scope,
              eventDate: event.date,
              updates,
            }),
          });
          if (!response.ok) throw new Error('Failed to update recurring event');
        }
      } else {
        // Regular single event
        const response = await fetch(`/api/events/cards/${event.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({ updates }),
        });
        if (!response.ok) throw new Error('Failed to update event');
      }

      // Refresh events
      const today = new Date();
      const start = subDays(today, 30);
      const end = addDays(today, 30);
      await fetchEvents(start, end, true);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }, [userId, fetchEvents]);

  return {
    events,
    loading,
    getEventsForDate,
    toggleComplete,
    addEvent,
    fetchEvents,
    deleteEvent,
    updateEvent,
  };
}
