/*
 * LEARNING NOTE: Job handlers enforce recruiter ownership and explicit lifecycle transitions at the API boundary.
 * Interview tip: explain why clients never supply the recruiter ID and why closed jobs cannot receive applications.
 */
import { Response } from 'express';
import Job from '../models/Job';
import { AuthRequest } from '../middlewares/authMiddleware';

const allowedJobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'] as const;
const allowedExperienceLevels = ['Entry', 'Mid', 'Senior'] as const;

const validJobDetails = (body: any): boolean =>
  typeof body.title === 'string' && !!body.title.trim() &&
  typeof body.description === 'string' && !!body.description.trim() &&
  typeof body.location === 'string' && !!body.location.trim() &&
  Number.isFinite(Number(body.salary)) && Number(body.salary) >= 0 &&
  allowedJobTypes.includes(body.jobType) &&
  allowedExperienceLevels.includes(body.experienceLevel) &&
  (body.requirements === undefined || (Array.isArray(body.requirements) &&
    body.requirements.every((item: unknown) => typeof item === 'string')));

const normalizedJobDetails = (body: any) => ({
  title: body.title.trim(),
  description: body.description.trim(),
  location: body.location.trim(),
  salary: Number(body.salary),
  jobType: body.jobType,
  experienceLevel: body.experienceLevel,
  requirements: (body.requirements ?? []).map((item: string) => item.trim()).filter(Boolean),
});

export const createJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!validJobDetails(req.body ?? {})) {
      res.status(400).json({ message: 'Please provide valid job details' });
      return;
    }
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : undefined;
    if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) {
      res.status(400).json({ message: 'Job expiry must be a valid future date' });
      return;
    }
    const createdJob = await Job.create({
      ...normalizedJobDetails(req.body),
      ...(expiresAt ? { expiresAt } : {}),
      recruiter: req.user._id,
    });
    res.status(201).json(createdJob);
  } catch (error: unknown) {
    console.error('Failed to create job', error);
    res.status(500).json({ message: 'Unable to create job' });
  }
};

export const getJobs = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobs = await Job.find({
      status: 'Open',
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }).populate('recruiter', 'name email').sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error: unknown) {
    console.error('Failed to retrieve jobs', error);
    res.status(500).json({ message: 'Unable to retrieve jobs' });
  }
};

export const updateJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) { res.status(404).json({ message: 'Job not found' }); return; }
    if (job.recruiter.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to manage this job' }); return;
    }
    if (job.status === 'Archived') {
      res.status(409).json({ message: 'Archived jobs cannot be edited' }); return;
    }
    if (!validJobDetails(req.body ?? {})) {
      res.status(400).json({ message: 'Please provide all valid job details' }); return;
    }
    if (req.body.expiresAt !== undefined) {
      const expiry = new Date(req.body.expiresAt);
      if (!Number.isFinite(expiry.getTime()) || expiry <= new Date()) {
        res.status(400).json({ message: 'Job expiry must be a valid future date' }); return;
      }
      job.expiresAt = expiry;
    }
    Object.assign(job, normalizedJobDetails(req.body));
    await job.save();
    res.json(job);
  } catch (error: unknown) {
    console.error('Failed to update job', error);
    res.status(500).json({ message: 'Unable to update job' });
  }
};

export const updateJobLifecycle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = req.body?.status;
    if (!['Open', 'Closed', 'Archived'].includes(status)) {
      res.status(400).json({ message: 'Status must be Open, Closed, or Archived' }); return;
    }
    const job = await Job.findById(req.params.jobId);
    if (!job) { res.status(404).json({ message: 'Job not found' }); return; }
    if (job.recruiter.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to manage this job' }); return;
    }
    if (job.status === 'Archived' && status !== 'Archived') {
      res.status(409).json({ message: 'Archived jobs cannot be reopened' }); return;
    }
    if (status === 'Open' && job.expiresAt && job.expiresAt <= new Date()) {
      res.status(409).json({ message: 'Update the expiry date before reopening this job' }); return;
    }
    job.status = status;
    await job.save();
    res.json({ message: `Job ${status.toLowerCase()} successfully`, job });
  } catch (error: unknown) {
    console.error('Failed to change job lifecycle', error);
    res.status(500).json({ message: 'Unable to change job status' });
  }
};


export const getRecruiterJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobs = await Job.find({ recruiter: req.user._id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error: unknown) {
    console.error('Failed to retrieve recruiter jobs', error);
    res.status(500).json({ message: 'Unable to retrieve your jobs' });
  }
};
