/*
 * LEARNING NOTE: Persistent rate-limit buckets let multiple API instances share abuse counters through MongoDB.
 * Interview tip: contrast this with an in-memory limiter, which resets on restart and is not shared across instances.
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface IRateLimitBucket extends Document {
  key: string;
  windowStart: Date;
  count: number;
  expiresAt: Date;
}

const rateLimitBucketSchema = new Schema<IRateLimitBucket>({
  key: { type: String, required: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

rateLimitBucketSchema.index({ key: 1, windowStart: 1 }, { unique: true });
rateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IRateLimitBucket>('RateLimitBucket', rateLimitBucketSchema);
