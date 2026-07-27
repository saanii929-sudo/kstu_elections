/**
 * Property Tests for StageService - Overlap Prevention
 * Feature: multi-stage-voting
 * Property 10: Stage Overlap Prevention
 * Validates: Requirements 1.7, 1.8, 9.1, 9.2, 9.3
 */

import mongoose from 'mongoose';
import { stageService } from '../../services/stage.service';
import Stage from '../../models/Stage';

jest.mock('../../lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

describe('StageService - Overlap Prevention', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Stage.deleteMany({});
  });

  describe('Property 10: Stage Overlap Prevention', () => {
    it('should allow creating non-overlapping stages', async () => {
      const awardId = new mongoose.Types.ObjectId().toString();

      const stage1 = await stageService.createStage({
        name: 'Stage 1',
        awardId,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting',
        qualificationRule: 'manual',
      });

      const stage2 = await stageService.createStage({
        name: 'Stage 2',
        awardId,
        startDate: '2024-02-01',
        endDate: '2024-02-28',
        startTime: '09:00',
        endTime: '17:00',
        order: 2,
        stageType: 'voting',
        qualificationRule: 'manual',
      });

      expect(stage1).toBeDefined();
      expect(stage2).toBeDefined();
    });

    it('should reject overlapping stages (same dates)', async () => {
      const awardId = new mongoose.Types.ObjectId().toString();

      await stageService.createStage({
        name: 'Stage 1',
        awardId,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting',
        qualificationRule: 'manual',
      });

      await expect(
        stageService.createStage({
          name: 'Stage 2',
          awardId,
          startDate: '2024-01-15',
          endDate: '2024-02-15',
          startTime: '09:00',
          endTime: '17:00',
          order: 2,
          stageType: 'voting',
          qualificationRule: 'manual',
        })
      ).rejects.toThrow(/overlaps/i);
    });

    it('should reject stages that start during another stage', async () => {
      const awardId = new mongoose.Types.ObjectId().toString();

      await stageService.createStage({
        name: 'Stage 1',
        awardId,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting',
        qualificationRule: 'manual',
      });

      await expect(
        stageService.createStage({
          name: 'Stage 2',
          awardId,
          startDate: '2024-01-20', // Starts during Stage 1
          endDate: '2024-02-20',
          startTime: '10:00', // Different time to ensure overlap
          endTime: '18:00',
          order: 2,
          stageType: 'voting',
          qualificationRule: 'manual',
        })
      ).rejects.toThrow(/overlaps/i);
    });

    it('should allow stages in different awards to overlap', async () => {
      const award1Id = new mongoose.Types.ObjectId().toString();
      const award2Id = new mongoose.Types.ObjectId().toString();

      const stage1 = await stageService.createStage({
        name: 'Award 1 Stage',
        awardId: award1Id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting',
        qualificationRule: 'manual',
      });

      const stage2 = await stageService.createStage({
        name: 'Award 2 Stage',
        awardId: award2Id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting',
        qualificationRule: 'manual',
      });

      expect(stage1).toBeDefined();
      expect(stage2).toBeDefined();
    });

    it('should allow updating stage without overlap', async () => {
      const awardId = new mongoose.Types.ObjectId().toString();

      const stage = await stageService.createStage({
        name: 'Stage 1',
        awardId,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting',
        qualificationRule: 'manual',
      });

      const updated = await stageService.updateStage(stage._id.toString(), {
        name: 'Updated Stage 1',
      });

      expect(updated.name).toBe('Updated Stage 1');
    });
  });

  describe('Additional StageService Methods', () => {
    it('should get active stage for an award', async () => {
      const awardId = new mongoose.Types.ObjectId().toString();

      await stageService.createStage({
        name: 'Active Stage',
        awardId,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting',
        qualificationRule: 'manual',
      });

      const stage = await Stage.findOne({ awardId });
      if (stage) {
        await stageService.updateStageStatus(stage._id.toString(), 'active');
      }

      const activeStage = await stageService.getActiveStage(awardId);
      expect(activeStage).toBeDefined();
      expect(activeStage?.status).toBe('active');
    });

    it('should get next stage in sequence', async () => {
      const awardId = new mongoose.Types.ObjectId().toString();

      const stage1 = await stageService.createStage({
        name: 'Stage 1',
        awardId,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting',
        qualificationRule: 'manual',
      });

      const stage2 = await stageService.createStage({
        name: 'Stage 2',
        awardId,
        startDate: '2024-02-01',
        endDate: '2024-02-28',
        startTime: '09:00',
        endTime: '17:00',
        order: 2,
        stageType: 'voting',
        qualificationRule: 'manual',
      });

      const nextStage = await stageService.getNextStage(stage1._id.toString());
      expect(nextStage).toBeDefined();
      if (nextStage) {
        expect(nextStage._id.toString()).toBe(stage2._id.toString());
      }
    });
  });
});
