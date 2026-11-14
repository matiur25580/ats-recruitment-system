/*
 * LEARNING NOTE: Authentication handlers: validate signup/login data, persist users, compare password hashes, and issue JWTs.
 * Interview tip: explain what data this layer owns and which layer calls it.
 */
import { Request, Response } from 'express';
import User from '../models/User';
import generateToken from '../utils/generateToken';
import { isValidEmail, isValidPassword } from '../utils/validation';

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
      token: generateToken(user._id.toString()),
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
      token: generateToken(user._id.toString()),
    });
  } catch (error: unknown) {
    console.error('Login failed', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Unable to log in' });
  }
};
