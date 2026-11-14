import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authorization = req.headers.authorization;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    res.status(401).json({ message: 'Not authorized, bearer token required' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    res.status(503).json({ message: 'Authentication is not configured' });
    return;
  }

  try {
    const decoded = jwt.verify(match[1], secret);
    if (typeof decoded === 'string' || typeof (decoded as JwtPayload).id !== 'string') {
      res.status(401).json({ message: 'Not authorized, invalid token' });
      return;
    }

    const user = await User.findById((decoded as JwtPayload).id).select('-password');
    if (!user) {
      res.status(401).json({ message: 'Not authorized, user not found' });
      return;
    }

    req.user = user;
    next();
  } catch {
    // Avoid logging token verification errors or token contents.
    res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
};
