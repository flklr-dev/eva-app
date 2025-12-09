import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import Admin, { IAdmin } from '../models/Admin';

interface AuthRequest extends Request {
  admin?: IAdmin;
}

// Generate JWT Token for Admin
const generateAdminToken = (adminId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { adminId, isAdmin: true }, 
    secret, 
    { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
  );
};

// Admin Login
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  console.log('[Server] POST /api/admin/auth/login');
  console.log('[Server] Request body:', JSON.stringify({ email: req.body.email, password: '***' }));
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[Server] Validation errors:', errors.array());
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    // Validate email and password are provided
    if (!email || !password) {
      console.log('[Server] Missing email or password');
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // Find admin by email (case-insensitive)
    console.log('[Server] Finding admin by email:', email.toLowerCase());
    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    console.log('[Server] Admin lookup result:', admin ? 'Found' : 'Not Found');

    // Check if admin exists (important for security)
    if (!admin) {
      console.log('[Server] Admin not found');
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    console.log('[Server] Admin found:', admin._id);
    console.log('[Server] Admin mustChangePassword status:', admin.mustChangePassword);
    console.log('[Server] Admin data:', JSON.stringify(admin.toObject()));

    // Verify password is not empty before comparison
    if (!admin.password) {
      console.error('[Server] Admin password field is empty for email:', email);
      res.status(500).json({ message: 'Server error during authentication' });
      return;
    }

    // Compare provided password with stored hashed password
    console.log('[Server] Comparing passwords...');
    const isPasswordCorrect = await admin.comparePassword(password);
    if (!isPasswordCorrect) {
      console.log('[Server] Password incorrect');
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    console.log('[Server] Password correct');

    // Check if admin needs to change password on first login
    if (admin.mustChangePassword) {
      console.log('[Server] Admin needs to change password on first login');
    }

    // Generate token only for authenticated admin
    const token = generateAdminToken(admin._id.toString());
    console.log('[Server] Token generated');

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        mustChangePassword: admin.mustChangePassword,
      },
    });
    console.log('[Server] Login response sent');
  } catch (error) {
    console.error('[Server] Admin login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Change Admin Password
export const changeAdminPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Check if admin is attached to request
    if (!req.admin) {
      res.status(401).json({ message: 'Admin not authenticated' });
      return;
    }
    
    const admin = req.admin;

    // Validate input
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current password and new password are required' });
      return;
    }

    // Verify current password
    const isPasswordCorrect = await admin.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      res.status(401).json({ message: 'Current password is incorrect' });
      return;
    }

    // Check if new password is different from current password
    const isNewPasswordSame = await admin.comparePassword(newPassword);
    if (isNewPasswordSame) {
      res.status(400).json({ message: 'New password must be different from current password' });
      return;
    }

    // Update password and mustChangePassword flag
    admin.password = newPassword;
    admin.mustChangePassword = false;
    console.log('[Server] Saving admin with new password and mustChangePassword=false');
    await admin.save();
    
    console.log('[Server] Password changed successfully. mustChangePassword set to:', admin.mustChangePassword);
    console.log('[Server] Admin after save:', JSON.stringify(admin.toObject()));

    // Generate new token
    const token = generateAdminToken(admin._id.toString());

    res.status(200).json({
      message: 'Password changed successfully',
      token,
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        mustChangePassword: admin.mustChangePassword,
      },
    });
  } catch (error: any) {
    console.error('Change admin password error:', error);
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
};

// Get Current Admin
export const getCurrentAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('[Server] GET /api/admin/auth/me');
  try {
    const admin = req.admin;
    if (!admin) {
      res.status(401).json({ message: 'Admin not authenticated' });
      return;
    }

    console.log('[Server] Current admin mustChangePassword status:', admin.mustChangePassword);
    console.log('[Server] Current admin data:', JSON.stringify(admin.toObject()));

    res.status(200).json({
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        mustChangePassword: admin.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('[Server] Get current admin error:', error);
    res.status(500).json({ message: 'Server error fetching admin' });
  }
};