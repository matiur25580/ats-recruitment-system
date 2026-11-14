/*
 * LEARNING NOTE: Recruiter-only dashboard statistics endpoint.
 * Interview tip: trace the HTTP method + URL through middleware to the controller.
 */
import express from 'express';
import { getRecruiterStats } from '../controllers/statsController';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = express.Router();

// Both checks run before the stats controller: user must be signed in and have recruiter role.
router.get('/recruiter', protect, authorizeRoles('recruiter'), getRecruiterStats);

export default router;
