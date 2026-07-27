import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPinkSheet extends Document {
  electionId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  signatures: Record<string, string>;
  dates: Record<string, string>;
  decisions: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const PinkSheetSchema = new Schema<IPinkSheet>(
  {
    electionId: { type: Schema.Types.ObjectId, ref: 'Election', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    signatures: { type: Schema.Types.Mixed, default: {} },
    dates: { type: Schema.Types.Mixed, default: {} },
    decisions: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PinkSheetSchema.index({ electionId: 1, organizationId: 1 }, { unique: true });

const PinkSheet: Model<IPinkSheet> =
  mongoose.models.PinkSheet || mongoose.model<IPinkSheet>('PinkSheet', PinkSheetSchema);

export default PinkSheet;
