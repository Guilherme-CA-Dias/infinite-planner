import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompletedRecurringEvent extends Document {
  userId: mongoose.Types.ObjectId;
  recurringEventId: mongoose.Types.ObjectId;
  completedDates: Date[]; // Array of dates when the event was completed
  createdAt: Date;
  updatedAt: Date;
}

const CompletedRecurringEventSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  recurringEventId: {
    type: Schema.Types.ObjectId,
    ref: 'RecurringEvent',
    required: true,
    index: true,
  },
  completedDates: {
    type: [Date],
    default: [],
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

// Index for efficient lookups
CompletedRecurringEventSchema.index({ userId: 1, recurringEventId: 1 });
CompletedRecurringEventSchema.index({ userId: 1, recurringEventId: 1, completedDates: 1 });

const CompletedRecurringEvent: Model<ICompletedRecurringEvent> = 
  mongoose.models.CompletedRecurringEvent || 
  mongoose.model<ICompletedRecurringEvent>('CompletedRecurringEvent', CompletedRecurringEventSchema);

export default CompletedRecurringEvent;

