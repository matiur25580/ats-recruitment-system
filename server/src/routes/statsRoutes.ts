import express from 'express';
import { getRecruiterStats } from '../controllers/statsController';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = express.Router();

router.get('/recruiter', protect, authorizeRoles('recruiter'), getRecruiterStats);

export default router;
