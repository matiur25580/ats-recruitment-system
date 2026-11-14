/*
 * LEARNING NOTE: Mongoose Application model: connects a candidate to a job and stores review/AI metadata.
 * Interview tip: explain what data this layer owns and which layer calls it.
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface IApplication extends Document {
  job: mongoose.Types.ObjectId;
  candidate: mongoose.Types.ObjectId;
  status: 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected';
  coverLetter?: string;
  resumePublicId?: string;
  matchScore?: number;   // নতুন ফিল্ড
  aiSummary?: string;    // নতুন ফিল্ড
  aiAnalysisStatus: 'completed' | 'unavailable';
}

// Application schema: persists each candidate's submission and its recruitment review state.
const applicationSchema: Schema = new Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Pending', 'Reviewed', 'Accepted', 'Rejected'], default: 'Pending' },
    coverLetter: { type: String },
    resumePublicId: { type: String },
    matchScore: { type: Number },
    aiSummary: { type: String },
    aiAnalysisStatus: { type: String, enum: ['completed', 'unavailable'], default: 'unavailable' },
  },
  { timestamps: true }
);

// Database-level uniqueness prevents the same candidate applying to the same job twice.
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });
const Application = mongoose.model<IApplication>('Application', applicationSchema);
export default Application;
