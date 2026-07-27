import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAward extends Document {
  name: string;
  code: string;
  description?: string;
  organizationId: string;
  organizationName: string;
  startDate: Date;
  endDate: Date;
  votingStartDate?: Date;
  votingEndDate?: Date;
  votingStartTime?: string;
  votingEndTime?: string;
  status: 'draft' | 'active' | 'voting' | 'completed' | 'cancelled';
  banner?: string;
  logo?: string;
  categories: number;
  totalVotes: number;
  totalNominees: number;
  createdBy: string;
  winnersAnnounced?: boolean;
  winnersAnnouncedAt?: Date;
  nomination?: {
    enabled: boolean;
    type: 'free' | 'fixed' | 'category';
    fixedPrice?: number;
    startDate?: Date;
    endDate?: Date;
    startTime?: string;
    endTime?: string;
    categories?: Array<{
      id: number;
      name: string;
      price: string;
      publish: boolean;
    }>;
  };
  pricing: {
    type: 'paid' | 'social';
    votingCost?: number;
    votingFrequency?: number;
    socialOptions?: {
      normalVoting: boolean;
      bulkVoting: boolean;
      facebook: boolean;
      twitter: boolean;
    };
  };
  settings: {
    allowPublicVoting: boolean;
    requireEmailVerification: boolean;
    maxVotesPerUser: number;
    showResults: boolean;
    nominationLinkGenerated?: boolean;
  };
  awardServiceFeePercentage?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const AwardSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Award name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    organizationName: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    votingStartDate: {
      type: Date,
    },
    votingEndDate: {
      type: Date,
    },
    votingStartTime: {
      type: String,
    },
    votingEndTime: {
      type: String,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'voting', 'completed', 'cancelled'],
      default: 'draft',
    },
    banner: {
      type: String,
    },
    logo: {
      type: String,
    },
    categories: {
      type: Number,
      default: 0,
    },
    totalVotes: {
      type: Number,
      default: 0,
    },
    totalNominees: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      required: true,
    },
    winnersAnnounced: {
      type: Boolean,
      default: false,
    },
    winnersAnnouncedAt: {
      type: Date,
    },
    nomination: {
      enabled: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String,
        enum: ['free', 'fixed', 'category'],
        default: 'free',
      },
      fixedPrice: {
        type: Number,
      },
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
      startTime: {
        type: String,
      },
      endTime: {
        type: String,
      },
      categories: [{
        id: Number,
        name: String,
        price: String,
        publish: Boolean,
      }],
    },
    pricing: {
      type: {
        type: String,
        enum: ['paid', 'social'],
        default: 'paid',
      },
      votingCost: {
        type: Number,
        default: 0.5,
      },
      votingFrequency: {
        type: Number,
      },
      socialOptions: {
        normalVoting: {
          type: Boolean,
          default: false,
        },
        bulkVoting: {
          type: Boolean,
          default: false,
        },
        facebook: {
          type: Boolean,
          default: false,
        },
        twitter: {
          type: Boolean,
          default: false,
        },
      },
    },
    awardServiceFeePercentage: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    settings: {
      allowPublicVoting: {
        type: Boolean,
        default: true,
      },
      requireEmailVerification: {
        type: Boolean,
        default: false,
      },
      maxVotesPerUser: {
        type: Number,
        default: 1,
      },
      showResults: {
        type: Boolean,
        default: false,
      },
      nominationLinkGenerated: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Delete the cached model to ensure we use the latest schema
if (mongoose.models.Award) {
  delete mongoose.models.Award;
}

const Award: Model<IAward> = mongoose.model<IAward>('Award', AwardSchema);

export default Award;
