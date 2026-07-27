import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHelpDeskUser extends Document {
  username: string;
  email: string;
  password: string;
  assignedElections: mongoose.Types.ObjectId[];
  organizationId: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const HelpDeskUserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    assignedElections: [{
      type: Schema.Types.ObjectId,
      ref: 'Election',
    }],
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const HelpDeskUser: Model<IHelpDeskUser> =
  mongoose.models.HelpDeskUser || mongoose.model<IHelpDeskUser>('HelpDeskUser', HelpDeskUserSchema);

export default HelpDeskUser;
