/*
 * LEARNING NOTE: Platform-wide admin metrics. This controller is protected by admin-only authorization.
 * Privacy: return aggregate counts and a small, sanitized activity preview; never expose passwords or resume storage IDs.
 */
import { Response } from 'express';
import User from '../models/User';
import Job from '../models/Job';
import Application from '../models/Application';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middlewares/authMiddleware';

// Admin overview is intentionally read-only: it provides platform visibility without changing user data.
export const getAdminOverview = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalUsers, totalCandidates, totalRecruiters, totalJobs, totalApplications, statusGroups, recentJobs, recentApplications] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'candidate' }),
      User.countDocuments({ role: 'recruiter' }),
      Job.countDocuments(),
      Application.countDocuments(),
      Application.aggregate([{ $group: { _id: '$status', value: { $sum: 1 } } }]),
      Job.find().select('title location jobType createdAt recruiter').populate('recruiter', 'name email').sort({ createdAt: -1 }).limit(5).lean(),
      Application.find().select('status createdAt job candidate').populate('job', 'title').populate('candidate', 'name email').sort({ createdAt: -1 }).limit(6).lean(),
    ]);

    const statusOrder = ['Pending', 'Reviewed', 'Accepted', 'Rejected'];
    const statusCounts = new Map<string, number>(statusGroups.map((item: { _id: string; value: number }) => [item._id, item.value] as [string, number]));

    res.json({
      totals: { users: totalUsers, candidates: totalCandidates, recruiters: totalRecruiters, jobs: totalJobs, applications: totalApplications },
      statusData: statusOrder.map((name) => ({ name, value: statusCounts.get(name) ?? 0 })),
      recentJobs,
      recentApplications,
    });
  } catch (error: unknown) {
    console.error('Failed to load admin overview', error);
    res.status(500).json({ message: 'Unable to load platform overview' });
  }
};


// Admin-only, paginated audit feed. The API returns event metadata, not request bodies or secrets.
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pageValue = Number(req.query.page ?? 1);
    const limitValue = Number(req.query.limit ?? 25);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : 25;
    const filter: Record<string, unknown> = {};
    if (typeof req.query.action === 'string' && /^[a-z.]{1,100}$/.test(req.query.action)) filter.action = req.query.action;
    if (typeof req.query.entityType === 'string' && /^[A-Za-z]{1,60}$/.test(req.query.entityType)) filter.entityType = req.query.entityType;
    const [items, total] = await Promise.all([
      AuditLog.find(filter).populate('actor', 'name email role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: unknown) {
    console.error('Failed to retrieve audit logs', error);
    res.status(500).json({ message: 'Unable to retrieve audit logs' });
  }
};
