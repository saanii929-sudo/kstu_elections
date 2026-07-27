import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVote extends Document {
  awardId: string;
  categoryId: string;
  nomineeId: string;
  stageId?: string;
  voterEmail: string;
  voterPhone: string;
  numberOfVotes: number;
  amount: number;
  bulkPackageId?: string;
  paymentReference: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VoteSchema: Schema = new Schema(
  {
    awardId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Award',
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Category',
      index: true,
    },
    nomineeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Nominee',
      index: true,
    },
    stageId: {
      type: Schema.Types.ObjectId,
      ref: 'Stage',
      index: true,
      required: false,
    },
    voterEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    voterPhone: {
      type: String,
      required: true,
      trim: true,
    },
    numberOfVotes: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    bulkPackageId: {
      type: Schema.Types.ObjectId,
      ref: 'BulkVotePackage',
      required: false,
      index: true,
    },
    paymentReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      default: 'mobile_money',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for stage-specific vote queries
VoteSchema.index({ stageId: 1, categoryId: 1, nomineeId: 1 });

const Vote: Model<IVote> =
  mongoose.models.Vote || mongoose.model<IVote>('Vote', VoteSchema);

export default Vote;
