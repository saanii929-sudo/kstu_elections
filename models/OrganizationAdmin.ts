import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrgMembership {
  organizationId: mongoose.Types.ObjectId;
  organizationName: string;
  assignedAwards: mongoose.Types.ObjectId[];
  assignedEvents: mongoose.Types.ObjectId[];
  invitedBy: mongoose.Types.ObjectId;
  status: 'pending' | 'active' | 'inactive';
  invitationToken?: string;
  invitationExpiry?: Date;
}

export interface IOrganizationAdmin extends Document {
  // Array of all org IDs this admin belongs to (enables MongoDB array-in queries)
  organizationId: mongoose.Types.ObjectId[];
  name: string;
  email: string;
  password: string;
  role: 'admin';
  // Overall status: active if at least one org membership is active
  status: 'pending' | 'active' | 'inactive';
  // Per-org membership details (includes ALL orgs, primary + additional)
  organizations: IOrgMembership[];
  invitedBy: mongoose.Types.ObjectId;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrgMembershipSchema = new Schema<IOrgMembership>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    organizationName: { type: String, required: true },
    assignedAwards: [{ type: Schema.Types.ObjectId, ref: 'Award' }],
    assignedEvents: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    invitedBy: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    status: { type: String, enum: ['pending', 'active', 'inactive'], default: 'pending' },
    invitationToken: { type: String },
    invitationExpiry: { type: Date },
  },
  { _id: false }
);

const OrganizationAdminSchema: Schema = new Schema(
  {
    // Array of all org IDs — MongoDB's { organizationId: someId } query
    // automatically matches documents where the array contains that value
    organizationId: [{ type: Schema.Types.ObjectId, ref: 'Organization' }],
    name: {
      type: String,
      required: [true, 'Name is required'],
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
    },
    role: {
      type: String,
      default: 'admin',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive'],
      default: 'pending',
    },
    organizations: {
      type: [OrgMembershipSchema],
      default: [],
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: Date },
  },
  { timestamps: true }
);

// Delete existing model if it exists (enables hot-reload in dev)
if (mongoose.models.OrganizationAdmin) {
  delete mongoose.models.OrganizationAdmin;
}

const OrganizationAdmin: Model<IOrganizationAdmin> = mongoose.model<IOrganizationAdmin>(
  'OrganizationAdmin',
  OrganizationAdminSchema
);

export default OrganizationAdmin;
