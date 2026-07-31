import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICandidate extends Document {
  electionId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  image?: string;
  bio?: string;
  manifesto?: string;
  ballotNumber: number;
  voteCount: number;
  // Only meaningful when this is the sole candidate in its category — a
  // count of voters who explicitly rejected them via the YES/NO ballot
  // choice, kept separate from voteCount so referendum results never get
  // conflated with normal candidate votes.
  noVoteCount: number;
  // Advisory oversight only — does not block the candidate from appearing on the ballot.
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema: Schema = new Schema(
  {
    electionId: {
      type: Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ElectionCategory',
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true,
    },
    image: {
      type: String,
    },
    bio: {
      type: String,
      trim: true,
    },
    manifesto: {
      type: String,
      trim: true,
    },
    ballotNumber: {
      type: Number,
      required: [true, 'Ballot number is required'],
    },
    voteCount: {
      type: Number,
      default: 0,
    },
    noVoteCount: {
      type: Number,
      default: 0,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Candidate) {
  delete mongoose.models.Candidate;
}

const Candidate: Model<ICandidate> = mongoose.model<ICandidate>('Candidate', CandidateSchema);

export default Candidate;
