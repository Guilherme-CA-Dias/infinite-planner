import mongoose, { Schema, Document, Model } from 'mongoose';

const ORDER_MIN = 10000;
const ORDER_MAX = 100000;
const randomOrder = () =>
  Math.floor(ORDER_MIN + Math.random() * (ORDER_MAX - ORDER_MIN + 1));

export interface IEventCard extends Document {
  userId: mongoose.Types.ObjectId;
  recurringEventId?: mongoose.Types.ObjectId;
  plannerId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  date: Date;
  completed: boolean;
  completedAt?: Date;
  color?: string;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

const EventCardSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  recurringEventId: {
    type: Schema.Types.ObjectId,
    ref: 'RecurringEvent',
    index: true,
  },
  plannerId: {
    type: Schema.Types.ObjectId,
    ref: 'Planner',
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
  date: {
    type: Date,
    required: true,
    index: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
  },
  color: {
    type: String,
    default: '#3b82f6',
  },
  order: {
    type: Number,
    default: randomOrder,
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

EventCardSchema.index({ userId: 1, date: 1 });
// Unique index only for recurring events (sparse means it only applies when recurringEventId is not null)
EventCardSchema.index({ userId: 1, recurringEventId: 1, date: 1 }, { unique: true, sparse: true });

const EventCard: Model<IEventCard> = mongoose.models.EventCard || mongoose.model<IEventCard>('EventCard', EventCardSchema);

export default EventCard;

