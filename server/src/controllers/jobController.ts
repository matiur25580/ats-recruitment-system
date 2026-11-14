import { Response } from 'express';
import Job from '../models/Job';
import { AuthRequest } from '../middlewares/authMiddleware';

// @desc    Create a new job
// @route   POST /api/jobs
// @access  Private/Recruiter
export const createJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, requirements, location, salary, jobType, experienceLevel } = req.body;

    const job = new Job({
      title,
      description,
      requirements,
      location,
      salary,
      jobType,
      experienceLevel,
      recruiter: req.user._id, // Middleware থেকে পাওয়া ইউজারের আইডি
    });

    const createdJob = await job.save();
    res.status(201).json(createdJob);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public (সবাই দেখতে পারবে)
export const getJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // findAll এবং recruiter এর নাম (name) পপুলেট করা
    const jobs = await Job.find().populate('recruiter', 'name email');
    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
