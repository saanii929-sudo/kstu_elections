import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoterLoginAttempt extends Document {
  electionId?: mongoose.Types.ObjectId;
  voterId?: mongoose.Types.ObjectId;
  attemptedStudentId?: string;
  ip: string;
  userAgent?: string;
  success: boolean;
  failureReason?: 'not_found' | 'bad_password' | 'ineligible' | 'bot_check_failed' | 'account_locked';
  createdAt: Date;
}

const VoterLoginAttemptSchema: Schema = new Schema(
  {
    electionId: {
      type: Schema.Types.ObjectId,
      ref: 'Election',
      index: true,
    },
    voterId: {
      type: Schema.Types.ObjectId,
      ref: 'Voter',
    },
    attemptedStudentId: {
      type: String,
      trim: true,
    },
    ip: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
    },
    success: {
      type: Boolean,
      required: true,
    },
    failureReason: {
      type: String,
      enum: ['not_found', 'bad_password', 'ineligible', 'bot_check_failed', 'account_locked'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

VoterLoginAttemptSchema.index({ electionId: 1, ip: 1, createdAt: -1 });

VoterLoginAttemptSchema.index({ voterId: 1, createdAt: -1 });

if (mongoose.models.VoterLoginAttempt) {
  delete mongoose.models.VoterLoginAttempt;
}

const VoterLoginAttempt: Model<IVoterLoginAttempt> = mongoose.model<IVoterLoginAttempt>(
  'VoterLoginAttempt',
  VoterLoginAttemptSchema
);

export default VoterLoginAttempt;
