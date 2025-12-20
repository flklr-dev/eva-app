import mongoose, { Schema, Document } from 'mongoose';

export interface ISOSAlert extends Document {
  userId: mongoose.Types.ObjectId;
  coordinates: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat] for GeoJSON
  };
  status: 'active' | 'resolved' | 'cancelled';
  recipients: mongoose.Types.ObjectId[];
  sentAt: Date;
  resolvedAt?: Date;
  cancelledAt?: Date;
  message?: string;
}

const sosAlertSchema = new Schema<ISOSAlert>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (value: number[]) {
            return (
              Array.isArray(value) &&
              value.length === 2 &&
              typeof value[0] === 'number' &&
              typeof value[1] === 'number' &&
              value[0] >= -180 &&
              value[0] <= 180 && // longitude
              value[1] >= -90 &&
              value[1] <= 90 // latitude
            );
          },
          message: 'Coordinates must be [longitude, latitude] with valid ranges',
        },
      },
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'cancelled'],
      default: 'active',
      required: true,
      index: true,
    },
    recipients: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    sentAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
sosAlertSchema.index({ userId: 1, status: 1, sentAt: -1 });
sosAlertSchema.index({ recipients: 1, status: 1, sentAt: -1 });
sosAlertSchema.index({ status: 1, sentAt: -1 });
sosAlertSchema.index({ coordinates: '2dsphere' });

// TTL index to auto-expire active alerts after 24 hours (86400 seconds)
// Note: This only works for active alerts, so we'll need a separate cleanup job
sosAlertSchema.index(
  { sentAt: 1 },
  {
    expireAfterSeconds: 86400,
    partialFilterExpression: { status: 'active' },
  }
);

export default mongoose.model<ISOSAlert>('SOSAlert', sosAlertSchema);

