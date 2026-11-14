/*
 * LEARNING NOTE: Authentication handlers: validate signup/login data, persist users, compare password hashes, and issue JWTs.
 * Interview tip: explain what data this layer owns and which layer calls it.
 */
import { Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import User from '../models/User';
import generateToken from '../utils/generateToken';
import { isValidEmail, isValidPassword } from '../utils/validation';
import { sendEmail } from '../utils/mailer';

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

// Registration handler: validate public signup data and create a candidate account safely.
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ message: 'Please provide a valid email address' });
      return;
    }

    if (!isValidPassword(password)) {
      res.status(400).json({ message: 'Password must be at least 8 characters long' });
      return;
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(409).json({ message: 'This email is already registered. Please log in.' });
      return;
    }

    // Public registration must never grant privileged roles.
    const user = await User.create({ name, email, password, role: 'candidate' });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id.toString(), user.tokenVersion || 0),
    });
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({ message: 'User already exists' });
      return;
    }
    console.error('Registration failed', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Unable to register user' });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      if (!user) {
      res.status(404).json({ message: 'This email does not exist. Please register first.' });
      return;
    }
    if (!(await user.matchPassword(password))) {
      res.status(401).json({ message: 'Incorrect password. Please try again.' });
      return;
    }
      return;
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id.toString(), user.tokenVersion || 0),
    });
  } catch (error: unknown) {
    console.error('Login failed', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Unable to log in' });
  }
};


/**
 * Always return the same response to prevent the password-reset endpoint from
 * revealing whether an email address has an account.
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const genericMessage = 'If an account exists for this email, password reset instructions will be sent shortly.';
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!isValidEmail(email)) {
      res.status(200).json({ message: genericMessage });
      return;
    }

    const user = await User.findOne({ email });
    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      user.passwordResetTokenHash = createHash('sha256').update(rawToken).digest('hex');
      user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      const frontendUrl = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const resetUrl = `${frontendUrl}/reset-password#token=${encodeURIComponent(rawToken)}`;
      const delivered = await sendEmail(
        user.email,
        'Reset your HireFlow password',
        `We received a request to reset your HireFlow password. Use this one-time link within 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`
      );
      if (!delivered) {
        console.warn('Password reset email could not be delivered; verify SMTP configuration.');
      }
    }
    res.status(200).json({ message: genericMessage });
  } catch (error: unknown) {
    console.error('Password reset request failed', error instanceof Error ? error.message : 'Unknown error');
    res.status(200).json({ message: genericMessage });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!token || !isValidPassword(password)) {
      res.status(400).json({ message: 'A valid reset token and a password of at least 8 characters are required.' });
      return;
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      res.status(400).json({ message: 'This password reset link is invalid or has expired. Please request a new one.' });
      return;
    }

    user.password = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.status(200).json({ message: 'Your password has been reset successfully. Please sign in with your new password.' });
  } catch (error: unknown) {
    console.error('Password reset failed', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Unable to reset password right now. Please try again.' });
  }
};
