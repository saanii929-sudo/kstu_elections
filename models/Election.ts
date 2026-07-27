import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IElection extends Document {
  organizationId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'ended';
  settings: {
    showLiveResults: boolean;
    allowRevote: boolean;
    requireAllCategories: boolean;
    requireOTP: boolean;
  };
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
    title: {
      type: String,
      required: [true, 'Election title is required'],
      trim: true,
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
