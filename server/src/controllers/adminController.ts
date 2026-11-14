/*
 * LEARNING NOTE: Platform-wide admin metrics. This controller is protected by admin-only authorization.
 * Privacy: return aggregate counts and a small, sanitized activity preview; never expose passwords or resume storage IDs.
 */
import { Response } from 'express';
import User from '../models/User';
import Job from '../models/Job';
import Application from '../models/Application';
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
    const statusCounts = new Map<string, number>(statusGroups.map((item: { _id: string; value: number }) => [item._id, item.value]));

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
