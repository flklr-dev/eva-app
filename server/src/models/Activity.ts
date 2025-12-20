import mongoose, { Schema, Document } from 'mongoose';

export type ActivityType =
  | 'location_update'
  | 'message'
  | 'sos'
  | 'status_change'
  | 'home_arrival';

export interface IActivity extends Document {
  userId: mongoose.Types.ObjectId;
  type: ActivityType;
  message: string;
  location?: {
    name: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  metadata?: Record<string, any>;
  timestamp: Date;
  visibleTo: mongoose.Types.ObjectId[];
}

const activitySchema = new Schema<IActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['location_update', 'message', 'sos', 'status_change', 'home_arrival'],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    location: {
      name: {
        type: String,
        trim: true,
      },
      coordinates: {
        lat: {
          type: Number,
          required: function (this: IActivity) {
            return this.location?.name !== undefined;
          },
        },
        lng: {
          type: Number,
          required: function (this: IActivity) {
            return this.location?.name !== undefined;
          },
        },
      },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    visibleTo: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
activitySchema.index({ userId: 1, timestamp: -1 });
activitySchema.index({ visibleTo: 1, timestamp: -1 });
activitySchema.index({ type: 1, timestamp: -1 });
activitySchema.index({ userId: 1, type: 1, timestamp: -1 });

// TTL index to automatically delete activities older than 90 days
activitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days in seconds

export default mongoose.model<IActivity>('Activity', activitySchema);

