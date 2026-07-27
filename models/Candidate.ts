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
