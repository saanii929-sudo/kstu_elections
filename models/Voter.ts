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
  hasVoted: boolean;
  votedAt?: Date;
  status: 'active' | 'expired' | 'disabled';
  metadata?: {
    department?: string;
    class?: string;
    studentId?: string;
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
    },
    phone: {
      type: String,
      trim: true,
    },
    voterId: {
      type: String,
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
VoterSchema.index({ electionId: 1, email: 1 }, { unique: true, sparse: true });
VoterSchema.index({ electionId: 1, phone: 1 }, { unique: true, sparse: true });
VoterSchema.index({ electionId: 1, voterId: 1 }, { unique: true, sparse: true });

if (mongoose.models.Voter) {
  delete mongoose.models.Voter;
}

const Voter: Model<IVoter> = mongoose.model<IVoter>('Voter', VoterSchema);

// Drop any stale global unique indexes (e.g. on email/phone alone) that would
// incorrectly block the same voter from appearing in multiple elections.
Voter.syncIndexes().catch((err) =>
  console.error('Voter.syncIndexes error:', err)
);

export default Voter;
