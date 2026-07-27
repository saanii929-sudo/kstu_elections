/**
 * Unit Tests for ContestantService
 * Feature: multi-stage-voting
 */

import mongoose from 'mongoose';
import { contestantService } from '../../services/contestant.service';
import StageContestant from '../../models/StageContestant';
import Nominee from '../../models/Nominee';
import Stage from '../../models/Stage';

jest.mock('../../lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

describe('ContestantService', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await StageContestant.deleteMany({});
    await Nominee.deleteMany({});
    await Stage.deleteMany({});
  });

  describe('addContestantsToStage', () => {
    it('should add contestants to a stage', async () => {
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();
      const stageId = new mongoose.Types.ObjectId().toString();

      // Create nominees
      const nominee1 = await Nominee.create({
        name: 'Nominee 1',
        awardId,
        categoryId,
        status: 'published',
      });

      const nominee2 = await Nominee.create({
        name: 'Nominee 2',
        awardId,
        categoryId,
        status: 'published',
      });

      const result = await contestantService.addContestantsToStage(
        stageId,
        [nominee1._id.toString(), nominee2._id.toString()],
        'initial'
      );

      expect(result).toHaveLength(2);
      expect(result[0].stageId.toString()).toBe(stageId);
      expect(result[0].addedBy).toBe('initial');
    });

    it('should prevent adding duplicate contestants', async () => {
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();
      const stageId = new mongoose.Types.ObjectId().toString();

      const nominee = await Nominee.create({
        name: 'Nominee 1',
        awardId,
        categoryId,
        status: 'published',
      });

      // Add first time
      await contestantService.addContestantsToStage(
        stageId,
        [nominee._id.toString()],
        'initial'
      );

      // Verify contestant was added
      const isInStage = await contestantService.isContestantInStage(stageId, nominee._id.toString());
      expect(isInStage).toBe(true);

      // Try to add again - should throw error
      await expect(
        contestantService.addContestantsToStage(
          stageId,
          [nominee._id.toString()],
          'initial'
        )
      ).rejects.toThrow(/Failed to add contestants/);
    });
  });

  describe('removeContestantFromStage', () => {
    it('should remove a contestant from a stage', async () => {
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();
      const stageId = new mongoose.Types.ObjectId().toString();

      const nominee = await Nominee.create({
        name: 'Nominee 1',
        awardId,
        categoryId,
        status: 'published',
      });

      await contestantService.addContestantsToStage(
        stageId,
        [nominee._id.toString()],
        'initial'
      );

      await contestantService.removeContestantFromStage(stageId, nominee._id.toString());

      const isInStage = await contestantService.isContestantInStage(stageId, nominee._id.toString());
      expect(isInStage).toBe(false);
    });

    it('should throw error when removing non-existent contestant', async () => {
      const stageId = new mongoose.Types.ObjectId().toString();
      const nomineeId = new mongoose.Types.ObjectId().toString();

      await expect(
        contestantService.removeContestantFromStage(stageId, nomineeId)
      ).rejects.toThrow('Contestant not found in this stage');
    });
  });

  describe('getStageContestants', () => {
    it('should get all contestants for a stage', async () => {
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();
      const stageId = new mongoose.Types.ObjectId().toString();

      const nominee1 = await Nominee.create({
        name: 'Nominee 1',
        awardId,
        categoryId,
        status: 'published',
      });

      const nominee2 = await Nominee.create({
        name: 'Nominee 2',
        awardId,
        categoryId,
        status: 'published',
      });

      await contestantService.addContestantsToStage(
        stageId,
        [nominee1._id.toString(), nominee2._id.toString()],
        'initial'
      );

      const contestants = await contestantService.getStageContestants(stageId);
      expect(contestants).toHaveLength(2);
    });

    it('should filter contestants by category', async () => {
      const awardId = new mongoose.Types.ObjectId();
      const category1Id = new mongoose.Types.ObjectId();
      const category2Id = new mongoose.Types.ObjectId();
      const stageId = new mongoose.Types.ObjectId().toString();

      const nominee1 = await Nominee.create({
        name: 'Nominee 1',
        awardId,
        categoryId: category1Id,
        status: 'published',
      });

      const nominee2 = await Nominee.create({
        name: 'Nominee 2',
        awardId,
        categoryId: category2Id,
        status: 'published',
      });

      await contestantService.addContestantsToStage(
        stageId,
        [nominee1._id.toString(), nominee2._id.toString()],
        'initial'
      );

      const contestants = await contestantService.getStageContestants(stageId, category1Id.toString());
      expect(contestants).toHaveLength(1);
    });
  });

  describe('isContestantInStage', () => {
    it('should return true if contestant is in stage', async () => {
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();
      const stageId = new mongoose.Types.ObjectId().toString();

      const nominee = await Nominee.create({
        name: 'Nominee 1',
        awardId,
        categoryId,
        status: 'published',
      });

      await contestantService.addContestantsToStage(
        stageId,
        [nominee._id.toString()],
        'initial'
      );

      const isInStage = await contestantService.isContestantInStage(stageId, nominee._id.toString());
      expect(isInStage).toBe(true);
    });

    it('should return false if contestant is not in stage', async () => {
      const stageId = new mongoose.Types.ObjectId().toString();
      const nomineeId = new mongoose.Types.ObjectId().toString();

      const isInStage = await contestantService.isContestantInStage(stageId, nomineeId);
      expect(isInStage).toBe(false);
    });
  });

  describe('getContestantStageHistory', () => {
    it('should get stage history for a contestant', async () => {
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();
      
      // Create stages
      const stage1 = await Stage.create({
        name: 'Stage 1',
        awardId,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting',
        qualificationRule: 'manual',
      });

      const stage2 = await Stage.create({
        name: 'Stage 2',
        awardId,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-28'),
        startTime: '09:00',
        endTime: '17:00',
        order: 2,
        stageType: 'voting',
        qualificationRule: 'manual',
      });

      const nominee = await Nominee.create({
        name: 'Nominee 1',
        awardId,
        categoryId,
        status: 'published',
      });

      await contestantService.addContestantsToStage(stage1._id.toString(), [nominee._id.toString()], 'initial');
      await contestantService.addContestantsToStage(stage2._id.toString(), [nominee._id.toString()], 'qualification', stage1._id.toString());

      const history = await contestantService.getContestantStageHistory(nominee._id.toString());
      expect(history).toHaveLength(2);
      expect(history[0].addedBy).toBe('initial');
      expect(history[1].addedBy).toBe('qualification');
    });
  });

  describe('getStageContestantsCount', () => {
    it('should return correct count of contestants', async () => {
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();
      const stageId = new mongoose.Types.ObjectId().toString();

      const nominee1 = await Nominee.create({
        name: 'Nominee 1',
        awardId,
        categoryId,
        status: 'published',
      });

      const nominee2 = await Nominee.create({
        name: 'Nominee 2',
        awardId,
        categoryId,
        status: 'published',
      });

      await contestantService.addContestantsToStage(
        stageId,
        [nominee1._id.toString(), nominee2._id.toString()],
        'initial'
      );

      const count = await contestantService.getStageContestantsCount(stageId);
      expect(count).toBe(2);
    });
  });
});
