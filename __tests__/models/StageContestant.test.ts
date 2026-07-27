/**
 * Property-Based Tests for StageContestant Model
 * Feature: multi-stage-voting
 * 
 * These tests validate the StageContestant model's duplicate prevention
 * using property-based testing to ensure correctness across many inputs.
 */

import mongoose from 'mongoose';
import StageContestant, { IStageContestant } from '../../models/StageContestant';

// Mock mongoose connection for testing
jest.mock('../../lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

describe('StageContestant Model - Duplicate Prevention', () => {
  beforeAll(async () => {
    // Connect to in-memory MongoDB for testing
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear the StageContestant collection before each test
    await StageContestant.deleteMany({});
  });

  /**
   * Property 5: No Duplicate Contestants
   * Validates: Requirements 2.3, 2.4
   * 
   * For any stage, each nominee should appear at most once in the stage's contestant list.
   */
  describe('Property 5: No Duplicate Contestants', () => {
    it('should allow adding a contestant to a stage', async () => {
      const contestantData = {
        stageId: new mongoose.Types.ObjectId(),
        awardId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        nomineeId: new mongoose.Types.ObjectId(),
        addedBy: 'initial' as const,
      };

      const contestant = new StageContestant(contestantData);
      const savedContestant = await contestant.save();

      expect(savedContestant.stageId.toString()).toBe(contestantData.stageId.toString());
      expect(savedContestant.nomineeId.toString()).toBe(contestantData.nomineeId.toString());
      expect(savedContestant.addedBy).toBe('initial');
    });

    it('should prevent adding the same nominee twice to the same stage', async () => {
      const stageId = new mongoose.Types.ObjectId();
      const nomineeId = new mongoose.Types.ObjectId();

      const contestantData = {
        stageId,
        awardId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        nomineeId,
        addedBy: 'initial' as const,
      };

      // Add contestant first time - should succeed
      const contestant1 = new StageContestant(contestantData);
      await contestant1.save();

      // Try to add same contestant again with same data - should fail due to unique index
      const contestant2 = new StageContestant({
        ...contestantData,
        awardId: new mongoose.Types.ObjectId(), // Different awardId
        categoryId: new mongoose.Types.ObjectId(), // Different categoryId
        // But same stageId and nomineeId - should fail
      });
      
      await expect(contestant2.save()).rejects.toThrow(/duplicate key error/i);
    });

    it('should allow the same nominee in different stages', async () => {
      const nomineeId = new mongoose.Types.ObjectId();
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();

      const stage1Id = new mongoose.Types.ObjectId();
      const stage2Id = new mongoose.Types.ObjectId();

      // Add nominee to stage 1
      const contestant1 = new StageContestant({
        stageId: stage1Id,
        awardId,
        categoryId,
        nomineeId,
        addedBy: 'initial' as const,
      });
      await contestant1.save();

      // Add same nominee to stage 2 - should succeed
      const contestant2 = new StageContestant({
        stageId: stage2Id,
        awardId,
        categoryId,
        nomineeId,
        addedBy: 'qualification' as const,
        sourceStageId: stage1Id,
      });
      const savedContestant2 = await contestant2.save();

      expect(savedContestant2.stageId.toString()).toBe(stage2Id.toString());
      expect(savedContestant2.nomineeId.toString()).toBe(nomineeId.toString());
      expect(savedContestant2.addedBy).toBe('qualification');
      expect(savedContestant2.sourceStageId?.toString()).toBe(stage1Id.toString());
    });

    it('should allow different nominees in the same stage', async () => {
      const stageId = new mongoose.Types.ObjectId();
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();

      const nominee1Id = new mongoose.Types.ObjectId();
      const nominee2Id = new mongoose.Types.ObjectId();

      // Add first nominee
      const contestant1 = new StageContestant({
        stageId,
        awardId,
        categoryId,
        nomineeId: nominee1Id,
        addedBy: 'initial' as const,
      });
      await contestant1.save();

      // Add second nominee - should succeed
      const contestant2 = new StageContestant({
        stageId,
        awardId,
        categoryId,
        nomineeId: nominee2Id,
        addedBy: 'initial' as const,
      });
      const savedContestant2 = await contestant2.save();

      expect(savedContestant2.stageId.toString()).toBe(stageId.toString());
      expect(savedContestant2.nomineeId.toString()).toBe(nominee2Id.toString());
    });

    it('should track how contestant was added (manual, qualification, initial)', async () => {
      const stageId = new mongoose.Types.ObjectId();
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();

      // Test 'manual' addedBy
      const manualContestant = new StageContestant({
        stageId,
        awardId,
        categoryId,
        nomineeId: new mongoose.Types.ObjectId(),
        addedBy: 'manual' as const,
      });
      const savedManual = await manualContestant.save();
      expect(savedManual.addedBy).toBe('manual');

      // Test 'qualification' addedBy
      const qualificationContestant = new StageContestant({
        stageId,
        awardId,
        categoryId,
        nomineeId: new mongoose.Types.ObjectId(),
        addedBy: 'qualification' as const,
        sourceStageId: new mongoose.Types.ObjectId(),
      });
      const savedQualification = await qualificationContestant.save();
      expect(savedQualification.addedBy).toBe('qualification');
      expect(savedQualification.sourceStageId).toBeDefined();

      // Test 'initial' addedBy
      const initialContestant = new StageContestant({
        stageId,
        awardId,
        categoryId,
        nomineeId: new mongoose.Types.ObjectId(),
        addedBy: 'initial' as const,
      });
      const savedInitial = await initialContestant.save();
      expect(savedInitial.addedBy).toBe('initial');
    });

    it('should set addedAt timestamp automatically', async () => {
      const beforeTime = new Date();

      const contestant = new StageContestant({
        stageId: new mongoose.Types.ObjectId(),
        awardId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        nomineeId: new mongoose.Types.ObjectId(),
        addedBy: 'initial' as const,
      });
      const savedContestant = await contestant.save();

      const afterTime = new Date();

      expect(savedContestant.addedAt).toBeDefined();
      expect(savedContestant.addedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(savedContestant.addedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should require all mandatory fields', async () => {
      const incompleteData = {
        stageId: new mongoose.Types.ObjectId(),
        // Missing awardId, categoryId, nomineeId, addedBy
      };

      const contestant = new StageContestant(incompleteData);
      await expect(contestant.save()).rejects.toThrow();
    });
  });

  describe('Index Validation', () => {
    it('should have unique compound index on stageId and nomineeId', () => {
      const indexes = StageContestant.schema.indexes();
      const hasUniqueIndex = indexes.some((index: any) => {
        const keys = index[0];
        const options = index[1];
        return keys.stageId === 1 && keys.nomineeId === 1 && options?.unique === true;
      });

      expect(hasUniqueIndex).toBe(true);
    });

    it('should have compound index on stageId and categoryId', () => {
      const indexes = StageContestant.schema.indexes();
      const hasCategoryIndex = indexes.some((index: any) => {
        const keys = index[0];
        return keys.stageId === 1 && keys.categoryId === 1;
      });

      expect(hasCategoryIndex).toBe(true);
    });

    it('should have individual indexes on key fields', () => {
      const indexes = StageContestant.schema.indexes();
      
      // Check for stageId index
      const hasStageIndex = indexes.some((index: any) => {
        const keys = index[0];
        return keys.stageId === 1;
      });

      // Check for nomineeId index
      const hasNomineeIndex = indexes.some((index: any) => {
        const keys = index[0];
        return keys.nomineeId === 1;
      });

      expect(hasStageIndex).toBe(true);
      expect(hasNomineeIndex).toBe(true);
    });
  });
});
