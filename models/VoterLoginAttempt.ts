import mongoose, { Schema, Document, Model } from 'mongoose';

// Durable, cross-instance audit trail of every voter login attempt
// (successful or not) — the in-memory rate limiter in lib/rate-limit.ts
// throttles bursts but keeps no history and doesn't survive a restart.
// This is what /superadmin/suspicious-activity queries to flag IPs with
// an unusual number of distinct voters logging in within a short window.
// Never used to block anyone by itself — review-only.
export interface IVoterLoginAttempt extends Document {
  // Unset when the linkHash itself didn't resolve to any voter — there's no
  // election to attribute the attempt to in that case.
  electionId?: mongoose.Types.ObjectId;
  // Unset when the attempted student number didn't resolve to a real voter.
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
    // Only createdAt is meaningful here — attempts are never updated.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Backs the suspicious-activity aggregation: "distinct voters from this IP
// on this election within the last N minutes."
VoterLoginAttemptSchema.index({ electionId: 1, ip: 1, createdAt: -1 });

// Backs the per-account lockout check in app/api/elections/auth/login —
// "how many times has THIS voter failed to log in recently," independent
// of which IP the attempts came from.
VoterLoginAttemptSchema.index({ voterId: 1, createdAt: -1 });

if (mongoose.models.VoterLoginAttempt) {
  delete mongoose.models.VoterLoginAttempt;
}

const VoterLoginAttempt: Model<IVoterLoginAttempt> = mongoose.model<IVoterLoginAttempt>(
  'VoterLoginAttempt',
  VoterLoginAttemptSchema
);

export default VoterLoginAttempt;
