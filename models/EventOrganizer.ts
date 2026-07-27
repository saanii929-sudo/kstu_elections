import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEventOrganizer extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'event-organizer';
  status: 'active' | 'inactive' | 'suspended';
  createdBy: string;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EventOrganizerSchema: Schema = new Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: [true, 'Password is required'] },
    phone: { type: String, trim: true },
    role: { type: String, default: 'event-organizer' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    createdBy: { type: String, required: true },
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: Date },
  },
  { timestamps: true }
);

const EventOrganizer: Model<IEventOrganizer> =
  (mongoose.models.EventOrganizer as Model<IEventOrganizer>) ||
  mongoose.model<IEventOrganizer>('EventOrganizer', EventOrganizerSchema);

export default EventOrganizer;
