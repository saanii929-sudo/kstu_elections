import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IElectionCategory extends Document {
  electionId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  order: number;
  maxSelections: number;
  createdAt: Date;
  updatedAt: Date;
}

const ElectionCategorySchema: Schema = new Schema(
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
      required: [true, 'Category name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    maxSelections: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.ElectionCategory) {
  delete mongoose.models.ElectionCategory;
}

const ElectionCategory: Model<IElectionCategory> = mongoose.model<IElectionCategory>(
  'ElectionCategory',
  ElectionCategorySchema
);

export default ElectionCategory;
