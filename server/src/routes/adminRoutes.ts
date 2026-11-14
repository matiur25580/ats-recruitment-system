/*
 * LEARNING NOTE: Admin-only platform endpoints. Authentication establishes identity; role authorization grants access.
 */
import express from 'express';
import { getAdminOverview, getAuditLogs } from '../controllers/adminController';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = express.Router();

// Never expose platform-wide metrics to candidates or recruiters.
router.get('/overview', protect, authorizeRoles('admin'), getAdminOverview);
router.get('/audit-logs', protect, authorizeRoles('admin'), getAuditLogs);

export default router;
