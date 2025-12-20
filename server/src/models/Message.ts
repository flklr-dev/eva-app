import mongoose, { Schema, Document } from 'mongoose';

export type MessageType = 'status' | 'message';

export interface IMessage extends Document {
  userId: mongoose.Types.ObjectId;
  type: MessageType;
  content: string;
  recipients: mongoose.Types.ObjectId[];
  readBy: mongoose.Types.ObjectId[];
  sentAt: Date;
  metadata?: Record<string, any>;
}

const messageSchema = new Schema<IMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['status', 'message'],
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    recipients: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    readBy: [
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
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
messageSchema.index({ userId: 1, sentAt: -1 });
messageSchema.index({ recipients: 1, sentAt: -1 });
messageSchema.index({ recipients: 1, readBy: 1, sentAt: -1 });
messageSchema.index({ type: 1, sentAt: -1 });

export default mongoose.model<IMessage>('Message', messageSchema);

