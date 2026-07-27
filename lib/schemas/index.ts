import { z } from 'zod';

export const createAwardSchema = z.object({
  name: z.string().min(3, 'Award name must be at least 3 characters'),
  description: z.string().optional(),
  image: z.string().url().optional(),
  showResults: z.boolean().default(false),
  votingStartDate: z.string().datetime(),
  votingEndDate: z.string().datetime(),
  votingStartTime: z.string(),
  votingEndTime: z.string(),
  nominationEnabled: z.boolean().default(false),
  nominationType: z.enum(['free', 'paid']).optional(),
  nominationFixedPrice: z.number().optional(),
  nominationStartDate: z.string().datetime().optional(),
  nominationEndDate: z.string().datetime().optional(),
  pricingType: z.enum(['paid', 'free']).default('paid'),
  votingCost: z.number().default(0.5),
  socialVotingEnabled: z.boolean().default(false),
  bulkVotingEnabled: z.boolean().default(false),
  normalVotingEnabled: z.boolean().default(true),
  facebookEnabled: z.boolean().default(false),
  twitterEnabled: z.boolean().default(false),
  votingFrequency: z.string().optional(),
  published: z.boolean().default(false),
});

export const updateAwardSchema = createAwardSchema.partial();

// Category schemas
export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  awardId: z.string().min(1, 'Award ID is required'),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'closed']).default('draft'),
});

export const updateCategorySchema = createCategorySchema.partial();

// Nominee schemas
export const createNomineeSchema = z.object({
  name: z.string().min(2, 'Nominee name is required'),
  awardId: z.string().min(1, 'Award ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  image: z.string().url().optional(),
  bio: z.string().optional(),
  status: z
    .enum(['draft', 'published', 'accepted', 'rejected', 'cancelled'])
    .default('draft'),
});

export const updateNomineeSchema = createNomineeSchema.partial();

// Vote schemas
export const createVoteSchema = z.object({
  nomineeId: z.string().min(1, 'Nominee ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  awardId: z.string().min(1, 'Award ID is required'),
  stageId: z.string().optional(),
  voteCount: z.number().min(1, 'Vote count must be at least 1'),
  type: z.enum(['normal', 'bulk']).default('normal'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  paymentId: z.string().optional(),
});

// Payment schemas
export const createPaymentSchema = z.object({
  nomineeId: z.string().min(1, 'Nominee ID is required'),
  awardId: z.string().min(1, 'Award ID is required'),
  paymentMethod: z.enum(['mobile_money', 'bank_transfer', 'card', 'manual']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  voteCount: z.number().min(1, 'Vote count must be at least 1'),
  reference: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Stage schemas
export const createStageSchema = z.object({
  name: z.string().min(2, 'Stage name is required'),
  awardId: z.string().min(1, 'Award ID is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  startTime: z.string(),
  endTime: z.string(),
  order: z.number().min(1),
  stageType: z.enum(['nomination', 'voting', 'results']),
  qualificationRule: z.enum(['topN', 'threshold', 'manual']).default('manual'),
  qualificationCount: z.number().min(1).optional(),
  qualificationThreshold: z.number().min(1).optional(),
}).refine(
  (data) => {
    if (data.qualificationRule === 'topN' && !data.qualificationCount) {
      return false;
    }
    if (data.qualificationRule === 'threshold' && !data.qualificationThreshold) {
      return false;
    }
    return true;
  },
  {
    message: 'qualificationCount is required for topN rule, qualificationThreshold is required for threshold rule',
  }
);

export const updateStageSchema = z.object({
  name: z.string().min(2, 'Stage name is required').optional(),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required').optional(),
  endDate: z.string().min(1, 'End date is required').optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  order: z.number().min(1).optional(),
  stageType: z.enum(['nomination', 'voting', 'results']).optional(),
  qualificationRule: z.enum(['topN', 'threshold', 'manual']).optional(),
  qualificationCount: z.number().min(1).optional(),
  qualificationThreshold: z.number().min(1).optional(),
}).refine(
  (data) => {
    if (data.qualificationRule === 'topN' && !data.qualificationCount) {
      return false;
    }
    if (data.qualificationRule === 'threshold' && !data.qualificationThreshold) {
      return false;
    }
    return true;
  },
  {
    message: 'qualificationCount is required for topN rule, qualificationThreshold is required for threshold rule',
  }
);

// Bulk Vote Package schemas
export const createBulkVotePackageSchema = z.object({
  awardId: z.string().min(1, 'Award ID is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  votes: z.number().min(1, 'Vote count must be at least 1'),
  currency: z.string().default('GHS'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateBulkVotePackageSchema = createBulkVotePackageSchema.partial();

// Transfer schemas
export const createTransferSchema = z.object({
  awardId: z.string().min(1, 'Award ID is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  recipientName: z.string().min(2, 'Recipient name is required'),
  recipientBank: z.string().optional(),
  recipientAccountNumber: z.string().optional(),
  recipientPhoneNumber: z.string().optional(),
  transferType: z.enum(['bank', 'momo']),
  notes: z.string().optional(),
});

// Organization Admin schemas
export const createOrganizationAdminSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  adminId: z.string().min(1, 'Admin ID is required'),
  role: z.enum(['owner', 'manager', 'editor']).default('editor'),
});

export const updateOrganizationAdminSchema = createOrganizationAdminSchema.partial();

// Voter schemas
export const createVoterSchema = z.object({
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  name: z.string().optional(),
  awardId: z.string().min(1, 'Award ID is required'),
});

export const updateVoterSchema = createVoterSchema.partial();

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  userType: z.enum(['superadmin', 'admin', 'organization']),
});

export const organizationRegistrationSchema = z.object({
  name: z.string().min(2, 'Organization name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
});

// Type exports for easier usage
export type CreateAwardInput = z.infer<typeof createAwardSchema>;
export type UpdateAwardInput = z.infer<typeof updateAwardSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateNomineeInput = z.infer<typeof createNomineeSchema>;
export type UpdateNomineeInput = z.infer<typeof updateNomineeSchema>;
export type CreateVoteInput = z.infer<typeof createVoteSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type CreateBulkVotePackageInput = z.infer<typeof createBulkVotePackageSchema>;
export type UpdateBulkVotePackageInput = z.infer<typeof updateBulkVotePackageSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type CreateOrganizationAdminInput = z.infer<
  typeof createOrganizationAdminSchema
>;
export type UpdateOrganizationAdminInput = z.infer<
  typeof updateOrganizationAdminSchema
>;
export type CreateVoterInput = z.infer<typeof createVoterSchema>;
export type UpdateVoterInput = z.infer<typeof updateVoterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OrganizationRegistrationInput = z.infer<
  typeof organizationRegistrationSchema
>;
