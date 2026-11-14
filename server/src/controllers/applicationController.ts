/*
 * LEARNING NOTE: Application workflow: resume upload, duplicate prevention, advisory AI analysis, private downloads, and recruiter status updates.
 * Interview tip: describe the input, validation, side effects, and failure path.
 */
import { Response } from 'express';
import Application from '../models/Application';
import Job from '../models/Job';
import User from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';
import cloudinary from '../config/cloudinary';
import { analyzeResumeWithAI } from '../utils/aiService';
import { sendEmail } from '../utils/mailer'; // ইমেইল ফাংশন ইম্পোর্ট
import { isValidPdfBuffer } from '../utils/validation';
import { recordAuditEvent } from '../utils/audit';

const uploadToCloudinary = (fileBuffer: Buffer): Promise<{ public_id: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', type: 'private', use_filename: false, unique_filename: true },
      (error, result) => {
        if (error) reject(error);
        else if (!result) reject(new Error('Cloudinary returned no upload result'));
        else resolve({ public_id: result.public_id });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Apply flow: validate the PDF and job first, prevent duplicates, then persist the resume and application.
export const applyForJob = async (req: AuthRequest, res: Response): Promise<void> => {
  let uploadedPublicId: string | undefined;
  try {
    const { jobId } = req.params;
    const coverLetter = req.body?.coverLetter ?? '';
    if (typeof coverLetter !== 'string' || coverLetter.length > 5000) {
      res.status(400).json({ message: 'Cover letter must be 5000 characters or fewer' });
      return;
    }
    if (!req.file || req.file.mimetype !== 'application/pdf' || !isValidPdfBuffer(req.file.buffer)) {
      res.status(400).json({ message: 'Please upload a valid PDF resume' });
      return;
    }

    const job = await Job.findById(jobId).populate('recruiter', 'email name');
    if (!job) { res.status(404).json({ message: 'Job not found' }); return; }
    if ((job.status && job.status !== 'Open') || (job.expiresAt && job.expiresAt <= new Date())) {
      res.status(409).json({ message: 'This job is no longer accepting applications' }); return;
    }

    // Check before uploading: a duplicate request should not create an orphaned file.
    const alreadyApplied = await Application.findOne({ job: jobId, candidate: req.user._id });
    if (alreadyApplied) { res.status(400).json({ message: 'You have already applied' }); return; }

    const result = await uploadToCloudinary(req.file.buffer);
    uploadedPublicId = result.public_id;
    // Analysis is optional/advisory; application submission can continue if the AI service is unavailable.
    const aiAnalysis = await analyzeResumeWithAI(req.file.buffer, job.description, job.requirements);

    const application = new Application({
      job: jobId, candidate: req.user._id, coverLetter,
      resumePublicId: result.public_id,
      matchScore: aiAnalysis?.matchScore,
      aiSummary: aiAnalysis?.aiSummary,
      aiAnalysisStatus: aiAnalysis ? 'completed' : 'unavailable',
      statusHistory: [{ status: 'Pending', changedBy: req.user._id, changedAt: new Date() }],
    });

    await application.save();
    uploadedPublicId = undefined;
    await recordAuditEvent({ actorId: req.user._id, action: 'application.submitted', entityType: 'Application', entityId: application._id, metadata: { jobId: job._id }, requestId: req.header('x-request-id') });

    // রিক্রুটারকে ইমেইল পাঠানো
    const recruiter = job.recruiter as any;
    if (recruiter && recruiter.email) {
      sendEmail(
        recruiter.email,
        `New Application for ${job.title}`,
        `Hello ${recruiter.name},\n\n${req.user.name} has applied for your job "${job.title}".\nAI Match Score: ${aiAnalysis ? `${aiAnalysis.matchScore}%` : 'unavailable'}\n\nLogin to your dashboard to view the resume.`
      );
    }

    res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (error: unknown) {
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId, { resource_type: 'raw', type: 'private' });
      } catch (cleanupError) {
        console.error('Failed to remove an unclaimed resume upload', cleanupError);
      }
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      res.status(409).json({ message: 'You have already applied to this job' });
      return;
    }
    console.error('Failed to submit application', error);
    res.status(500).json({ message: 'Unable to submit application' });
  }
};

export const getApplicationResume = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const application = await Application.findById(req.params.appId).select('candidate job resumePublicId');
    if (!application) { res.status(404).json({ message: 'Application not found' }); return; }

    const job = await Job.findById(application.job).select('recruiter');
    if (!job) { res.status(404).json({ message: 'Job not found' }); return; }

    const isCandidate = application.candidate.toString() === req.user._id.toString();
    const isRecruiter = job.recruiter.toString() === req.user._id.toString();
    if (!isCandidate && !isRecruiter) { res.status(403).json({ message: 'Not authorized' }); return; }
    if (!application.resumePublicId) { res.status(404).json({ message: 'Resume not available' }); return; }

    // Short expiry limits the lifetime of a private resume download URL.
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const url = cloudinary.utils.private_download_url(application.resumePublicId, 'pdf', {
      resource_type: 'raw',
      type: 'private',
      expires_at: expiresAt,
      attachment: true,
    });
    res.json({ url, expiresAt });
  } catch (error: unknown) {
    console.error('Failed to create resume download link', error);
    res.status(500).json({ message: 'Unable to retrieve resume' });
  }
};

