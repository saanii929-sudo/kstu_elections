import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoter extends Document {
  electionId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  voterId?: string;
  token: string;
  password: string;
  linkHash?: string;
  linkExpiresAt?: Date;
  importBatchId?: string;
  credentialsSendAt?: Date;
  credentialsSent: boolean;
  credentialsDeliveryMethod?: 'email' | 'sms' | 'both';
  hasVoted: boolean;
  votedAt?: Date;
  status: 'active' | 'expired' | 'disabled';
  metadata?: {
    department?: string;
    class?: string;
    studentId?: string;
    // All optional — never required at upload/entry time. Populating them
    // lets a school-wide election's roster be filtered and re-used (by
    // department/faculty/level/gender) as the voter list for a related
    // departmental/faculty election, instead of re-uploading the same
    // students. See app/api/elections/voters/import/route.ts.
    faculty?: string;
    level?: string;
    gender?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const VoterSchema: Schema = new Schema(
  {
    electionId: {
      type: Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Voter name is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    // Student number — the credential students log in with (paired with
    // password). Unique per election, enforced by the compound index below.
    voterId: {
      type: String,
      required: [true, 'Student number is required'],
      trim: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    linkHash: {
      type: String,
      unique: true,
      sparse: true,
    },
    linkExpiresAt: {
      type: Date,
    },
    importBatchId: {
      type: String,
      index: true,
    },
    credentialsSendAt: {
      type: Date,
    },
    credentialsSent: {
      type: Boolean,
      default: true,
    },
    credentialsDeliveryMethod: {
      type: String,
      enum: ['email', 'sms', 'both'],
    },
    hasVoted: {
      type: Boolean,
      default: false,
    },
    votedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'disabled'],
      default: 'active',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique indexes — uniqueness is scoped per election.
// The same email/phone/voterId is allowed across different elections.
VoterSchema.index({ electionId: 1, phone: 1 }, { unique: true, sparse: true });
VoterSchema.index({ electionId: 1, voterId: 1 }, { unique: true, sparse: true });
// Backs the scheduled-credentials sweep's due-voters query.
VoterSchema.index({ credentialsSent: 1, credentialsSendAt: 1 });

if (mongoose.models.Voter) {
  delete mongoose.models.Voter;
}

const Voter: Model<IVoter> = mongoose.model<IVoter>('Voter', VoterSchema);

function syncVoterIndexes() {
  Voter.syncIndexes().catch((err) =>
    console.error('Voter.syncIndexes error:', err)
  );
}
if (mongoose.connection.readyState === 1) {
  syncVoterIndexes();
} else {
  mongoose.connection.once('connected', syncVoterIndexes);
}

export default Voter;
