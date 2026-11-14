/*
 * LEARNING NOTE: Authentication rate limiting uses an atomic MongoDB counter shared across server instances.
 * Interview tip: explain fixed windows, atomic increments, TTL cleanup, and why proxy trust must be configured deliberately.
 */
import { createHash } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import RateLimitBucket from '../models/RateLimitBucket';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 10;

export const authRateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS);
  const expiresAt = new Date(windowStart.getTime() + WINDOW_MS * 2);
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = createHash('sha256').update(`${req.baseUrl}${req.path}:${ip}`).digest('hex');

  try {
    const bucket = await RateLimitBucket.findOneAndUpdate(
      { key, windowStart },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (bucket.count > MAX_REQUESTS) {
      const retryAfter = Math.max(1, Math.ceil((windowStart.getTime() + WINDOW_MS - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ message: 'Too many authentication attempts. Please try again later.' });
      return;
    }

    next();
  } catch (error) {
    // Fail closed: authentication must not silently lose its abuse protection during a database outage.
    console.error(JSON.stringify({
      level: 'error',
      event: 'auth_rate_limit_unavailable',
      path: req.path,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    res.status(503).json({ message: 'Authentication is temporarily unavailable' });
  }
};
