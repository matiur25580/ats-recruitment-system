import { Response } from 'express';
import Application from '../models/Application';
import Job from '../models/Job';
import User from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';
import { v2 as cloudinary } from 'cloudinary';
import { analyzeResumeWithAI } from '../utils/aiService';
import { sendEmail } from '../utils/mailer'; // ইমেইল ফাংশন ইম্পোর্ট

const uploadToCloudinary = (fileBuffer: Buffer): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto' },
      (error, result) => { if (error) reject(error); else resolve(result); }
    );
    uploadStream.end(fileBuffer);
  });
};

export const applyForJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const coverLetter = req.body?.coverLetter || '';
    if (!req.file) { res.status(400).json({ message: 'Please upload a resume file' }); return; }

    const job = await Job.findById(jobId).populate('recruiter', 'email name');
    if (!job) { res.status(404).json({ message: 'Job not found' }); return; }

    const alreadyApplied = await Application.findOne({ job: jobId, candidate: req.user._id });
    if (alreadyApplied) { res.status(400).json({ message: 'You have already applied' }); return; }

    const result = await uploadToCloudinary(req.file.buffer);
    const aiAnalysis = await analyzeResumeWithAI(req.file.buffer, job.description, job.requirements);

    const application = new Application({
      job: jobId, candidate: req.user._id, coverLetter,
      resumeUrl: result.secure_url, matchScore: aiAnalysis.matchScore, aiSummary: aiAnalysis.aiSummary,
    });

    await application.save();

    // রিক্রুটারকে ইমেইল পাঠানো
    const recruiter = job.recruiter as any;
    if (recruiter && recruiter.email) {
      sendEmail(
        recruiter.email,
        `New Application for ${job.title}`,
        `Hello ${recruiter.name},\n\n${req.user.name} has applied for your job "${job.title}".\nAI Match Score: ${aiAnalysis.matchScore}%\n\nLogin to your dashboard to view the resume.`
      );
    }

    res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
    const { status } = req.body;
    
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
