import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IElectionVote extends Document {
  electionId: mongoose.Types.ObjectId;
  voterId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  voterToken: string;
  createdAt: Date;
}

const ElectionVoteSchema: Schema = new Schema(
  {
    electionId: {
      type: Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
      index: true,
    },
    voterId: {
      type: Schema.Types.ObjectId,
      ref: 'Voter',
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ElectionCategory',
      required: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    voterToken: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate votes per category
ElectionVoteSchema.index({ voterId: 1, categoryId: 1 }, { unique: true });

if (mongoose.models.ElectionVote) {
  delete mongoose.models.ElectionVote;
}

const ElectionVote: Model<IElectionVote> = mongoose.model<IElectionVote>(
  'ElectionVote',
  ElectionVoteSchema
);

export default ElectionVote;
