import { Response } from 'express';
import Job from '../models/Job';
import Application from '../models/Application';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getRecruiterStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // ১. রিক্রুটারের সব জব বের করা
    const jobs = await Job.find({ recruiter: req.user._id });
    const jobIds = jobs.map(job => job._id);

    // ২. এই জবগুলোতে আসা সব অ্যাপ্লিকেশন বের করা
    const applications = await Application.find({ job: { $in: jobIds } });

    // ৩. স্ট্যাটস ক্যালকুলেট করা
    const totalJobs = jobs.length;
    const totalApplications = applications.length;
    
    let pendingCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let totalScore = 0;
    let scoredApplications = 0;

    applications.forEach(app => {
      if (app.status === 'Pending') pendingCount++;
      if (app.status === 'Accepted') acceptedCount++;
      if (app.status === 'Rejected') rejectedCount++;
      
      if (app.matchScore !== undefined) {
        totalScore += app.matchScore;
        scoredApplications++;
      }
    });

    const averageMatchScore = scoredApplications > 0 ? Math.round(totalScore / scoredApplications) : 0;

    res.json({
      totalJobs,
      totalApplications,
      averageMatchScore,
      statusData: [
        { name: 'Pending', value: pendingCount },
        { name: 'Accepted', value: acceptedCount },
        { name: 'Rejected', value: rejectedCount }
      ]
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
