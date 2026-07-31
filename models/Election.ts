import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IElection extends Document {
  organizationId: mongoose.Types.ObjectId;
  // Additional organizations (beyond the owner) a superadmin has granted
  // full co-management access to — same election, candidates, voters, and
  // results shared across all of them. See lib/electionAccess.ts.
  assignedOrganizationIds: mongoose.Types.ObjectId[];
  title: string;
  alias: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'ended';
  settings: {
    showLiveResults: boolean;
    allowRevote: boolean;
    requireAllCategories: boolean;
    requireOTP: boolean;
    // When true, a candidate's signature on the pink sheet/reports must come
    // from that candidate's assigned polling agent (password-verified). When
    // false, anyone can sign directly — no agent gate.
    requireAgentSignature: boolean;
  };
  // Advisory oversight — Super Admin can approve/reject, but neither status
  // blocks the organization from running the election or publishing results.
  approvalStatus: 'pending' | 'approved' | 'rejected';
  resultsApprovalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const ElectionSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    assignedOrganizationIds: [{ type: Schema.Types.ObjectId, ref: 'Organization' }],
    title: {
      type: String,
      required: [true, 'Election title is required'],
      trim: true,
    },
    alias: {
      type: String,
      required: [true, 'Election alias is required'],
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      match: [/^[A-Z0-9][A-Z0-9-]{1,19}$/, 'Alias must be 2-20 characters: letters, numbers, and hyphens only'],
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'ended'],
      default: 'draft',
    },
    settings: {
      showLiveResults: {
        type: Boolean,
        default: true,
      },
      allowRevote: {
        type: Boolean,
        default: false,
      },
      requireAllCategories: {
        type: Boolean,
        default: false,
      },
      requireOTP: {
        type: Boolean,
        default: false,
      },
      requireAgentSignature: {
        type: Boolean,
        default: false,
      },
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    resultsApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Election) {
  delete mongoose.models.Election;
}

const Election: Model<IElection> = mongoose.model<IElection>('Election', ElectionSchema);

export default Election;
