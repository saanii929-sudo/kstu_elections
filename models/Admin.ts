import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdmin extends Document {
  username: string;
  email: string;
  password: string;
  // Optional — when set, login OTPs are sent via SMS instead of email.
  phone?: string;
  role: 'superadmin' | 'admin' | 'helpdesk' | 'electionAdmin';
  status: 'active' | 'inactive';
  // Elections this admin has been granted scoped access to — only
  // meaningful when role is 'electionAdmin'.
  assignedElections: mongoose.Types.ObjectId[];
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
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
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'helpdesk', 'electionAdmin'],
      default: 'admin',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    assignedElections: [{ type: Schema.Types.ObjectId, ref: 'Election' }],
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

const Admin: Model<IAdmin> =
  mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);

export default Admin;
