import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RecurringEvent from '@/models/RecurringEvent';
import { z } from 'zod';

const recurringEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  recurrenceType: z.enum(['daily', 'everyXDays', 'daysOfWeek']),
  recurrenceConfig: z.object({
    interval: z.number().min(1).optional(),
    days: z.array(z.number().min(0).max(6)).optional(),
  }),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional(),
  color: z.string().optional(),
});

// GET - Fetch all recurring events for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const events = await RecurringEvent.find({ userId }).sort({ createdAt: -1 });

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error('Error fetching recurring events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new recurring event and generate cards
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
    const data = recurringEventSchema.parse(body);

    await connectDB();

    // Parse dates as UTC to avoid timezone issues
    // data.startDate and data.endDate are date strings in format yyyy-MM-dd
    let startDateUTC: Date;
    let endDateUTC: Date | undefined;
    
    if (typeof data.startDate === 'string' && data.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = data.startDate.split('-').map(Number);
      startDateUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    } else {
      const dateObj = new Date(data.startDate);
      startDateUTC = new Date(Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        dateObj.getUTCDate(),
        0, 0, 0, 0
      ));
    }
    
    if (data.endDate) {
      if (typeof data.endDate === 'string' && data.endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = data.endDate.split('-').map(Number);
        endDateUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      } else {
        const dateObj = new Date(data.endDate);
        endDateUTC = new Date(Date.UTC(
          dateObj.getUTCFullYear(),
          dateObj.getUTCMonth(),
          dateObj.getUTCDate(),
          0, 0, 0, 0
        ));
      }
    }

    // Create recurring event (no cards are created - they're generated on-the-fly)
    const recurringEvent = await RecurringEvent.create({
      userId,
      ...data,
      startDate: startDateUTC,
      endDate: endDateUTC,
    });

    return NextResponse.json(
      { recurringEvent, message: 'Recurring event created. Cards will be generated dynamically.' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('Error creating recurring event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

