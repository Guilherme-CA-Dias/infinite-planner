'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { parseISO } from 'date-fns';

interface EventCardData {
  _id: string;
  title: string;
  date: string;
  completed: boolean;
  color?: string;
}

interface CalendarViewProps {
  userId: string;
}

export default function CalendarView({ userId }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [cards, setCards] = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    fetch(`/api/events/cards?startDate=${start.toISOString()}&endDate=${end.toISOString()}`, {
      headers: {
        'x-user-id': userId,
      },
    })
      .then(res => res.json())
      .then(data => {
        setCards(data.cards || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching cards:', err);
        setLoading(false);
      });
  }, [currentMonth, userId]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week for the month start
  const firstDayOfWeek = getDay(monthStart);
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const getCardsForDate = (date: Date) => {
    return cards.filter(card => isSameDay(parseISO(card.date), date));
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-gray-800">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}

        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {daysInMonth.map(day => {
          const dayCards = getCardsForDate(day);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div
              key={day.toISOString()}
              className={`aspect-square border border-gray-200 rounded-lg p-1 ${
                isToday ? 'bg-blue-50 border-blue-300' : ''
              } ${!isCurrentMonth ? 'opacity-50' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayCards.slice(0, 3).map(card => (
                  <div
                    key={card._id}
                    className="text-xs px-1 py-0.5 rounded truncate"
                    style={{
                      backgroundColor: card.color ? `${card.color}20` : '#3b82f620',
                      color: card.color || '#3b82f6',
                    }}
                  >
                    {card.title}
                  </div>
                ))}
                {dayCards.length > 3 && (
                  <div className="text-xs text-gray-500 px-1">
                    +{dayCards.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

