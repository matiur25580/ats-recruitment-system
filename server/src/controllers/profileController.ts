/*
 * LEARNING NOTE: Candidate profile API: validates profile fields and securely manages private PDF resumes.
 * Interview tip: explain the responsibility of this file and how data flows through it.
 */
import { Response } from 'express';
import User, { IEducation, IExperience } from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';
import cloudinary from '../config/cloudinary';

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const valueTrimmed = value.trim();
  return valueTrimmed ? valueTrimmed.slice(0, max) : '';
};

const normalizeExperience = (items: unknown): IEducation[] | IExperience[] | undefined => {
  if (!Array.isArray(items) || items.length > 20) return undefined;
  return items.map((item: any) => ({
    title: text(item?.title, 120) || '',
    company: text(item?.company, 120) || '',
    location: text(item?.location, 120) || '',
    startDate: text(item?.startDate, 20) || '',
    endDate: text(item?.endDate, 20) || '',
    current: item?.current === true,
    description: text(item?.description, 2000) || '',
  }));
};

const normalizeEducation = (items: unknown): IEducation[] | undefined => {
  if (!Array.isArray(items) || items.length > 20) return undefined;
  return items.map((item: any) => ({
    institution: text(item?.institution, 160) || '',
    degree: text(item?.degree, 120) || '',
    fieldOfStudy: text(item?.fieldOfStudy, 120) || '',
    startDate: text(item?.startDate, 20) || '',
    endDate: text(item?.endDate, 20) || '',
    description: text(item?.description, 1000) || '',
  }));
};

const uploadResume = (buffer: Buffer, fileName: string): Promise<{ public_id: string }> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', type: 'private', use_filename: false, unique_filename: true, format: 'pdf' },
      (error, result) => {
        if (error) reject(error);
        else if (!result) reject(new Error('Cloudinary returned no upload result'));
        else resolve({ public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });

const removeResume = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', type: 'private' });
};

// Controller: handle this HTTP use case, access only the signed-in candidate's record, and return an HTTP response.
export const getCandidateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).select('-password -resumePublicId');
    if (!user) { res.status(404).json({ message: 'Profile not found' }); return; }
    const profile = user.toObject();
    res.json({ ...profile, hasResume: Boolean(user.resumeFileName) });
  } catch (error) {
    console.error('Unable to load candidate profile', error);
    res.status(500).json({ message: 'Unable to load profile' });
  }
};

export const updateCandidateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) { res.status(404).json({ message: 'Profile not found' }); return; }

    const body = req.body || {};
    if (body.name !== undefined) {
      const name = text(body.name, 120);
      if (!name) { res.status(400).json({ message: 'Name cannot be empty' }); return; }
      user.name = name;
    }
    if (body.headline !== undefined) user.headline = text(body.headline, 160);
    if (body.phone !== undefined) user.phone = text(body.phone, 40);
    if (body.location !== undefined) user.location = text(body.location, 120);
    if (body.summary !== undefined) user.summary = text(body.summary, 2000);
    if (body.skills !== undefined) {
      if (!Array.isArray(body.skills) || body.skills.length > 40 || body.skills.some((skill: unknown) => typeof skill !== 'string')) {
        res.status(400).json({ message: 'Skills must be a list of up to 40 items' }); return;
      }
      const skills = body.skills as string[];
      user.skills = [...new Set(skills.map((skill) => skill.trim().slice(0, 60)).filter(Boolean))];
    }
    if (body.experience !== undefined) {
      const experience = normalizeExperience(body.experience);
      if (!experience) { res.status(400).json({ message: 'Experience must contain no more than 20 entries' }); return; }
      user.experience = experience as IExperience[];
    }
    if (body.education !== undefined) {
      const education = normalizeEducation(body.education);
      if (!education) { res.status(400).json({ message: 'Education must contain no more than 20 entries' }); return; }
      user.education = education;
    }

    await user.save();
    const saved = await User.findById(user._id).select('-password -resumePublicId');
    if (!saved) { res.status(404).json({ message: 'Profile not found after update' }); return; }
    res.json({ ...saved.toObject(), hasResume: Boolean(saved.resumeFileName) });
  } catch (error) {
    console.error('Unable to update candidate profile', error);
    res.status(500).json({ message: 'Unable to save profile' });
  }
};

export const uploadCandidateResume = async (req: AuthRequest, res: Response): Promise<void> => {
  let newPublicId: string | undefined;
  try {
    if (!req.file || req.file.mimetype !== 'application/pdf' || req.file.buffer.subarray(0, 5).toString() !== '%PDF-') {
      res.status(400).json({ message: 'Please upload a valid PDF resume' }); return;
    }
    const user = await User.findById(req.user._id).select('+resumePublicId');
    if (!user) { res.status(404).json({ message: 'Profile not found' }); return; }

    const uploaded = await uploadResume(req.file.buffer, req.file.originalname);
    newPublicId = uploaded.public_id;
    const previousPublicId = user.resumePublicId;
    user.resumePublicId = uploaded.public_id;
    user.resumeFileName = req.file.originalname.slice(0, 255);
    user.resumeUploadedAt = new Date();
    await user.save();
    newPublicId = undefined;

    if (previousPublicId) {
      try { await removeResume(previousPublicId); }
      catch (cleanupError) { console.error('Unable to remove replaced candidate resume', cleanupError); }
    }
    res.status(200).json({ message: 'Resume uploaded successfully', resumeFileName: user.resumeFileName, resumeUploadedAt: user.resumeUploadedAt });
  } catch (error) {
    if (newPublicId) {
      try { await removeResume(newPublicId); }
      catch (cleanupError) { console.error('Unable to clean up failed resume upload', cleanupError); }
    }
    console.error('Unable to upload candidate resume', error);
    res.status(500).json({ message: 'Unable to upload resume' });
  }
};

export const getCandidateResume = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).select('+resumePublicId resumeFileName');
    if (!user?.resumePublicId) { res.status(404).json({ message: 'No resume has been uploaded yet' }); return; }
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const url = cloudinary.utils.private_download_url(user.resumePublicId, 'pdf', {
      resource_type: 'raw', type: 'private', expires_at: expiresAt, attachment: true,
    });
    res.json({ url, expiresAt, fileName: user.resumeFileName });
  } catch (error) {
    console.error('Unable to create candidate resume link', error);
    res.status(500).json({ message: 'Unable to retrieve resume' });
  }
};

export const deleteCandidateResume = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).select('+resumePublicId');
    if (!user?.resumePublicId) { res.status(404).json({ message: 'No resume has been uploaded yet' }); return; }
    const publicId = user.resumePublicId;
    user.resumePublicId = undefined;
    user.resumeFileName = undefined;
    user.resumeUploadedAt = undefined;
    await user.save();
    try { await removeResume(publicId); }
    catch (error) {
      console.error('Resume removed from profile but Cloudinary cleanup failed', error);
      res.status(502).json({ message: 'Resume was detached from your profile, but storage cleanup needs attention' }); return;
    }
    res.json({ message: 'Resume removed successfully' });
  } catch (error) {
    console.error('Unable to delete candidate resume', error);
    res.status(500).json({ message: 'Unable to remove resume' });
  }
};
