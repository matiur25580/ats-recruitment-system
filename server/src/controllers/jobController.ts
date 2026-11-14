/*
 * LEARNING NOTE: Job handlers: validate job fields, attach recruiter ownership, and return available jobs.
 * Interview tip: trace the HTTP method + URL through middleware to the controller.
 */
import { Response } from 'express';
import Job from '../models/Job';
import { AuthRequest } from '../middlewares/authMiddleware';

const allowedJobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'] as const;
const allowedExperienceLevels = ['Entry', 'Mid', 'Senior'] as const;

// @desc    Create a new job
// @route   POST /api/jobs
// @access  Private/Recruiter
// Validate untrusted request data before creating a database record owned by the signed-in recruiter.
export const createJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title, description, requirements, location, salary, jobType, experienceLevel,
    } = req.body ?? {};

    if (
      typeof title !== 'string' || !title.trim() ||
      typeof description !== 'string' || !description.trim() ||
      typeof location !== 'string' || !location.trim() ||
      !Number.isFinite(Number(salary)) || Number(salary) < 0 ||
      !allowedJobTypes.includes(jobType) ||
      !allowedExperienceLevels.includes(experienceLevel) ||
      (requirements !== undefined && (!Array.isArray(requirements) ||
        !requirements.every((item: unknown) => typeof item === 'string')))
    ) {
      res.status(400).json({ message: 'Please provide valid job details' });
      return;
    }

    const job = new Job({
      title: title.trim(),
      description: description.trim(),
      requirements: (requirements ?? []).map((item: string) => item.trim()).filter(Boolean),
      location: location.trim(),
      salary: Number(salary),
      jobType,
      experienceLevel,
      recruiter: req.user._id,
    });

    const createdJob = await job.save();
    res.status(201).json(createdJob);
  } catch (error: unknown) {
    console.error('Failed to create job', error);
    res.status(500).json({ message: 'Unable to create job' });
  }
};

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
export const getJobs = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobs = await Job.find().populate('recruiter', 'name email');
    res.json(jobs);
  } catch (error: unknown) {
    console.error('Failed to retrieve jobs', error);
    res.status(500).json({ message: 'Unable to retrieve jobs' });
  }
};
