import mongoose, { Schema, Document } from 'mongoose';

export type DeviceType = 'bluetooth' | 'other';

export interface IDevice extends Document {
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  deviceType: DeviceType;
  name: string;
  isConnected: boolean;
  batteryLevel?: number;
  lastConnectedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    deviceType: {
      type: String,
      enum: ['bluetooth', 'other'],
      default: 'bluetooth',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    isConnected: {
      type: Boolean,
      default: false,
      index: true,
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
    },
    lastConnectedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one deviceId per user (allows same deviceId for different users)
deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
// Indexes for efficient queries
deviceSchema.index({ userId: 1, isConnected: 1 });
deviceSchema.index({ userId: 1, deviceType: 1 });

export default mongoose.model<IDevice>('Device', deviceSchema);

