import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import User, { IUser } from '../models/User';
import {
  getUserProfile,
  updateUserProfile,
  updateUserSettings,
  deleteUserAccount
} from '../services/profileService';

interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * Get user profile
 */
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await getUserProfile(req.user?._id.toString()!);

    if (!profile) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user: profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('[Server] PATCH /api/profile - updating profile');
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[Server] Validation errors:', errors.array());
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, email, phone, settings } = req.body;
    const userId = req.user?._id.toString()!;

    console.log('[Server] Updating user:', userId, { name, email, phone });

    // Use service layer
    const updatedProfile = await updateUserProfile(userId, {
      name,
      email,
      phone,
      settings,
    });

    console.log('[Server] Profile updated successfully');

    res.json({
      message: 'Profile updated successfully',
      user: updatedProfile,
    });

  } catch (error: any) {
    // Handle service layer errors
    if (error.message === 'Email already in use') {
      console.log('[Server] Email already taken');
      res.status(400).json({ message: 'Email already in use' });
      return;
    }

    if (error.message === 'User not found') {
      console.log('[Server] User not found for update');
      res.status(404).json({ message: 'User not found' });
      return;
    }

    console.error('[Server] Update profile error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
};

/**
 * Update profile picture (placeholder - to be implemented with storage strategy)
 */
export const updateProfilePicture = async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('[Server] PATCH /api/profile/picture - updating profile picture');

  // TODO: Implement based on chosen storage strategy
  res.status(501).json({
    message: 'Profile picture upload not implemented yet',
    note: 'Choose a storage strategy: S3, base64, or local storage'
  });
};

/**
 * Update user settings
 */
export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('[Server] PATCH /api/profile/settings - updating settings');
  try {
    const { shareLocation, shareWithEveryone, notificationsEnabled } = req.body;
    const userId = req.user?._id.toString()!;

    console.log('[Server] Updating settings for user:', userId, { shareLocation, shareWithEveryone, notificationsEnabled });

    // Use service layer
    const updatedSettings = await updateUserSettings(userId, {
      shareLocation,
      shareWithEveryone,
      notificationsEnabled,
    });

    console.log('[Server] Settings updated successfully');

    res.json({
      message: 'Settings updated successfully',
      user: {
        id: userId,
        settings: updatedSettings,
      },
    });

  } catch (error: any) {
    if (error.message === 'User not found') {
      console.log('[Server] User not found for settings update');
      res.status(404).json({ message: 'User not found' });
      return;
    }

    console.error('[Server] Update settings error:', error);
    res.status(500).json({ message: 'Server error during settings update' });
  }
};

/**
 * Delete user account (soft delete)
 */
export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('[Server] DELETE /api/profile - deleting account');
  try {
    const userId = req.user?._id.toString()!;

    // Use service layer
    await deleteUserAccount(userId);

    console.log('[Server] Account deleted successfully (soft delete)');

    res.json({
      message: 'Account deleted successfully',
      note: 'Your account has been deactivated. All personal data has been anonymized.',
    });

  } catch (error: any) {
    if (error.message === 'User not found') {
      console.log('[Server] User not found for deletion');
      res.status(404).json({ message: 'User not found' });
      return;
    }

    console.error('[Server] Delete account error:', error);
    res.status(500).json({ message: 'Server error during account deletion' });
  }
};
