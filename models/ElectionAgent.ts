import mongoose, { Document, Schema } from 'mongoose';

export interface IAgentCandidate {
  candidateId: mongoose.Types.ObjectId;
  candidateName: string;
  position: string;
}

export interface IElectionAgent extends Document {
  name: string;
  phone: string;
  electionId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  candidates: IAgentCandidate[];
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const ElectionAgentSchema = new Schema<IElectionAgent>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    electionId: { type: Schema.Types.ObjectId, ref: 'Election', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    candidates: [
      {
        candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
        candidateName: { type: String, required: true },
        position: { type: String, required: true },
      },
    ],
    password: { type: String, required: true },
  },
  { timestamps: true }
);

ElectionAgentSchema.index({ electionId: 1, organizationId: 1 });

export default mongoose.models.ElectionAgent ||
  mongoose.model<IElectionAgent>('ElectionAgent', ElectionAgentSchema);
