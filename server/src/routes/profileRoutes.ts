import express from 'express';
import multer from 'multer';
import {
  deleteCandidateResume,
  getCandidateProfile,
  getCandidateResume,
  updateCandidateProfile,
  uploadCandidateResume,
} from '../controllers/profileController';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype === 'application/pdf'),
});
const router = express.Router();

router.use(protect, authorizeRoles('candidate'));
router.route('/').get(getCandidateProfile).put(updateCandidateProfile);
router.route('/resume')
  .get(getCandidateResume)
  .post(upload.single('resume'), uploadCandidateResume)
  .delete(deleteCandidateResume);

export default router;
