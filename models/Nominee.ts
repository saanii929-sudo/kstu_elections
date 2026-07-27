import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INominee extends Document {
  name: string;
  nomineeCode?: string;
  awardId: string;
  categoryId: string;
  image?: string;
  bio?: string;
  email?: string;
  phone?: string;
  status: 'draft' | 'published' | 'accepted' | 'rejected' | 'cancelled';
  nominationStatus: 'pending' | 'accepted' | 'rejected';
  nominationType: 'organizer' | 'self';
  voteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const NomineeSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Nominee name is required'],
      trim: true,
    },
    nomineeCode: {
      type: String,
      unique: true,
      sparse: true, // Allows null values to not be unique
      uppercase: true,
      trim: true,
    },
    awardId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Award ID is required'],
      ref: 'Award',
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Category ID is required'],
      ref: 'Category',
    },
    image: String,
    bio: String,
    email: String,
    phone: String,
    status: {
      type: String,
      enum: ['draft', 'published', 'accepted', 'rejected', 'cancelled'],
      default: 'draft',
    },
    nominationStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    nominationType: {
      type: String,
      enum: ['organizer', 'self'],
      default: 'organizer',
    },
    voteCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    indexes: [{ awardId: 1 }, { categoryId: 1 }, { status: 1 }, { nomineeCode: 1 }],
  }
);

const Nominee: Model<INominee> =
  mongoose.models.Nominee || mongoose.model<INominee>('Nominee', NomineeSchema);

export default Nominee;
