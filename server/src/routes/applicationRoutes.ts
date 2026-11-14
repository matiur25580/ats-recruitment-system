import express from 'express';
import multer from 'multer';
import { 
  applyForJob, 
  getJobApplications, 
  updateApplicationStatus,
  getCandidateApplications,
  getApplicationResume
} from '../controllers/applicationController';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype === 'application/pdf'),
});
const router = express.Router();

// ১. ক্যান্ডিডেটের নিজের অ্যাপ্লিকেশন দেখা (এটি অবশ্যই /:jobId এর আগে থাকবে)
router.get('/my-applications', protect, authorizeRoles('candidate'), getCandidateApplications);

router.get('/:appId/resume', protect, authorizeRoles('candidate', 'recruiter'), getApplicationResume);

// ২. ক্যান্ডিডেটের জবে অ্যাপ্লাই করা
router.post('/:jobId', protect, authorizeRoles('candidate'), upload.single('resume'), applyForJob);

// ৩. রিক্রুটারের জবের অ্যাপ্লিকেশনগুলো দেখা
router.get('/:jobId', protect, authorizeRoles('recruiter'), getJobApplications);

// ৪. রিক্রুটারের স্ট্যাটাস আপডেট করা
router.put('/:appId/status', protect, authorizeRoles('recruiter'), updateApplicationStatus);

export default router;
