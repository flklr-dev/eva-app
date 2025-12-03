import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User, { IUser } from '../models/User';

interface AuthRequest extends Request {
  user?: IUser;
}

// Generate JWT Token
const generateToken = (userId: string): string => {
  const secret = (process.env.JWT_SECRET || 'your_secret_key_change_this') as string;
  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  } as any);
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
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
