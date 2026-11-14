/*
 * LEARNING NOTE: Central error middleware converts expected application/database failures into safe API responses.
 * Interview tip: explain why production responses omit stack traces while logs retain diagnostic context.
 */
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route not found: ${req.method} ${req.path}`, 404));
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'An unexpected error occurred';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (typeof error === 'object' && error !== null && 'name' in error) {
    const candidate = error as { name?: string; code?: number; message?: string };
    if (candidate.name === 'ValidationError') {
      statusCode = 400;
      message = 'Request data is invalid';
    } else if (candidate.name === 'CastError') {
      statusCode = 400;
      message = 'A supplied identifier or value is invalid';
    } else if (candidate.code === 11000) {
      statusCode = 409;
      message = 'A record with this value already exists';
    }
  }

  const requestId = res.getHeader('X-Request-Id');
  const diagnostic = error instanceof Error ? error.stack || error.message : String(error);
  if (statusCode >= 500) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'request_failed',
      requestId,
      method: req.method,
      path: req.path,
      error: diagnostic,
    }));
  }

  if (res.headersSent) {
    return;
  }

  res.status(statusCode).json({
    message,
    ...(requestId ? { requestId } : {}),
  });
};
