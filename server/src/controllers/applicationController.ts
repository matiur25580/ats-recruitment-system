/*
 * LEARNING NOTE: Application workflow: resume upload, duplicate prevention, advisory AI analysis, private downloads, and recruiter status updates.
 * Interview tip: describe the input, validation, side effects, and failure path.
 */
import { Response } from 'express';
import Application from '../models/Application';
import Job from '../models/Job';
import { AuthRequest } from '../middlewares/authMiddleware';
import cloudinary from '../config/cloudinary';
import { analyzeResumeWithAI } from '../utils/aiService';
import { sendEmail } from '../utils/mailer'; // ইমেইল ফাংশন ইম্পোর্ট
import { isValidPdfBuffer } from '../utils/validation';

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
    const coverLetter = req.body?.coverLetter || '';
    if (!req.file || req.file.mimetype !== 'application/pdf' || !isValidPdfBuffer(req.file.buffer)) {
      res.status(400).json({ message: 'Please upload a valid PDF resume' });
      return;
    }

    const job = await Job.findById(jobId).populate('recruiter', 'email name');
    if (!job) { res.status(404).json({ message: 'Job not found' }); return; }

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
    });

    await application.save();
    uploadedPublicId = undefined;

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
    
    const applications = await Application.find({ job: jobId }).populate('candidate', 'name email');
    res.json(applications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
    if (job.recruiter.toString() !== req.user._id.toString()) { res.status(403).json({ message: 'Not authorized' }); return; }
    
    application.status = status;
    await application.save();

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
    const applications = await Application.find({ candidate: req.user._id })
      .populate('job', 'title location salary jobType')
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
