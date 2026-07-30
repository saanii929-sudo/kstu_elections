import mongoose, { Schema, Document, Model } from 'mongoose';

// Backs lib/rate-limit.ts. A MongoDB-backed counter (rather than the plain
// in-memory Map this replaced) survives process restarts and is shared
// across every app instance — the in-memory version reset on every deploy
// and couldn't coordinate limits if this were ever scaled beyond one
// container.
export interface IRateLimitCounter extends Document {
  key: string;
  count: number;
  resetTime: Date;
}

const RateLimitCounterSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  resetTime: { type: Date, required: true },
});

// TTL cleanup only — MongoDB's background sweep runs roughly every 60s, so
// this is housekeeping, not the enforcement mechanism (checkRateLimit's own
// resetTime comparison is what actually gates requests in real time).
RateLimitCounterSchema.index({ resetTime: 1 }, { expireAfterSeconds: 0 });

if (mongoose.models.RateLimitCounter) {
  delete mongoose.models.RateLimitCounter;
}

const RateLimitCounter: Model<IRateLimitCounter> = mongoose.model<IRateLimitCounter>(
  'RateLimitCounter',
  RateLimitCounterSchema
);

export default RateLimitCounter;