export const getJobApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) { res.status(404).json({ message: 'Job not found' }); return; }
    if (job.recruiter.toString() !== req.user._id.toString()) { res.status(403).json({ message: 'Not authorized' }); return; }
    
    const pageValue = Number(req.query.page ?? 1);
    const limitValue = Number(req.query.limit ?? 10);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, 50) : 10;
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const filter: Record<string, unknown> = { job: jobId };
    if (['Pending', 'Reviewed', 'Accepted', 'Rejected'].includes(status)) filter.status = status;
    if (q) {
      const slash = String.fromCharCode(92);
      const special = '.+*?^$()[]{}|' + slash;
      const safeQuery = q.split('').map((character) => special.includes(character) ? slash + character : character).join('');
      const candidates = await User.find({ $or: [
        { name: { $regex: safeQuery, $options: 'i' } },
        { email: { $regex: safeQuery, $options: 'i' } },
      ] }).select('_id').limit(100);
      filter.$or = [
        { candidate: { $in: candidates.map((candidate) => candidate._id) } },
        { coverLetter: { $regex: safeQuery, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      Application.find(filter).populate('candidate', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Application.countDocuments(filter),
    ]);
    res.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: unknown) {
    console.error('Failed to retrieve job applications', error);
    res.status(500).json({ message: 'Unable to retrieve applications' });
  }
};

export const updateApplicationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    const requestedStatus: unknown = req.body?.status;
    const allowedStatuses = ['Pending', 'Reviewed', 'Accepted', 'Rejected'] as const;
    if (typeof requestedStatus !== 'string' || !allowedStatuses.includes(requestedStatus as typeof allowedStatuses[number])) {
      res.status(400).json({ message: 'Invalid application status' });
      return;
    }
    const status = requestedStatus as typeof allowedStatuses[number];
    
    // populate('job') এবং populate('candidate') দুটোই করা হচ্ছে মেইল পাঠানোর জন্য
    const application = await Application.findById(appId).populate('job').populate('candidate', 'email name');
    if (!application) { res.status(404).json({ message: 'Application not found' }); return; }
    
    const job = application.job as any;
    if (!job) { res.status(404).json({ message: 'Job not found' }); return; }
    if (job.recruiter.toString() !== req.user._id.toString()) { res.status(403).json({ message: 'Not authorized' }); return; }

    // Repeated requests are idempotent: do not create duplicate audit entries or send duplicate emails.
    if (application.status === status) {
      res.json({ message: 'Application already has this status', application });
      return;
    }

    const allowedTransitions: Record<typeof status, readonly string[]> = {
      Pending: [],
      Reviewed: ['Pending'],
      Accepted: ['Pending', 'Reviewed'],
      Rejected: ['Pending', 'Reviewed'],
    };
    if (!allowedTransitions[status].includes(application.status)) {
      res.status(409).json({ message: `Cannot change application status from ${application.status} to ${status}` });
      return;
    }

    const previousStatus = application.status;
    application.status = status;
    application.statusHistory.push({ status, changedBy: req.user._id, changedAt: new Date() });
    await application.save();
    await recordAuditEvent({ actorId: req.user._id, action: 'application.status_changed', entityType: 'Application', entityId: application._id, metadata: { from: previousStatus, to: status }, requestId: req.header('x-request-id') });

    // ক্যান্ডিডেটকে ইমেইল পাঠানো
    const candidate = application.candidate as any;
    if (candidate && candidate.email) {
      let emailText = `Hello ${candidate.name},\n\nYour application for the job "${job.title}" has been updated.`;
      if (status === 'Accepted') emailText += `\n\n🎉 Congratulations! The recruiter has ACCEPTED your application. They will contact you soon.`;
      if (status === 'Rejected') emailText += `\n\nUnfortunately, the recruiter has decided not to move forward with your application for this role.`;
      if (status === 'Reviewed') emailText += `\n\nYour application is currently under review.`;

      sendEmail(
        candidate.email,
        `Update on your application for ${job.title}`,
        emailText
      );
    }

    res.json({ message: 'Status updated successfully', application });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCandidateApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Recruiter notes are private hiring-team data and must never reach candidate-facing APIs.
    const applications = await Application.find({ candidate: req.user._id })
      .select('-recruiterNotes -resumePublicId')
      .populate('job', 'title location salary jobType')
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (error: unknown) {
    console.error('Failed to retrieve candidate applications', error);
    res.status(500).json({ message: 'Unable to retrieve your applications' });
  }
};


export const addRecruiterNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const note = req.body?.note;
    if (typeof note !== 'string' || !note.trim() || note.trim().length > 2000) {
      res.status(400).json({ message: 'Note must contain 1 to 2000 characters' }); return;
    }
    const application = await Application.findById(req.params.appId);
    if (!application) { res.status(404).json({ message: 'Application not found' }); return; }
    const job = await Job.findById(application.job).select('recruiter');
    if (!job) { res.status(404).json({ message: 'Job not found' }); return; }
    if (job.recruiter.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to add notes to this application' }); return;
    }
    application.recruiterNotes.push({ author: req.user._id, note: note.trim(), createdAt: new Date() });
    await application.save();
    await recordAuditEvent({ actorId: req.user._id, action: 'application.note_added', entityType: 'Application', entityId: application._id, metadata: {}, requestId: req.header('x-request-id') });
    res.status(201).json({ message: 'Recruiter note added', notes: application.recruiterNotes });
  } catch (error: unknown) {
    console.error('Failed to add recruiter note', error);
    res.status(500).json({ message: 'Unable to add recruiter note' });
  }
};
