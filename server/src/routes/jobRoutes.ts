import express from 'express';
import { createJob, getJobs } from '../controllers/jobController';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = express.Router();

// সবাই জব দেখতে পারবে, কিন্তু শুধু রিক্রুটাররা জব তৈরি করতে পারবে
router.route('/')
  .get(getJobs)
  .post(protect, authorizeRoles('recruiter'), createJob);

export default router;
