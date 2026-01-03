import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User, { IUser } from '../models/User';
import { JWT_SECRET } from '../config/jwt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

interface AuthRequest extends Request {
  user?: IUser;
}

// Generate JWT Token
const generateToken = (userId: string): string => {
  console.log('[Server] Generating token with secret length:', JWT_SECRET.length);
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  } as jwt.SignOptions);
};

// Register User
export const register = async (req: Request, res: Response): Promise<void> => {
  console.log('[Server] POST /api/auth/register');
  console.log('[Server] Request body:', JSON.stringify(req.body));
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[Server] Validation errors:', errors.array());
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, email, password } = req.body;

    // Validate all required fields are present
    if (!name || !email || !password) {
      console.log('[Server] Missing required fields');
      res.status(400).json({ message: 'Name, email, and password are required' });
      return;
    }

    // Check if user already exists with case-insensitive search
    console.log('[Server] Checking if user exists:', email.toLowerCase());
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('[Server] User already exists');
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Create new user with normalized email
    console.log('[Server] Creating new user...');
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
    });

    // Save user - password will be hashed by pre-save hook
    await user.save();
    console.log('[Server] User saved successfully:', user._id);

    // Generate JWT token
    const token = generateToken(user._id.toString());
    console.log('[Server] Token generated');

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
    console.log('[Server] Registration response sent');
  } catch (error: any) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      console.log('[Server] Duplicate key error');
      res.status(400).json({ message: 'Email already registered' });
      return;
    }
    
    console.error('[Server] Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login User
export const login = async (req: Request, res: Response): Promise<void> => {
  console.log('[Server] POST /api/auth/login');
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

    // Find user by email and explicitly select password field
    console.log('[Server] Finding user by email:', email);
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists (important for security)
    if (!user) {
      console.log('[Server] User not found');
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    console.log('[Server] User found:', user._id);

    // Verify password is not empty before comparison
    if (!user.password) {
      console.error('[Server] User password field is empty for email:', email);
      res.status(500).json({ message: 'Server error during authentication' });
      return;
    }

    // Compare provided password with stored hashed password
    console.log('[Server] Comparing passwords...');
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      console.log('[Server] Password incorrect');
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    console.log('[Server] Password correct');

    // Generate token only for authenticated user
    const token = generateToken(user._id.toString());
    console.log('[Server] Token generated');

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
    console.log('[Server] Login response sent');
  } catch (error) {
    console.error('[Server] Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Get Current User
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot Password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  console.log('[Server] POST /api/auth/forgot-password');
  console.log('[Server] Request body:', JSON.stringify(req.body));
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[Server] Validation errors:', errors.array());
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email } = req.body;

    // Find user by email and explicitly select password reset fields
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetToken +passwordResetExpires');
    if (!user) {
      console.log('[Server] User not found for email:', email);
      res.status(400).json({ message: 'No account found with this email address. Please check your email and try again.' });
      return;
    }

    // Generate OTP (6-digit code)
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Set OTP expiration (10 minutes)
    const otpExpiration = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash the OTP before storing
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    
    // Update user with OTP and expiration
    user.passwordResetToken = otpHash;
    user.passwordResetExpires = otpExpiration;
    await user.save();
    
    console.log('[Server] Generated OTP for user:', user._id, 'OTP (hashed):', otpHash);

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'EVA Alert - Password Reset',
      text: `You requested to reset your password for EVA Alert.

Your OTP code is: ${otp}

This code will expire in 10 minutes.

If you did not request this, please ignore this email.`,
      html: `
        <h2>EVA Alert - Password Reset</h2>
        <p>You requested to reset your password for EVA Alert.</p>
        <p><strong>Your OTP code is:</strong> ${otp}</p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log('[Server] Password reset email sent to:', email);

    res.status(200).json({ message: 'If an account with this email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('[Server] Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
};

// Verify OTP
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  console.log('[Server] POST /api/auth/verify-otp');
  console.log('[Server] Request body:', JSON.stringify({ email: req.body.email, otp: '***' }));
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[Server] Validation errors:', errors.array());
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, otp } = req.body;

    // Find user by email and explicitly select password reset fields
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetToken +passwordResetExpires');
    if (!user) {
      console.log('[Server] User not found for email:', email);
      res.status(400).json({ message: 'Invalid email address' });
      return;
    }

    // Check if OTP exists
    if (!user.passwordResetToken) {
      console.log('[Server] No OTP token found for user:', user._id);
      res.status(400).json({ message: 'No OTP found. Please request a new one.' });
      return;
    }
    
    // Check if OTP expiration exists
    if (!user.passwordResetExpires) {
      console.log('[Server] No OTP expiration found for user:', user._id);
      res.status(400).json({ message: 'Invalid OTP. Please request a new one.' });
      return;
    }
    
    // Add detailed logging for debugging
    console.log('[Server] Checking OTP expiration for user:', user._id);
    console.log('[Server] Current time:', new Date());
    console.log('[Server] OTP expiration time:', user.passwordResetExpires);
    console.log('[Server] Time difference (ms):', user.passwordResetExpires.getTime() - new Date().getTime());
    
    const now = new Date();
    if (user.passwordResetExpires < now) {
      console.log('[Server] No valid OTP found or OTP expired for user:', user._id);
      console.log('[Server] Current time:', now, 'OTP expires at:', user.passwordResetExpires);
      res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      return;
    }

    // Hash the provided OTP and compare with stored hash
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    
    if (user.passwordResetToken !== otpHash) {
      console.log('[Server] Invalid OTP for user:', user._id);
      res.status(400).json({ message: 'Invalid OTP' });
      return;
    }

    console.log('[Server] OTP verified successfully for user:', user._id);

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('[Server] Verify OTP error:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
};

// Reset Password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  console.log('[Server] POST /api/auth/reset-password');
  console.log('[Server] Request body:', JSON.stringify({ email: req.body.email, otp: '***' }));
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[Server] Validation errors:', errors.array());
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, otp, newPassword } = req.body;

    // Find user by email and explicitly select password reset fields
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetToken +passwordResetExpires');
    if (!user) {
      console.log('[Server] User not found for email:', email);
      res.status(400).json({ message: 'Invalid email address' });
      return;
    }

    // Check if OTP exists
    if (!user.passwordResetToken) {
      console.log('[Server] No OTP token found for user:', user._id);
      res.status(400).json({ message: 'No OTP found. Please request a new one.' });
      return;
    }
    
    // Check if OTP expiration exists
    if (!user.passwordResetExpires) {
      console.log('[Server] No OTP expiration found for user:', user._id);
      res.status(400).json({ message: 'Invalid OTP. Please request a new one.' });
      return;
    }
    
    // Add detailed logging for debugging
    console.log('[Server] Checking OTP expiration for user:', user._id);
    console.log('[Server] Current time:', new Date());
    console.log('[Server] OTP expiration time:', user.passwordResetExpires);
    console.log('[Server] Time difference (ms):', user.passwordResetExpires.getTime() - new Date().getTime());
    
    const now = new Date();
    if (user.passwordResetExpires < now) {
      console.log('[Server] No valid OTP found or OTP expired for user:', user._id);
      console.log('[Server] Current time:', now, 'OTP expires at:', user.passwordResetExpires);
      res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      return;
    }

    // Hash the provided OTP and compare with stored hash
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    
    if (user.passwordResetToken !== otpHash) {
      console.log('[Server] Invalid OTP for user:', user._id);
      res.status(400).json({ message: 'Invalid OTP' });
      return;
    }

    // Update user password
    user.password = newPassword;
    
    // Clear the password reset token and expiration
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    await user.save();
    
    console.log('[Server] Password reset successfully for user:', user._id);

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('[Server] Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};
