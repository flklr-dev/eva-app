import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Admin, { IAdmin } from '../models/Admin';

interface AdminAuthRequest extends Request {
  admin?: IAdmin;
}

interface JwtPayload {
  adminId: string;
  isAdmin: boolean;
}

export const adminAuthMiddleware = async (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured');
      res.status(500).json({ message: 'Server configuration error' });
      return;
    }
    
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // Check if token is for admin
    if (!decoded.isAdmin) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    // Get admin from token
    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      res.status(401).json({ message: 'Admin not found' });
      return;
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token expired' });
      return;
    }
    res.status(500).json({ message: 'Server error during authentication' });
  }
};