import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
      return;
    }
    next();
  };
};
