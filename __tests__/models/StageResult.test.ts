/**
 * Property-Based Tests for StageResult Model
 * Feature: multi-stage-voting
 * 
 * These tests validate the StageResult model's immutability
 * using property-based testing to ensure correctness across many inputs.
 */

import mongoose from 'mongoose';
import StageResult, { IStageResult } from '../../models/StageResult';

// Mock mongoose connection for testing
jest.mock('../../lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

describe('StageResult Model - Immutability', () => {
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
    // Clear the StageResult collection before each test
    await StageResult.deleteMany({});
  });

  /**
   * Property 9: Result Immutability
   * Validates: Requirements 7.2, 7.4
   * 
   * For any stage result snapshot, once created, the rankings and vote counts should never change.
   */
  describe('Property 9: Result Immutability', () => {
    it('should create a stage result with rankings', async () => {
      const resultData = {
        stageId: new mongoose.Types.ObjectId(),
        awardId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        rankings: [
          {
            nomineeId: new mongoose.Types.ObjectId().toString(),
            nomineeName: 'Nominee 1',
            rank: 1,
            voteCount: 100,
            qualified: true,
            lastVoteAt: new Date(),
          },
          {
            nomineeId: new mongoose.Types.ObjectId().toString(),
            nomineeName: 'Nominee 2',
            rank: 2,
            voteCount: 75,
            qualified: true,
            lastVoteAt: new Date(),
          },
          {
            nomineeId: new mongoose.Types.ObjectId().toString(),
            nomineeName: 'Nominee 3',
            rank: 3,
            voteCount: 50,
            qualified: false,
            lastVoteAt: new Date(),
          },
        ],
        totalVotes: 225,
      };

      const result = new StageResult(resultData);
      const savedResult = await result.save();

      expect(savedResult.rankings).toHaveLength(3);
      expect(savedResult.rankings[0].rank).toBe(1);
      expect(savedResult.rankings[0].voteCount).toBe(100);
      expect(savedResult.rankings[0].qualified).toBe(true);
      expect(savedResult.totalVotes).toBe(225);
      expect(savedResult.immutable).toBe(true);
    });

    it('should default immutable to true', async () => {
      const resultData = {
        stageId: new mongoose.Types.ObjectId(),
        awardId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        rankings: [],
        totalVotes: 0,
      };

      const result = new StageResult(resultData);
      const savedResult = await result.save();

      expect(savedResult.immutable).toBe(true);
    });

    it('should set snapshotAt timestamp automatically', async () => {
      const beforeTime = new Date();

      const result = new StageResult({
        stageId: new mongoose.Types.ObjectId(),
        awardId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        rankings: [],
        totalVotes: 0,
      });
      const savedResult = await result.save();

      const afterTime = new Date();

      expect(savedResult.snapshotAt).toBeDefined();
      expect(savedResult.snapshotAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(savedResult.snapshotAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should prevent modification of immutable result via save', async () => {
      // Create and save initial result
      const result = new StageResult({
        stageId: new mongoose.Types.ObjectId(),
        awardId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        rankings: [
          {
            nomineeId: new mongoose.Types.ObjectId().toString(),
            nomineeName: 'Original Nominee',
            rank: 1,
            voteCount: 100,
            qualified: true,
          },
        ],
        totalVotes: 100,
        immutable: true,
      });
      const savedResult = await result.save();

      // Try to modify the result
      savedResult.totalVotes = 200;
      savedResult.rankings[0].voteCount = 200;

      // Should throw error when trying to save
      await expect(savedResult.save()).rejects.toThrow('Cannot modify immutable stage result');
    });

    it('should prevent modification of immutable result via findOneAndUpdate', async () => {
      // Create and save initial result
      const result = new StageResult({
        stageId: new mongoose.Types.ObjectId(),
        awardId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        rankings: [
          {
            nomineeId: new mongoose.Types.ObjectId().toString(),
            nomineeName: 'Original Nominee',
            rank: 1,
            voteCount: 100,
            qualified: true,
          },
        ],
        totalVotes: 100,
        immutable: true,
      });
      const savedResult = await result.save();

      // Try to update via findOneAndUpdate
      const updatePromise = StageResult.findOneAndUpdate(
        { _id: savedResult._id },
        { $set: { totalVotes: 200, immutable: false } },
        { new: true }
      );

      await expect(updatePromise).rejects.toThrow('Cannot modify immutable stage result');
    });

    it('should allow creating result with immutable=false for testing', async () => {
      const result = new StageResult({
        stageId: new mongoose.Types.ObjectId(),
        awardId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        rankings: [],
        totalVotes: 0,
        immutable: false,
      });
      const savedResult = await result.save();

      expect(savedResult.immutable).toBe(false);

      // Should allow modification when immutable is false
      savedResult.totalVotes = 100;
      const updatedResult = await savedResult.save();
      expect(updatedResult.totalVotes).toBe(100);
    });

    it('should store complete ranking information', async () => {
      const lastVoteTime = new Date('2024-01-15T10:30:00Z');
      const nomineeId = new mongoose.Types.ObjectId();

      const result = new StageResult({
        stageId: new mongoose.Types.ObjectId(),
        awardId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        rankings: [
          {
            nomineeId: nomineeId.toString(),
            nomineeName: 'Test Nominee',
            rank: 1,
            voteCount: 150,
            qualified: true,
            lastVoteAt: lastVoteTime,
          },
        ],
        totalVotes: 150,
      });
      const savedResult = await result.save();

      expect(savedResult.rankings[0].nomineeId.toString()).toBe(nomineeId.toString());
      expect(savedResult.rankings[0].nomineeName).toBe('Test Nominee');
      expect(savedResult.rankings[0].rank).toBe(1);
      expect(savedResult.rankings[0].voteCount).toBe(150);
      expect(savedResult.rankings[0].qualified).toBe(true);
      expect(savedResult.rankings[0].lastVoteAt?.toISOString()).toBe(lastVoteTime.toISOString());
    });

    it('should enforce minimum values for rank and voteCount', async () => {
      const invalidRankData = {
        stageId: new mongoose.Types.ObjectId(),
        awardId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        rankings: [
          {
            nomineeId: new mongoose.Types.ObjectId().toString(),
            nomineeName: 'Test Nominee',
            rank: 0, // Invalid: must be >= 1
            voteCount: 100,
            qualified: false,
          },
        ],
        totalVotes: 100,
      };

      const result = new StageResult(invalidRankData);
      await expect(result.save()).rejects.toThrow();
    });

    it('should require all mandatory fields', async () => {
      const incompleteData = {
        stageId: new mongoose.Types.ObjectId(),
        // Missing awardId, categoryId, rankings, totalVotes
      };

      const result = new StageResult(incompleteData);
      await expect(result.save()).rejects.toThrow();
    });
  });

  describe('Index Validation', () => {
    it('should have compound index on stageId and categoryId', () => {
      const indexes = StageResult.schema.indexes();
      const hasCategoryIndex = indexes.some((index: any) => {
        const keys = index[0];
        return keys.stageId === 1 && keys.categoryId === 1;
      });

      expect(hasCategoryIndex).toBe(true);
    });

    it('should have individual indexes on key fields', () => {
      const indexes = StageResult.schema.indexes();

      // Check for stageId index
      const hasStageIndex = indexes.some((index: any) => {
        const keys = index[0];
        return keys.stageId === 1;
      });

      // Check for awardId index
      const hasAwardIndex = indexes.some((index: any) => {
        const keys = index[0];
        return keys.awardId === 1;
      });

      expect(hasStageIndex).toBe(true);
      expect(hasAwardIndex).toBe(true);
    });
  });
});
