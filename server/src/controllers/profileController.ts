import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import multer from 'multer';
import User, { IUser } from '../models/User';
import { cloudinary } from '../config/cloudinary';
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

    const { name, email, phone, countryCode, settings } = req.body;
    const userId = req.user?._id.toString()!;

    console.log('[Server] Updating user:', userId, { name, email, phone, countryCode });

    // Use service layer
    const updatedProfile = await updateUserProfile(userId, {
      name,
      email,
      phone,
      countryCode,
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
// Configure multer for memory storage (required for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export const updateProfilePicture = [
  upload.single('image'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    console.log('[Server] PATCH /api/profile/picture - updating profile picture');

    try {
      const userId = req.user?._id.toString()!;
      const file = req.file;

      console.log('[Server] User ID:', userId);
      console.log('[Server] File received:', file ? {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer ? `${file.buffer.length} bytes` : 'no buffer'
      } : 'no file');

      if (!file) {
        console.log('[Server] No file provided in request');
        res.status(400).json({ message: 'No image file provided' });
        return;
      }

      // Check Cloudinary configuration before upload
      console.log('[Server] Checking Cloudinary config...');
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error('[Server] Cloudinary environment variables missing');
        res.status(500).json({ message: 'Server configuration error', error: 'Cloudinary not configured' });
        return;
      }

      // Test Cloudinary connection
      try {
        console.log('[Server] Testing Cloudinary connection...');
        await cloudinary.api.ping();
        console.log('[Server] Cloudinary connection test successful');
      } catch (pingError) {
        console.error('[Server] Cloudinary connection test failed:', pingError);
        res.status(500).json({
          message: 'Cloudinary service unavailable',
          error: 'Cannot connect to Cloudinary API'
        });
        return;
      }

      console.log('[Server] Starting Cloudinary upload...');

      // Upload to Cloudinary with timeout handling
      const uploadOptions = {
        folder: 'eva-app/profiles',
        public_id: `user_${userId}_${Date.now()}`,
        transformation: [
          { width: 300, height: 300, crop: 'fill' },
          { quality: 'auto' }
        ],
        timeout: 120000, // 2 minute timeout for slow connections
      };

      console.log('[Server] Upload options:', uploadOptions);

      try {
        // Use upload_stream for better performance with buffers
        const uploadResult = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) {
                console.error('[Server] Cloudinary upload_stream error:', error);
                reject(error);
              } else {
                console.log('[Server] Cloudinary upload success:', result?.public_id);
                resolve(result);
              }
            }
          );

          // Set a timeout for the upload stream
          const timeout = setTimeout(() => {
            uploadStream.destroy();
            reject(new Error('Upload timeout'));
          }, 120000); // 2 minutes

          uploadStream.on('finish', () => clearTimeout(timeout));
          uploadStream.on('error', () => clearTimeout(timeout));

          uploadStream.end(file.buffer);
        });

        // Update user profile with Cloudinary URL
        await User.findByIdAndUpdate(userId, {
          profilePicture: uploadResult.secure_url
        });

        console.log('[Server] Profile picture updated successfully for user:', userId);

        res.json({
          message: 'Profile picture updated successfully',
          profilePicture: uploadResult.secure_url
        });

      } catch (uploadError) {
        console.error('Profile picture upload error:', uploadError);
        res.status(500).json({
          message: 'Failed to upload profile picture',
          error: uploadError instanceof Error ? uploadError.message : 'Unknown error'
        });
      }

    } catch (mainError) {
      console.error('Main profile picture processing error:', mainError);
      res.status(500).json({
        message: 'Server error during profile picture processing',
        error: mainError instanceof Error ? mainError.message : 'Unknown error'
      });
    }
  }
];

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

/**
 * Update user's current location
 */
export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    const userId = req.user?._id.toString()!;

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({ message: 'Valid latitude and longitude are required' });
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      res.status(400).json({ message: 'Invalid coordinate values' });
      return;
    }

    // Update user's lastKnownLocation
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        lastKnownLocation: {
          coordinates: {
            lat: latitude,
            lng: longitude,
          },
          timestamp: new Date(),
          accuracy: accuracy || undefined,
        },
        isActive: true,
        lastSeen: new Date(),
      },
      { new: true, select: 'lastKnownLocation isActive lastSeen' }
    );

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    console.log('[Server] Location updated for user:', userId);

    res.json({
      message: 'Location updated successfully',
      location: updatedUser.lastKnownLocation,
    });

  } catch (error: any) {
    console.error('[Server] Update location error:', error);
    res.status(500).json({ message: 'Server error during location update' });
  }
};
