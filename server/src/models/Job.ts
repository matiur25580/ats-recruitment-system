/*
 * LEARNING NOTE: Mongoose Job model owns job content, lifecycle state, expiry, and recruiter ownership.
 * Interview tip: explain why lifecycle state is persisted rather than inferred from UI visibility.
 */
import mongoose, { Document, Schema } from 'mongoose';

export type JobStatus = 'Open' | 'Closed' | 'Archived';

export interface IJob extends Document {
  title: string;
  description: string;
  requirements: string[];
  location: string;
  salary: number;
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  experienceLevel: 'Entry' | 'Mid' | 'Senior';
  recruiter: mongoose.Types.ObjectId;
  status: JobStatus;
  expiresAt?: Date;
}

const jobSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    requirements: [{ type: String, trim: true }],
    location: { type: String, required: true, trim: true },
    salary: { type: Number, required: true, min: 0 },
    jobType: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Internship'], required: true },
    experienceLevel: { type: String, enum: ['Entry', 'Mid', 'Senior'], required: true },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['Open', 'Closed', 'Archived'], default: 'Open', index: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, expiresAt: 1, createdAt: -1 });
export default mongoose.model<IJob>('Job', jobSchema);
