import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog';

type AuditInput = {
  actorId: mongoose.Types.ObjectId | string;
  action: string;
  entityType: string;
  entityId: mongoose.Types.ObjectId | string;
  metadata?: Record<string, unknown>;
  requestId?: string;
};

// Audit records deliberately store state changes and safe metadata, never credentials or resume contents.
export const recordAuditEvent = async (input: AuditInput): Promise<void> => {
  try {
    await AuditLog.create({
      actor: input.actorId,
      action: input.action.slice(0, 100),
      entityType: input.entityType.slice(0, 60),
      entityId: input.entityId,
      metadata: input.metadata ?? {},
      ...(input.requestId ? { requestId: input.requestId.slice(0, 80) } : {}),
    });
  } catch (error) {
    // Business actions must not be misreported as failed after their database write has committed.
    console.error('Audit event persistence failed', error);
  }
};
