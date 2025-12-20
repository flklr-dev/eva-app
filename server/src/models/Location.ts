import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation extends Document {
  userId: mongoose.Types.ObjectId;
  coordinates: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat] for GeoJSON
  };
  accuracy?: number;
  timestamp: Date;
  sharedWith: mongoose.Types.ObjectId[];
  isHome: boolean;
}

const locationSchema = new Schema<ILocation>(
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
    accuracy: {
      type: Number,
      min: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    sharedWith: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isHome: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for geospatial queries
locationSchema.index({ coordinates: '2dsphere' });
// Compound indexes for efficient queries
locationSchema.index({ userId: 1, timestamp: -1 });
locationSchema.index({ userId: 1, isHome: 1 });
locationSchema.index({ sharedWith: 1, timestamp: -1 });

// TTL index to automatically delete locations older than 30 days
locationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days in seconds

export default mongoose.model<ILocation>('Location', locationSchema);

