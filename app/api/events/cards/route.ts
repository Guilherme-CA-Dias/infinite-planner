import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EventCard from '@/models/EventCard';
import RecurringEvent from '@/models/RecurringEvent';
import CompletedRecurringEvent from '@/models/CompletedRecurringEvent';
import { z } from 'zod';
import { startOfDay, format, parseISO } from 'date-fns';
import { matchesRecurrence } from '@/lib/recurrence';

// GET - Fetch event cards for a date range (generates recurring events on-the-fly)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Parse startDate and endDate - they are ISO strings from the frontend
    // We need to work with local dates for iteration (what user sees), but store as UTC
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    // Use startOfDay in local timezone for iteration (matches what user sees in UI)
    const start = startOfDay(startDateObj);
    const end = startOfDay(endDateObj);

    // Fetch all single event cards (non-recurring or modified recurring)
    const singleCards = await EventCard.find({
      userId,
      date: {
        $gte: start,
        $lte: end,
      },
    }).sort({ date: 1, createdAt: 1 });

    // Fetch all recurring events
    const recurringEvents = await RecurringEvent.find({
      userId,
      $or: [
        { endDate: { $exists: false } },
        { endDate: { $gte: start } },
      ],
      startDate: { $lte: end },
    });

    // Fetch all completed recurring event dates
    const completedRecurringEvents = await CompletedRecurringEvent.find({
      userId,
      recurringEventId: { $in: recurringEvents.map(e => e._id) },
    });
    
    // Create a map of recurringEventId -> Set of completed dates (as date strings)
    const completedDatesMap = new Map<string, Set<string>>();
    completedRecurringEvents.forEach(completed => {
      const recurringId = completed.recurringEventId.toString();
      if (!completedDatesMap.has(recurringId)) {
        completedDatesMap.set(recurringId, new Set());
      }
      completed.completedDates.forEach(date => {
        // Format date using UTC to avoid timezone issues
        const dateObj = new Date(date);
        const dateStr = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`;
        completedDatesMap.get(recurringId)!.add(dateStr);
      });
    });

    // Generate cards from recurring events for the date range
    const generatedCards: Array<{
      _id: string;
      title: string;
      description?: string;
      date: string;
      completed: boolean;
      color: string;
      recurringEventId: string;
      isGenerated: boolean;
    }> = [];
    const dateMap = new Map<string, Set<string>>(); // Track which recurring events already have cards for each date

    // Filter out deleted cards (marked with __DELETED__ prefix)
    const activeCards = singleCards.filter(card => !card.title.startsWith('__DELETED__'));

    // Mark dates that already have modified cards (this prevents recurring event generation for those dates)
    // IMPORTANT: Any card with a recurringEventId for a specific date prevents generation of that recurring event for that date
    activeCards.forEach(card => {
      // Format date using UTC to match how we store completed dates
      // card.date is a Date object from MongoDB, extract UTC components
      const dateObj = new Date(card.date);
      // Use UTC methods to get the date components, ensuring consistency
      const year = dateObj.getUTCFullYear();
      const month = dateObj.getUTCMonth();
      const day = dateObj.getUTCDate();
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (card.recurringEventId) {
        // If this card has a recurringEventId, it means it's a modified instance of a recurring event
        // We should NOT generate the recurring event card for this date
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, new Set());
        }
        dateMap.get(dateKey)!.add(card.recurringEventId.toString());
      }
    });

    // Generate cards for each recurring event
    for (const recurringEvent of recurringEvents) {
      const currentDate = new Date(start);
      const eventStart = new Date(recurringEvent.startDate);
      const eventEnd = recurringEvent.endDate ? new Date(recurringEvent.endDate) : null;
      
      while (currentDate <= end) {
        // Skip if before event start
        if (currentDate < eventStart) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
        
        // Skip if past event end
        if (eventEnd && currentDate > eventEnd) {
          break;
        }
        
        // Format dateKey using local date (what user sees in UI)
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        
        // Convert local date to UTC date string for comparison with completed dates
        // When user sees "2025-12-10" (local), we need to check if that date is completed
        // Completed dates are stored as UTC dates representing the calendar date
        const localYear = currentDate.getFullYear();
        const localMonth = currentDate.getMonth();
        const localDay = currentDate.getDate();
        const utcDateFromLocal = new Date(Date.UTC(localYear, localMonth, localDay, 0, 0, 0, 0));
        const utcDateStr = `${utcDateFromLocal.getUTCFullYear()}-${String(utcDateFromLocal.getUTCMonth() + 1).padStart(2, '0')}-${String(utcDateFromLocal.getUTCDate()).padStart(2, '0')}`;
        
        // Skip if this date already has a modified card for this recurring event
        if (dateMap.has(dateKey) && dateMap.get(dateKey)!.has(recurringEvent._id.toString())) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // Check if this date matches the recurrence pattern
        if (matchesRecurrence(
          currentDate,
          recurringEvent.recurrenceType,
          recurringEvent.recurrenceConfig,
          eventStart
        )) {
          // Check if this date is marked as completed
          // Compare using UTC date string (how we store completed dates)
          const recurringId = recurringEvent._id.toString();
          const isCompleted = completedDatesMap.has(recurringId) && 
            completedDatesMap.get(recurringId)!.has(utcDateStr);
          
          // Generate a virtual card (not stored in DB)
          // Store the date as UTC to match how we store other dates
          generatedCards.push({
            _id: `recurring_${recurringEvent._id}_${dateKey}`, // Virtual ID uses local dateKey
            title: recurringEvent.title,
            description: recurringEvent.description,
            date: utcDateFromLocal.toISOString(), // Store as UTC date
            completed: isCompleted,
            color: recurringEvent.color || '#3b82f6',
            recurringEventId: recurringEvent._id.toString(),
            isGenerated: true,
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Merge single cards with generated cards, prioritizing stored cards
    // Use activeCards (filtered to exclude deleted ones)
    const allCards = [...activeCards.map(card => ({
      _id: card._id.toString(),
      title: card.title,
      description: card.description,
      date: card.date.toISOString(),
      completed: card.completed,
      color: card.color,
      recurringEventId: card.recurringEventId?.toString(),
      isGenerated: false,
    })), ...generatedCards];

    // Remove duplicates (if a stored card exists, remove the generated one)
    const uniqueCards = allCards.filter((card, index, self) => {
      if (card.isGenerated) {
        // Check if there's a stored card for this recurring event on this date
        // Extract date string from the virtual ID (format: recurring_{id}_{date})
        const parts = card._id.split('_');
        const dateKey = parts.length >= 3 ? parts[2] : format(parseISO(card.date), 'yyyy-MM-dd');
        
        return !self.some(c => {
          if (c.isGenerated || !c.recurringEventId || c.recurringEventId !== card.recurringEventId) {
            return false;
          }
          // Compare dates using UTC components to avoid timezone issues
          const cDateObj = new Date(c.date);
          const cDateStr = `${cDateObj.getUTCFullYear()}-${String(cDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(cDateObj.getUTCDate()).padStart(2, '0')}`;
          return cDateStr === dateKey;
        });
      }
      return true;
    });

    return NextResponse.json({ cards: uniqueCards }, { status: 200 });
  } catch (error) {
    console.error('Error fetching event cards:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update event card (move, complete, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cardId, updates } = z.object({
      cardId: z.string(),
      updates: z.object({
        date: z.string().or(z.date()).optional(),
        completed: z.boolean().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      }),
    }).parse(body);

    await connectDB();

    // Check if this is a generated card (starts with "recurring_")
    if (cardId.startsWith('recurring_')) {
      // Extract recurringEventId and date from the virtual ID
      const parts = cardId.split('_');
      const recurringEventId = parts[1];
      const dateKey = parts[2];
      
      // Check if a card already exists for this recurring event on this date
      // Parse dateKey as UTC to avoid timezone issues (dateKey is "yyyy-MM-dd")
      const [year, month, day] = dateKey.split('-').map(Number);
      const dateKeyUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      let card = await EventCard.findOne({
        userId,
        recurringEventId,
        date: dateKeyUTC,
      });

      if (!card) {
        // Create a new card for this recurring event instance
        const recurringEvent = await RecurringEvent.findById(recurringEventId);
        if (!recurringEvent) {
          return NextResponse.json(
            { error: 'Recurring event not found' },
            { status: 404 }
          );
        }

        // Parse date as UTC to avoid timezone issues
        const cardDate = updates.date 
          ? (typeof updates.date === 'string' && updates.date.match(/^\d{4}-\d{2}-\d{2}$/)
              ? (() => { const [y, m, d] = updates.date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)); })()
              : (() => {
                  const dateObj = new Date(updates.date);
                  return new Date(Date.UTC(
                    dateObj.getUTCFullYear(),
                    dateObj.getUTCMonth(),
                    dateObj.getUTCDate(),
                    0, 0, 0, 0
                  ));
                })())
          : dateKeyUTC;
        
        card = await EventCard.create({
          userId,
          recurringEventId,
          title: recurringEvent.title,
          description: recurringEvent.description,
          date: cardDate,
          color: recurringEvent.color || '#3b82f6',
          completed: false,
        });
      }

      // Update the card
      if (updates.date) {
        // Parse date as UTC to avoid timezone issues
        const dateValue = updates.date;
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateValue.split('-').map(Number);
          card.date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        } else {
          const dateObj = new Date(dateValue);
          card.date = new Date(Date.UTC(
            dateObj.getUTCFullYear(),
            dateObj.getUTCMonth(),
            dateObj.getUTCDate(),
            0, 0, 0, 0
          ));
        }
      }
      if (updates.completed !== undefined) {
        card.completed = updates.completed;
        card.completedAt = updates.completed ? new Date() : undefined;
        
        // If this is a recurring event, track completion in CompletedRecurringEvent
        if (recurringEventId) {
          // Use the dateKey directly (from the virtual ID) to avoid timezone issues
          // dateKey is in format "yyyy-MM-dd", create UTC date at midnight
          const [year, month, day] = dateKey.split('-').map(Number);
          const eventDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
          const dateStr = dateKey; // Use the original dateKey string directly
          
          let completedRecurring = await CompletedRecurringEvent.findOne({
            userId,
            recurringEventId,
          });
          
          if (!completedRecurring) {
            completedRecurring = await CompletedRecurringEvent.create({
              userId,
              recurringEventId,
              completedDates: [],
            });
          }
          
          if (updates.completed) {
            // Add date if not already present - compare using dateKey string directly
            // Also remove any duplicates that might exist
            const dateStr = dateKey; // Use the original dateKey string directly
            const alreadyCompleted = completedRecurring.completedDates.some(d => {
              const dObj = new Date(d);
              const dStr = `${dObj.getUTCFullYear()}-${String(dObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dObj.getUTCDate()).padStart(2, '0')}`;
              return dStr === dateStr;
            });
            if (!alreadyCompleted) {
              // Remove any potential duplicates first (shouldn't happen, but just in case)
              completedRecurring.completedDates = completedRecurring.completedDates.filter(d => {
                const dObj = new Date(d);
                const dStr = `${dObj.getUTCFullYear()}-${String(dObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dObj.getUTCDate()).padStart(2, '0')}`;
                return dStr !== dateStr;
              });
              // Now add the date
              completedRecurring.completedDates.push(eventDate);
              completedRecurring.updatedAt = new Date();
              await completedRecurring.save();
            }
          } else {
            // Remove date if present - compare using dateKey string directly
            completedRecurring.completedDates = completedRecurring.completedDates.filter(d => {
              const dObj = new Date(d);
              const dStr = `${dObj.getUTCFullYear()}-${String(dObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dObj.getUTCDate()).padStart(2, '0')}`;
              return dStr !== dateStr;
            });
            completedRecurring.updatedAt = new Date();
            await completedRecurring.save();
          }
        }
      }
      if (updates.title) {
        card.title = updates.title;
      }
      if (updates.description !== undefined) {
        card.description = updates.description;
      }
      card.updatedAt = new Date();

      await card.save();
      return NextResponse.json({ card }, { status: 200 });
    }

    // Regular card update
    const card = await EventCard.findOne({ _id: cardId, userId });
    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Update card
    if (updates.date) {
      // Parse date as UTC to avoid timezone issues
      const dateValue = updates.date;
      if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateValue.split('-').map(Number);
        card.date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      } else {
        const dateObj = new Date(dateValue);
        card.date = new Date(Date.UTC(
          dateObj.getUTCFullYear(),
          dateObj.getUTCMonth(),
          dateObj.getUTCDate(),
          0, 0, 0, 0
        ));
      }
    }
    if (updates.completed !== undefined) {
      card.completed = updates.completed;
      card.completedAt = updates.completed ? new Date() : undefined;
      
      // If this card is from a recurring event, track completion in CompletedRecurringEvent
      if (card.recurringEventId) {
        // card.date is already a Date object from MongoDB, extract UTC date components
        const dateObj = new Date(card.date);
        const eventDate = new Date(Date.UTC(
          dateObj.getUTCFullYear(),
          dateObj.getUTCMonth(),
          dateObj.getUTCDate(),
          0, 0, 0, 0
        ));
        const dateStr = `${eventDate.getUTCFullYear()}-${String(eventDate.getUTCMonth() + 1).padStart(2, '0')}-${String(eventDate.getUTCDate()).padStart(2, '0')}`;
        
        let completedRecurring = await CompletedRecurringEvent.findOne({
          userId,
          recurringEventId: card.recurringEventId,
        });
        
        if (!completedRecurring) {
          completedRecurring = await CompletedRecurringEvent.create({
            userId,
            recurringEventId: card.recurringEventId,
            completedDates: [],
          });
        }
        
        if (updates.completed) {
          // Add date if not already present - compare using UTC date strings
          // First, remove any existing entries for this date (deduplication)
          completedRecurring.completedDates = completedRecurring.completedDates.filter(d => {
            const dObj = new Date(d);
            const dStr = `${dObj.getUTCFullYear()}-${String(dObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dObj.getUTCDate()).padStart(2, '0')}`;
            return dStr !== dateStr;
          });
          // Now add the date (only once)
          completedRecurring.completedDates.push(eventDate);
          completedRecurring.updatedAt = new Date();
          await completedRecurring.save();
        } else {
          // Remove date if present - compare using UTC date strings
          completedRecurring.completedDates = completedRecurring.completedDates.filter(d => {
            const dObj = new Date(d);
            const dStr = `${dObj.getUTCFullYear()}-${String(dObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dObj.getUTCDate()).padStart(2, '0')}`;
            return dStr !== dateStr;
          });
          completedRecurring.updatedAt = new Date();
          await completedRecurring.save();
        }
      }
    }
    if (updates.title) {
      card.title = updates.title;
    }
    if (updates.description !== undefined) {
      card.description = updates.description;
    }
    card.updatedAt = new Date();

    await card.save();

    return NextResponse.json({ card }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('Error updating event card:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a single event card
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, date, color } = z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().optional(),
      date: z.string().or(z.date()),
      color: z.string().optional(),
    }).parse(body);

    await connectDB();

    // Parse date string (yyyy-MM-dd) as UTC date to avoid timezone issues
    // If date is already a Date object, convert to UTC
    let cardDate: Date;
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date string in format yyyy-MM-dd - parse as UTC
      const [year, month, day] = date.split('-').map(Number);
      cardDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    } else {
      // Date object or ISO string - extract UTC components
      const dateObj = new Date(date);
      cardDate = new Date(Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        dateObj.getUTCDate(),
        0, 0, 0, 0
      ));
    }
    
    // Check if a card already exists for this user and date (non-recurring)
    const existingCard = await EventCard.findOne({
      userId,
      date: cardDate,
      $or: [
        { recurringEventId: null },
        { recurringEventId: { $exists: false } }
      ]
    });

    if (existingCard) {
      return NextResponse.json(
        { error: 'An event already exists on this date' },
        { status: 409 }
      );
    }

    const card = await EventCard.create({
      userId,
      title,
      description,
      date: cardDate,
      color: color || '#3b82f6',
    });

    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('Error creating event card:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
