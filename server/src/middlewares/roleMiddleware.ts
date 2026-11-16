/*
 * LEARNING NOTE: Role-based authorization middleware: permits access only to explicitly allowed user roles.
 * Interview tip: explain what data this layer owns and which layer calls it.
 */
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

// Authorization factory: create reusable middleware for route-specific role restrictions.
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: AuthRequest['user'] }).user;
    if (!user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        message: `User role '${user.role}' is not authorized to access this route`,
      });
      return;
    }
    next();
  };
};
