import mongoose, { Schema, Document } from 'mongoose';

export interface IFriend extends Document {
  requesterId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

const friendSchema = new Schema<IFriend>(
  {
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'blocked'],
      default: 'pending',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
friendSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });
friendSchema.index({ requesterId: 1, status: 1 });
friendSchema.index({ recipientId: 1, status: 1 });

// Prevent duplicate friend requests (same pair)
friendSchema.pre('save', async function (next) {
  const existingFriend = await mongoose.model('Friend').findOne({
    $or: [
      { requesterId: this.requesterId, recipientId: this.recipientId },
      { requesterId: this.recipientId, recipientId: this.requesterId },
    ],
  });

  if (existingFriend && existingFriend._id.toString() !== this._id.toString()) {
    const error = new Error('Friend request already exists between these users');
    return next(error as any);
  }

  // Prevent self-friending
  if (this.requesterId.toString() === this.recipientId.toString()) {
    const error = new Error('Cannot send friend request to yourself');
    return next(error as any);
  }

  next();
});

export default mongoose.model<IFriend>('Friend', friendSchema);

