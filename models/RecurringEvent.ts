import mongoose, { Schema, Document, Model } from 'mongoose';

export type RecurrenceType = 'daily' | 'everyXDays' | 'daysOfWeek';

export interface IRecurringEvent extends Document {
  userId: mongoose.Types.ObjectId;
  plannerId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  recurrenceType: RecurrenceType;
  recurrenceConfig: {
    // For 'everyXDays'
    interval?: number;
    // For 'daysOfWeek' - array of 0-6 (Sunday-Saturday)
    days?: number[];
  };
  startDate: Date;
  endDate?: Date;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringEventSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  recurrenceType: {
    type: String,
    enum: ['daily', 'everyXDays', 'daysOfWeek'],
    required: true,
  },
  recurrenceConfig: {
    interval: {
      type: Number,
      min: 1,
    },
    days: {
      type: [Number],
      validate: {
        validator: function (days: number[]) {
          return days.every(day => day >= 0 && day <= 6);
        },
        message: 'Days must be between 0 (Sunday) and 6 (Saturday)',
      },
    },
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  color: {
    type: String,
    default: '#3b82f6', // Default blue
  },
  plannerId: {
    type: Schema.Types.ObjectId,
    ref: 'Planner',
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

RecurringEventSchema.index({ userId: 1, startDate: 1 });

const RecurringEvent: Model<IRecurringEvent> = mongoose.models.RecurringEvent || mongoose.model<IRecurringEvent>('RecurringEvent', RecurringEventSchema);

export default RecurringEvent;

