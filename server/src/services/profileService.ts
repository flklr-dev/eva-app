import { Types } from 'mongoose';
import User, { IUser } from '../models/User';

export interface ProfileUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  settings?: {
    shareLocation?: boolean;
    shareWithEveryone?: boolean;
    notificationsEnabled?: boolean;
  };
  homeAddress?: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    details?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
}

export interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  phone?: string;
  countryCode?: string;
  settings: {
    shareLocation: boolean;
    shareWithEveryone: boolean;
    notificationsEnabled: boolean;
  };
  homeAddress?: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    details?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
  isActive: boolean;
  lastSeen: Date;
  createdAt: Date;
}

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<ProfileResponse | null> => {
  const user = await User.findById(userId).select('-password');

  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    profilePicture: user.profilePicture,
    phone: user.phone,
    countryCode: user.countryCode,
    settings: user.settings,
    homeAddress: user.homeAddress,
    isActive: user.isActive,
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
  };
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updateData: ProfileUpdateData
): Promise<ProfileResponse> => {
  // Check if email is being changed and if it's already taken
  if (updateData.email) {
    const existingUser = await User.findOne({
      email: updateData.email.toLowerCase(),
      _id: { $ne: userId } // Exclude current user
    });
    if (existingUser) {
      throw new Error('Email already in use');
    }
  }

  // Build update object
  const updateObj: any = {};

  if (updateData.name !== undefined) updateObj.name = updateData.name.trim();
  if (updateData.email !== undefined) updateObj.email = updateData.email.toLowerCase();
  if (updateData.phone !== undefined) updateObj.phone = updateData.phone ? updateData.phone.trim() : undefined;
  if (updateData.countryCode !== undefined) updateObj.countryCode = updateData.countryCode ? updateData.countryCode.trim() : undefined;

  // Handle settings update - only update defined properties
  if (updateData.settings !== undefined) {
    if (updateData.settings.shareLocation !== undefined) {
      updateObj['settings.shareLocation'] = updateData.settings.shareLocation;
    }
    if (updateData.settings.shareWithEveryone !== undefined) {
      updateObj['settings.shareWithEveryone'] = updateData.settings.shareWithEveryone;
    }
    if (updateData.settings.notificationsEnabled !== undefined) {
      updateObj['settings.notificationsEnabled'] = updateData.settings.notificationsEnabled;
    }
  }

  // Handle home address update
  if (updateData.homeAddress !== undefined) {
    if (updateData.homeAddress === null) {
      // If null is passed, remove the home address
      updateObj.homeAddress = undefined;
    } else {
      updateObj.homeAddress = updateData.homeAddress;
    }
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updateObj,
    {
      new: true,
      runValidators: true,
      select: '-password'
    }
  );

  if (!updatedUser) {
    throw new Error('User not found');
  }

  return {
    id: updatedUser._id.toString(),
    name: updatedUser.name,
    email: updatedUser.email,
    profilePicture: updatedUser.profilePicture,
    phone: updatedUser.phone,
    countryCode: updatedUser.countryCode,
    settings: updatedUser.settings,
    homeAddress: updatedUser.homeAddress,
    isActive: updatedUser.isActive,
    lastSeen: updatedUser.lastSeen,
    createdAt: updatedUser.createdAt,
  };
};

/**
 * Update user settings
 */
export const updateUserSettings = async (
  userId: string,
  settings: {
    shareLocation?: boolean;
    shareWithEveryone?: boolean;
    notificationsEnabled?: boolean;
  }
): Promise<{ shareLocation: boolean; shareWithEveryone: boolean; notificationsEnabled: boolean }> => {
  // Build settings update
  const settingsUpdate: any = {};
  if (settings.shareLocation !== undefined) settingsUpdate['settings.shareLocation'] = settings.shareLocation;
  if (settings.shareWithEveryone !== undefined) settingsUpdate['settings.shareWithEveryone'] = settings.shareWithEveryone;
  if (settings.notificationsEnabled !== undefined) settingsUpdate['settings.notificationsEnabled'] = settings.notificationsEnabled;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    settingsUpdate,
    {
      new: true,
      select: 'settings'
    }
  );

  if (!updatedUser) {
    throw new Error('User not found');
  }

  return updatedUser.settings;
};

/**
 * Delete user account (soft delete)
 */
export const deleteUserAccount = async (userId: string): Promise<void> => {
  // Soft delete - mark as inactive and anonymize
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      isActive: false,
      name: 'Deleted User',
      email: `deleted_${Date.now()}@deleted.local`,
      phone: undefined,
      profilePicture: undefined,
      homeAddress: undefined,
      settings: {
        shareLocation: false,
        shareWithEveryone: false,
        notificationsEnabled: false,
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    throw new Error('User not found');
  }
};

/**
 * Validate profile update data
 */
export const validateProfileUpdate = (data: ProfileUpdateData): string[] => {
  const errors: string[] = [];

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }
  }

  if (data.email !== undefined) {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (typeof data.email !== 'string' || !emailRegex.test(data.email)) {
      errors.push('Please provide a valid email');
    }
  }

  if (data.phone !== undefined && data.phone !== null) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (typeof data.phone !== 'string' || !phoneRegex.test(data.phone)) {
      errors.push('Please provide a valid phone number');
    }
  }

  return errors;
};
