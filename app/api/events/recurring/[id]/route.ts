import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RecurringEvent from '@/models/RecurringEvent';
import EventCard from '@/models/EventCard';
import { z } from 'zod';
import { startOfDay, parseISO, subDays } from 'date-fns';

// PATCH - Update recurring event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { scope, updates } = z.object({
      scope: z.enum(['this', 'future', 'all']).optional(),
      updates: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        recurrenceType: z.enum(['daily', 'everyXDays', 'daysOfWeek']).optional(),
        recurrenceConfig: z.object({
          interval: z.number().min(1).optional(),
          days: z.array(z.number().min(0).max(6)).optional(),
        }).optional(),
        startDate: z.string().or(z.date()).optional(),
        endDate: z.string().or(z.date()).optional(),
        color: z.string().optional(),
      }),
    }).parse(body);

    await connectDB();

    const recurringEvent = await RecurringEvent.findOne({
      _id: id,
      userId,
    });

    if (!recurringEvent) {
      return NextResponse.json(
        { error: 'Recurring event not found' },
        { status: 404 }
      );
    }

    const scopeType = scope || 'all';

    if (scopeType === 'this') {
      // Modify only this occurrence - create a modified card
      const eventDate = body.eventDate ? parseISO(body.eventDate) : new Date();
      
      // Check if card already exists
      let card = await EventCard.findOne({
        userId,
        recurringEventId: recurringEvent._id,
        date: startOfDay(eventDate),
      });

      if (!card) {
        card = await EventCard.create({
          userId,
          recurringEventId: recurringEvent._id,
          title: updates.title || recurringEvent.title,
          description: updates.description !== undefined ? updates.description : recurringEvent.description,
          date: startOfDay(eventDate),
          color: updates.color || recurringEvent.color,
        });
      } else {
        if (updates.title) card.title = updates.title;
        if (updates.description !== undefined) card.description = updates.description;
        if (updates.color) card.color = updates.color;
        await card.save();
      }

      return NextResponse.json({ card }, { status: 200 });
    } else if (scopeType === 'future') {
      // Modify this and all future - update recurring event from this date forward
      const eventDate = body.eventDate ? parseISO(body.eventDate) : new Date();
      
      // Update the recurring event
      if (updates.title) recurringEvent.title = updates.title;
      if (updates.description !== undefined) recurringEvent.description = updates.description;
      if (updates.recurrenceType) recurringEvent.recurrenceType = updates.recurrenceType;
      if (updates.recurrenceConfig) {
        recurringEvent.recurrenceConfig = {
          ...recurringEvent.recurrenceConfig,
          ...updates.recurrenceConfig,
        };
      }
      if (updates.startDate) {
        // Parse date as UTC to avoid timezone issues
        if (typeof updates.startDate === 'string' && updates.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = updates.startDate.split('-').map(Number);
          recurringEvent.startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        } else {
          const dateObj = new Date(updates.startDate);
          recurringEvent.startDate = new Date(Date.UTC(
            dateObj.getUTCFullYear(),
            dateObj.getUTCMonth(),
            dateObj.getUTCDate(),
            0, 0, 0, 0
          ));
        }
      }
      if (updates.endDate !== undefined) {
        if (updates.endDate) {
          // Parse date as UTC to avoid timezone issues
          if (typeof updates.endDate === 'string' && updates.endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = updates.endDate.split('-').map(Number);
            recurringEvent.endDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
          } else {
            const dateObj = new Date(updates.endDate);
            recurringEvent.endDate = new Date(Date.UTC(
              dateObj.getUTCFullYear(),
              dateObj.getUTCMonth(),
              dateObj.getUTCDate(),
              0, 0, 0, 0
            ));
          }
        } else {
          recurringEvent.endDate = undefined;
        }
      }
      if (updates.color) recurringEvent.color = updates.color;
      recurringEvent.updatedAt = new Date();

      await recurringEvent.save();

      // Delete any modified cards for future dates to regenerate them
      await EventCard.deleteMany({
        userId,
        recurringEventId: recurringEvent._id,
        date: { $gte: startOfDay(eventDate) },
      });

      return NextResponse.json({ recurringEvent }, { status: 200 });
    } else {
      // Modify all - update the entire recurring event
      if (updates.title) recurringEvent.title = updates.title;
      if (updates.description !== undefined) recurringEvent.description = updates.description;
      if (updates.recurrenceType) recurringEvent.recurrenceType = updates.recurrenceType;
      if (updates.recurrenceConfig) {
        recurringEvent.recurrenceConfig = {
          ...recurringEvent.recurrenceConfig,
          ...updates.recurrenceConfig,
        };
      }
      if (updates.startDate) {
        // Parse date as UTC to avoid timezone issues
        if (typeof updates.startDate === 'string' && updates.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = updates.startDate.split('-').map(Number);
          recurringEvent.startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        } else {
          const dateObj = new Date(updates.startDate);
          recurringEvent.startDate = new Date(Date.UTC(
            dateObj.getUTCFullYear(),
            dateObj.getUTCMonth(),
            dateObj.getUTCDate(),
            0, 0, 0, 0
          ));
        }
      }
      if (updates.endDate !== undefined) {
        if (updates.endDate) {
          // Parse date as UTC to avoid timezone issues
          if (typeof updates.endDate === 'string' && updates.endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = updates.endDate.split('-').map(Number);
            recurringEvent.endDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
          } else {
            const dateObj = new Date(updates.endDate);
            recurringEvent.endDate = new Date(Date.UTC(
              dateObj.getUTCFullYear(),
              dateObj.getUTCMonth(),
              dateObj.getUTCDate(),
              0, 0, 0, 0
            ));
          }
        } else {
          recurringEvent.endDate = undefined;
        }
      }
      if (updates.color) recurringEvent.color = updates.color;
      recurringEvent.updatedAt = new Date();

      await recurringEvent.save();

      // Delete all modified cards to regenerate them
      await EventCard.deleteMany({
        userId,
        recurringEventId: recurringEvent._id,
      });

      return NextResponse.json({ recurringEvent }, { status: 200 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating recurring event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete recurring event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'all';
    const eventDate = searchParams.get('eventDate');

    await connectDB();

    const recurringEvent = await RecurringEvent.findOne({
      _id: id,
      userId,
    });

    if (!recurringEvent) {
      return NextResponse.json(
        { error: 'Recurring event not found' },
        { status: 404 }
      );
    }

    if (scope === 'this' && eventDate) {
      // Delete only this occurrence - create a card to prevent generation
      // The GET endpoint already skips dates that have cards, so we just need
      // to ensure a card exists (even if empty) to prevent the recurring event
      // from generating a card for this date
      const date = startOfDay(parseISO(eventDate));
      
      // Delete any existing card for this date
      await EventCard.deleteMany({
        userId,
        recurringEventId: recurringEvent._id,
        date,
      });

      // Create a minimal card that prevents generation
      // We'll mark it with a special flag or just ensure it exists
      // The GET endpoint will see this card exists and skip generating one
      // We can use a special title or just create an empty one
      // For now, we'll create one with a deleted flag in the title
      // Actually, the simplest is to just create a card - the GET endpoint
      // already checks if a card exists and uses it instead of generating
      // But we want to prevent it from showing, so we'll create a card with
      // a special marker. Actually, let's just not create anything and modify
      // the GET to track deleted dates differently.
      
      // For now, the simplest approach: create a card that we can identify as deleted
      // We'll use a special pattern in the title or add a field
      // Since we can't easily add fields without migration, let's use a title prefix
      await EventCard.create({
        userId,
        recurringEventId: recurringEvent._id,
        title: `__DELETED__${recurringEvent.title}`, // Special marker
        description: recurringEvent.description,
        date,
        color: recurringEvent.color,
        completed: false,
      });
      
      return NextResponse.json({ message: 'Event deleted' }, { status: 200 });
    } else if (scope === 'future' && eventDate) {
      // Delete this and all future - set endDate on recurring event
      const date = startOfDay(parseISO(eventDate));
      recurringEvent.endDate = subDays(date, 1); // End the day before
      await recurringEvent.save();

      // Delete any modified cards for future dates
      await EventCard.deleteMany({
        userId,
        recurringEventId: recurringEvent._id,
        date: { $gte: date },
      });

      return NextResponse.json({ message: 'Future events deleted' }, { status: 200 });
    } else {
      // Delete all - delete the recurring event and all cards
      await RecurringEvent.deleteOne({ _id: id, userId });
      await EventCard.deleteMany({
        userId,
        recurringEventId: id,
      });

      return NextResponse.json({ message: 'Recurring event deleted' }, { status: 200 });
    }
  } catch (error) {
    console.error('Error deleting recurring event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

