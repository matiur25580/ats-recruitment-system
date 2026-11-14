import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IExperience {
  title: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface IEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'recruiter' | 'candidate';
  headline?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills: string[];
  experience: IExperience[];
  education: IEducation[];
  resumePublicId?: string;
  resumeFileName?: string;
  resumeUploadedAt?: Date;
  matchPassword: (enteredPassword: string) => Promise<boolean>;
}

const experienceSchema = new Schema<IExperience>({
  title: { type: String, trim: true, maxlength: 120 },
  company: { type: String, trim: true, maxlength: 120 },
  location: { type: String, trim: true, maxlength: 120 },
  startDate: { type: String, trim: true, maxlength: 20 },
  endDate: { type: String, trim: true, maxlength: 20 },
  current: { type: Boolean, default: false },
  description: { type: String, trim: true, maxlength: 2000 },
}, { _id: true });

const educationSchema = new Schema<IEducation>({
  institution: { type: String, trim: true, maxlength: 160 },
  degree: { type: String, trim: true, maxlength: 120 },
  fieldOfStudy: { type: String, trim: true, maxlength: 120 },
  startDate: { type: String, trim: true, maxlength: 20 },
  endDate: { type: String, trim: true, maxlength: 20 },
  description: { type: String, trim: true, maxlength: 1000 },
}, { _id: true });

const userSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'recruiter', 'candidate'],
      default: 'candidate',
    },
    headline: { type: String, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 40 },
    location: { type: String, trim: true, maxlength: 120 },
    summary: { type: String, trim: true, maxlength: 2000 },
    skills: { type: [{ type: String, trim: true, maxlength: 60 }], default: [] },
    experience: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    resumePublicId: { type: String, select: false },
    resumeFileName: { type: String, maxlength: 255 },
    resumeUploadedAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);
export default User;
