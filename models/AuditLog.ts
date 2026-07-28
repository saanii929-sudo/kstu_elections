import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  actorId: mongoose.Types.ObjectId;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
  actorId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  actorEmail: {
    type: String,
    required: true,
  },
  actorRole: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  targetType: {
    type: String,
    required: true,
  },
  targetId: {
    type: String,
  },
  details: {
    type: Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

if (mongoose.models.AuditLog) {
  delete mongoose.models.AuditLog;
}

const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
