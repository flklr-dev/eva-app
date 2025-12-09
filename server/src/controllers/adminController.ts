import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import Admin, { IAdmin } from '../models/Admin';

interface AdminAuthRequest extends Request {
  admin?: IAdmin;
}

// Generate JWT Token
const generateAdminToken = (adminId: string): string => {
  const secret = (process.env.JWT_SECRET || 'your_secret_key_change_this') as string;
  return jwt.sign({ adminId, isAdmin: true }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  } as any);
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

    // Find admin by email and explicitly select password field
    console.log('[Server] Finding admin by email:', email);
    const admin = await Admin.findOne({ email }).select('+password');
    
    // Check if admin exists
    if (!admin) {
      console.log('[Server] Admin not found');
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    console.log('[Server] Admin found:', admin._id);

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

    // Check if admin needs to change password
    const mustChangePassword = admin.mustChangePassword;

    // Generate token only for authenticated admin
    const token = generateAdminToken(admin._id.toString());
    console.log('[Server] Token generated');

    res.status(200).json({
      message: 'Login successful',
      token,
      mustChangePassword,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
    });
    console.log('[Server] Login response sent');
  } catch (error) {
    console.error('[Server] Admin login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Change Admin Password
export const changeAdminPassword = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin?._id;

    if (!adminId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current password and new password are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ message: 'New password must be at least 8 characters' });
      return;
    }

    // Find admin and select password
    const admin = await Admin.findById(adminId).select('+password');
    if (!admin) {
      res.status(404).json({ message: 'Admin not found' });
      return;
    }

    // Verify current password
    const isCurrentPasswordCorrect = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordCorrect) {
      res.status(401).json({ message: 'Current password is incorrect' });
      return;
    }

    // Check if new password is different from current password
    const isNewPasswordDifferent = !(await admin.comparePassword(newPassword));
    if (!isNewPasswordDifferent) {
      res.status(400).json({ message: 'New password must be different from current password' });
      return;
    }

    // Update password
    admin.password = newPassword;
    admin.mustChangePassword = false;
    admin.lastPasswordChange = new Date();
    await admin.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('[Server] Change admin password error:', error);
    res.status(500).json({ message: 'Server error during password change' });
  }
};

// Get Current Admin
export const getCurrentAdmin = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin) {
      res.status(404).json({ message: 'Admin not found' });
      return;
    }

    res.json({
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        mustChangePassword: admin.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('Get current admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};