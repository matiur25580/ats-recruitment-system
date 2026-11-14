/*
 * LEARNING NOTE: Structured request logging records operational facts without exposing credentials or request bodies.
 * Interview tip: explain correlation IDs and why logs should avoid passwords, tokens, and resume contents.
 */
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const entry = {
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      event: 'http_request',
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };
    const output = JSON.stringify(entry);
    if (res.statusCode >= 500) console.error(output);
    else if (res.statusCode >= 400) console.warn(output);
    else console.info(output);
  });

  next();
};
