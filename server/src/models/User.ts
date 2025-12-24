import mongoose, { Schema, Document } from 'mongoose';
import bcryptjs from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  countryCode?: string;
  profilePicture?: string;
  homeAddress?: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  settings: {
    shareLocation: boolean;
    shareWithEveryone: boolean;
    notificationsEnabled: boolean;
  };
  lastKnownLocation?: {
    coordinates: {
      lat: number;
      lng: number;
    };
    timestamp: Date;
    accuracy?: number;
  };
  isActive: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
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
      minlength: 6,
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      trim: true,
      sparse: true, // Allows multiple documents to have null/undefined values
    },
    countryCode: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String,
      trim: true,
    },
    homeAddress: {
      address: {
        type: String,
        trim: true,
      },
      coordinates: {
        lat: {
          type: Number,
          required: function(this: IUser) {
            return this.homeAddress?.address !== undefined;
          },
        },
        lng: {
          type: Number,
          required: function(this: IUser) {
            return this.homeAddress?.address !== undefined;
          },
        },
      },
    },
    settings: {
      shareLocation: {
        type: Boolean,
        default: false,
      },
      shareWithEveryone: {
        type: Boolean,
        default: false,
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
    },
    lastKnownLocation: {
      coordinates: {
        lat: Number,
        lng: Number,
      },
      timestamp: Date,
      accuracy: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (email already has unique index from unique: true)
userSchema.index({ isActive: 1 });
userSchema.index({ lastSeen: -1 });

// Hash password before saving
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as any);
  }
});

// Update lastSeen on save if not explicitly set
userSchema.pre<IUser>('save', function (next) {
  if (!this.isModified('lastSeen') && this.isNew) {
    this.lastSeen = new Date();
  }
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcryptjs.compare(enteredPassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);
