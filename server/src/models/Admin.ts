import mongoose, { Schema, Document } from 'mongoose';
import bcryptjs from 'bcryptjs';

export interface IAdmin extends Document {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
  lastPasswordChange: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const adminSchema = new Schema<IAdmin>(
  {
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false, // Don't return password by default
    },
    firstName: {
      type: String,
      required: [true, 'Please provide a first name'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Please provide a last name'],
      trim: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: true, // Admin must change password on first login
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
adminSchema.pre<IAdmin>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcryptjs.genSalt(12);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as any);
  }
});

// Method to compare passwords
adminSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcryptjs.compare(enteredPassword, this.password);
};

export default mongoose.model<IAdmin>('Admin', adminSchema);