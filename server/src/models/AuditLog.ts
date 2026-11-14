import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  actor: mongoose.Types.ObjectId;
  action: string;
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  metadata: Record<string, unknown>;
  requestId?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, maxlength: 100, index: true },
  entityType: { type: String, required: true, maxlength: 60, index: true },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  requestId: { type: String, maxlength: 80 },
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
