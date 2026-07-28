import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISession extends Document {
  sid: string;
  userId: mongoose.Types.ObjectId;
  userType: string;
  email: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
}

const SessionSchema: Schema = new Schema({
  sid: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  userType: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
  },
  ip: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  revoked: {
    type: Boolean,
    default: false,
  },
  revokedAt: {
    type: Date,
  },
});

if (mongoose.models.Session) {
  delete mongoose.models.Session;
}

const Session: Model<ISession> = mongoose.model<ISession>('Session', SessionSchema);

export default Session;
