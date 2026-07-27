import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPageView extends Document {
  path: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
  device: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  sessionId: string;
  createdAt: Date;
}

const PageViewSchema: Schema = new Schema(
  {
    path: { type: String, required: true, index: true },
    referrer: String,
    userAgent: String,
    ip: String,
    country: String,
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      default: 'desktop',
    },
    browser: String,
    sessionId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
    indexes: [
      { createdAt: -1 },
      { path: 1, createdAt: -1 },
    ],
  }
);

// TTL index: auto-delete after 90 days
PageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const PageView: Model<IPageView> =
  mongoose.models.PageView || mongoose.model<IPageView>('PageView', PageViewSchema);

export default PageView;
