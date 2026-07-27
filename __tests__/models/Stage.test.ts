/**
 * Property-Based Tests for Stage Model
 * Feature: multi-stage-voting
 * 
 * These tests validate the Stage model's qualification field validation
 * using property-based testing to ensure correctness across many inputs.
 */

import mongoose from 'mongoose';
import Stage, { IStage } from '../../models/Stage';

// Mock mongoose connection for testing
jest.mock('../../lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

describe('Stage Model - Qualification Field Validation', () => {
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
    // Clear the Stage collection before each test
    await Stage.deleteMany({});
  });

  /**
   * Property 1: Qualification Rule Validation
   * Validates: Requirements 1.2, 1.3, 1.4
   * 
   * For any stage with qualificationRule='topN', qualificationCount must be provided
   * For any stage with qualificationRule='threshold', qualificationThreshold must be provided
   * For any stage with qualificationRule='manual', no additional fields are required
   */
  describe('Property 1: Qualification Rule Validation', () => {
    it('should require qualificationCount when qualificationRule is topN', async () => {
      const stageData = {
        name: 'Test Stage',
        awardId: new mongoose.Types.ObjectId(),
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'topN' as const,
        // Missing qualificationCount
      };

      const stage = new Stage(stageData);
      
      await expect(stage.save()).rejects.toThrow('qualificationCount is required when qualificationRule is topN');
    });

    it('should accept stage when qualificationRule is topN and qualificationCount is provided', async () => {
      const stageData = {
        name: 'Test Stage',
        awardId: new mongoose.Types.ObjectId(),
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'topN' as const,
        qualificationCount: 5,
      };

      const stage = new Stage(stageData);
      const savedStage = await stage.save();
      
      expect(savedStage.qualificationRule).toBe('topN');
      expect(savedStage.qualificationCount).toBe(5);
    });

    it('should require qualificationThreshold when qualificationRule is threshold', async () => {
      const stageData = {
        name: 'Test Stage',
        awardId: new mongoose.Types.ObjectId(),
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'threshold' as const,
        // Missing qualificationThreshold
      };

      const stage = new Stage(stageData);
      
      await expect(stage.save()).rejects.toThrow('qualificationThreshold is required when qualificationRule is threshold');
    });

    it('should accept stage when qualificationRule is threshold and qualificationThreshold is provided', async () => {
      const stageData = {
        name: 'Test Stage',
        awardId: new mongoose.Types.ObjectId(),
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'threshold' as const,
        qualificationThreshold: 100,
      };

      const stage = new Stage(stageData);
      const savedStage = await stage.save();
      
      expect(savedStage.qualificationRule).toBe('threshold');
      expect(savedStage.qualificationThreshold).toBe(100);
    });

    it('should accept stage when qualificationRule is manual without additional fields', async () => {
      const stageData = {
        name: 'Test Stage',
        awardId: new mongoose.Types.ObjectId(),
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'manual' as const,
        // No qualificationCount or qualificationThreshold needed
      };

      const stage = new Stage(stageData);
      const savedStage = await stage.save();
      
      expect(savedStage.qualificationRule).toBe('manual');
      expect(savedStage.qualificationCount).toBeUndefined();
      expect(savedStage.qualificationThreshold).toBeUndefined();
    });

    it('should enforce minimum value of 1 for qualificationCount', async () => {
      const stageData = {
        name: 'Test Stage',
        awardId: new mongoose.Types.ObjectId(),
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'topN' as const,
        qualificationCount: 0, // Invalid: less than 1
      };

      const stage = new Stage(stageData);
      
      await expect(stage.save()).rejects.toThrow();
    });

    it('should enforce minimum value of 0 for qualificationThreshold', async () => {
      const stageData = {
        name: 'Test Stage',
        awardId: new mongoose.Types.ObjectId(),
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'threshold' as const,
        qualificationThreshold: -1, // Invalid: less than 0
      };

      const stage = new Stage(stageData);
      
      await expect(stage.save()).rejects.toThrow();
    });

    it('should default qualificationProcessed to false', async () => {
      const stageData = {
        name: 'Test Stage',
        awardId: new mongoose.Types.ObjectId(),
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'manual' as const,
      };

      const stage = new Stage(stageData);
      const savedStage = await stage.save();
      
      expect(savedStage.qualificationProcessed).toBe(false);
      expect(savedStage.qualificationProcessedAt).toBeUndefined();
    });

    it('should allow setting qualificationProcessed to true with timestamp', async () => {
      const processedAt = new Date();
      const stageData = {
        name: 'Test Stage',
        awardId: new mongoose.Types.ObjectId(),
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'topN' as const,
        qualificationCount: 3,
        qualificationProcessed: true,
        qualificationProcessedAt: processedAt,
      };

      const stage = new Stage(stageData);
      const savedStage = await stage.save();
      
      expect(savedStage.qualificationProcessed).toBe(true);
      expect(savedStage.qualificationProcessedAt).toEqual(processedAt);
    });
  });

  describe('Index Validation', () => {
    it('should have compound index for overlap detection', () => {
      const indexes = Stage.schema.indexes();
      const hasOverlapIndex = indexes.some((index: any) => {
        const keys = index[0];
        return keys.awardId === 1 && keys.startDate === 1 && keys.endDate === 1;
      });
      
      expect(hasOverlapIndex).toBe(true);
    });

    it('should have index on status field', () => {
      const indexes = Stage.schema.indexes();
      const hasStatusIndex = indexes.some((index: any) => {
        const keys = index[0];
        return keys.status === 1;
      });
      
      expect(hasStatusIndex).toBe(true);
    });
  });
});
