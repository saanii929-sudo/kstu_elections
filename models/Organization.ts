import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  logo?: string;
  eventType: 'awards' | 'election';
  status: 'active' | 'inactive' | 'suspended';
  subscriptionPlan?: string;
  serviceFeePercentage: number;
  createdBy: string;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    eventType: {
      type: String,
      enum: ['awards', 'election'],
      default: 'election',
    },
    socialMedia: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      twitter: { type: String, trim: true },
      tiktok: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    subscriptionPlan: {
      type: String,
      default: 'free',
    },
    serviceFeePercentage: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    createdBy: {
      type: String,
      default: 'superadmin',
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpiry: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Delete existing model if it exists to avoid caching issues
if (mongoose.models.Organization) {
  delete mongoose.models.Organization;
}

const Organization: Model<IOrganization> = mongoose.model<IOrganization>('Organization', OrganizationSchema);

export default Organization;
