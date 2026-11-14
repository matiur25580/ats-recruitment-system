/*
 * LEARNING NOTE: Public authentication endpoints; route definitions delegate business logic to authController.
 * Interview tip: trace the HTTP method + URL through middleware to the controller.
 */
import express from 'express';
import { registerUser, loginUser } from '../controllers/authController';

const router = express.Router();

// POST /register creates a public candidate account; role assignment is controlled by the server.
router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;
