import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  pushToken: string;
  deviceType: 'ios' | 'android';
  isActive: boolean;
  subscribedAt: Date;
  unsubscribedAt?: Date;
}

const NotificationSubscriptionSchema = new Schema<INotificationSubscription>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  pushToken: {
    type: String,
    required: true,
    unique: true,
    sparse: true, // Allow multiple null values but unique non-null values
  },
  deviceType: {
    type: String,
    enum: ['ios', 'android'],
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  unsubscribedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for faster queries (pushToken already has unique index from unique: true)
NotificationSubscriptionSchema.index({ userId: 1, isActive: 1 });

export const NotificationSubscription = mongoose.model<INotificationSubscription>(
  'NotificationSubscription',
  NotificationSubscriptionSchema
);
