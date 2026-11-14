/*
 * LEARNING NOTE: Application stores status history and private recruiter notes for a traceable review process.
 * Interview tip: explain how an append-only history helps answer who changed an application and when.
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface IApplicationStatusHistory {
  status: 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected';
  changedBy: mongoose.Types.ObjectId;
  note?: string;
  changedAt: Date;
}

export interface IApplication extends Document {
  job: mongoose.Types.ObjectId;
  candidate: mongoose.Types.ObjectId;
  status: 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected';
  coverLetter?: string;
  resumePublicId?: string;
  matchScore?: number;
  aiSummary?: string;
  aiAnalysisStatus: 'completed' | 'unavailable';
  statusHistory: IApplicationStatusHistory[];
  recruiterNotes: { author: mongoose.Types.ObjectId; note: string; createdAt: Date }[];
}

const statusHistorySchema = new Schema<IApplicationStatusHistory>({
  status: { type: String, enum: ['Pending', 'Reviewed', 'Accepted', 'Rejected'], required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, maxlength: 1000 },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

const recruiterNoteSchema = new Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, required: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
});

const applicationSchema: Schema = new Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Pending', 'Reviewed', 'Accepted', 'Rejected'], default: 'Pending' },
  coverLetter: { type: String, maxlength: 5000 },
  resumePublicId: { type: String },
  matchScore: { type: Number, min: 0, max: 100 },
  aiSummary: { type: String, maxlength: 5000 },
  aiAnalysisStatus: { type: String, enum: ['completed', 'unavailable'], default: 'unavailable' },
  statusHistory: { type: [statusHistorySchema], default: [] },
  recruiterNotes: { type: [recruiterNoteSchema], default: [] },
}, { timestamps: true });

applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });
applicationSchema.index({ job: 1, status: 1, createdAt: -1 });
applicationSchema.index({ candidate: 1, createdAt: -1 });
export default mongoose.model<IApplication>('Application', applicationSchema);
