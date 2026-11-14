import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  title: string;
  description: string;
  requirements: string[];
  location: string;
  salary: number;
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  experienceLevel: 'Entry' | 'Mid' | 'Senior';
  recruiter: mongoose.Types.ObjectId;
}

const jobSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    location: { type: String, required: true },
    salary: { type: Number, required: true },
    jobType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
      required: true,
    },
    experienceLevel: {
      type: String,
      enum: ['Entry', 'Mid', 'Senior'],
      required: true,
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const Job = mongoose.model<IJob>('Job', jobSchema);
export default Job;
