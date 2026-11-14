/*
 * LEARNING NOTE: Public authentication endpoints; route definitions delegate business logic to authController.
 * Interview tip: trace the HTTP method + URL through middleware to the controller.
 */
import express from 'express';
import { registerUser, loginUser, forgotPassword, resetPassword } from '../controllers/authController';
import { authRateLimit } from '../middlewares/authRateLimit';

const router = express.Router();

// POST /register creates a public candidate account; role assignment is controlled by the server.
router.post('/register', authRateLimit, registerUser);
router.post('/login', authRateLimit, loginUser);
router.post('/forgot-password', authRateLimit, forgotPassword);
router.post('/reset-password', authRateLimit, resetPassword);

export default router;
