/*
 * LEARNING NOTE: Job endpoints: public listing and recruiter-only job creation.
 * Interview tip: trace the HTTP method + URL through middleware to the controller.
 */
import express from 'express';
import { createJob, getJobs } from '../controllers/jobController';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = express.Router();

// সবাই জব দেখতে পারবে, কিন্তু শুধু রিক্রুটাররা জব তৈরি করতে পারবে
// Public users may browse jobs; only authenticated recruiters may create them.
router.route('/')
  .get(getJobs)
  .post(protect, authorizeRoles('recruiter'), createJob);

export default router;
