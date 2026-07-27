import { stageService } from '@/services/stage.service';
import { contestantService } from '@/services/contestant.service';
import Stage from '@/models/Stage';
import StageContestant from '@/models/StageContestant';
import Award from '@/models/Award';
import Category from '@/models/Category';
import Nominee from '@/models/Nominee';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Helper function to create test award
const createTestAward = async (index: number = 0) => {
  return await Award.create({
    name: `Award ${index}`,
    code: `TEST${index.toString().padStart(3, '0')}`,
    description: 'Test',
    organizationId: new mongoose.Types.ObjectId().toString(),
    organizationName: 'Test Org',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    createdBy: new mongoose.Types.ObjectId().toString(),
  });
};

describe('Stage Management API Integration', () => {
  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Stage.deleteMany({});
    await StageContestant.deleteMany({});
    await Award.deleteMany({});
    await Category.deleteMany({});
    await Nominee.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Stage Creation with Qualification Rules', () => {
    it('should create stage with topN qualification rule', async () => {
      const award = await createTestAward(0);

      const stageData = {
        name: 'Preliminary Round',
        awardId: award._id.toString(),
        startDate: new Date('2024-06-01'),
        startTime: '00:00',
        endDate: new Date('2024-06-30'),
        endTime: '23:59',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'topN' as const,
        qualificationCount: 10,
      };

      const stage = await stageService.createStage(stageData);

      expect(stage).toBeTruthy();
      expect(stage.qualificationRule).toBe('topN');
      expect(stage.qualificationCount).toBe(10);
    });

    it('should create stage with threshold qualification rule', async () => {
      const award = await createTestAward(0);

      const stageData = {
        name: 'Preliminary Round',
        awardId: award._id.toString(),
        startDate: new Date('2024-06-01'),
        startTime: '00:00',
        endDate: new Date('2024-06-30'),
        endTime: '23:59',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'threshold' as const,
        qualificationThreshold: 100,
      };

      const stage = await stageService.createStage(stageData);

      expect(stage).toBeTruthy();
      expect(stage.qualificationRule).toBe('threshold');
      expect(stage.qualificationThreshold).toBe(100);
    });

    it('should reject overlapping stages', async () => {
      const award = await createTestAward(0);

      // Create first stage
      await stageService.createStage({
        name: 'Stage 1',
        awardId: award._id.toString(),
        startDate: new Date('2024-06-01'),
        startTime: '00:00',
        endDate: new Date('2024-06-30'),
        endTime: '23:59',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'manual' as const,
      });

      // Try to create overlapping stage
      await expect(
        stageService.createStage({
          name: 'Stage 2',
          awardId: award._id.toString(),
          startDate: new Date('2024-06-15'),
          startTime: '00:00',
          endDate: new Date('2024-07-15'),
          endTime: '23:59',
          order: 2,
          stageType: 'voting' as const,
          qualificationRule: 'manual' as const,
        })
      ).rejects.toThrow(/overlap/i);
    });
  });

  describe('Contestant Management', () => {
    it('should add contestants to stage', async () => {
      const award = await createTestAward(0);
      const category = await Category.create({
        name: 'Test Category',
        awardId: award._id.toString(),
        awardName: award.name,
        organizationId: award.organizationId,
      });

      const nominees = await Nominee.create([
        { name: 'Nominee 1', categoryId: category._id, awardId: award._id },
        { name: 'Nominee 2', categoryId: category._id, awardId: award._id },
      ]);

      const stage = await stageService.createStage({
        name: 'Stage 1',
        awardId: award._id.toString(),
        startDate: new Date('2024-06-01'),
        startTime: '00:00',
        endDate: new Date('2024-06-30'),
        endTime: '23:59',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'manual' as const,
      });

      const result = await contestantService.addContestantsToStage(
        stage._id.toString(),
        nominees.map((n) => n._id.toString()),
        'initial'
      );

      expect(result).toHaveLength(2);

      const contestants = await contestantService.getStageContestants(
        stage._id.toString()
      );
      expect(contestants).toHaveLength(2);
    });

    it('should prevent duplicate contestants', async () => {
      const award = await createTestAward(0);
      const category = await Category.create({
        name: 'Test Category',
        awardId: award._id.toString(),
        awardName: award.name,
        organizationId: award.organizationId,
      });

      const nominee = await Nominee.create({
        name: 'Nominee 1',
        categoryId: category._id,
        awardId: award._id,
      });

      const stage = await stageService.createStage({
        name: 'Stage 1',
        awardId: award._id.toString(),
        startDate: new Date('2024-06-01'),
        startTime: '00:00',
        endDate: new Date('2024-06-30'),
        endTime: '23:59',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'manual' as const,
      });

      // Add contestant first time
      const result1 = await contestantService.addContestantsToStage(
        stage._id.toString(),
        [nominee._id.toString()],
        'initial'
      );

      expect(result1).toHaveLength(1);

      // Try to add same contestant again - should throw error
      await expect(
        contestantService.addContestantsToStage(
          stage._id.toString(),
          [nominee._id.toString()],
          'manual'
        )
      ).rejects.toThrow(/already exists/i);

      // Verify only one contestant in stage
      const contestants = await contestantService.getStageContestants(
        stage._id.toString()
      );
      expect(contestants).toHaveLength(1);
    });

    it('should remove contestant from stage', async () => {
      const award = await createTestAward(0);
      const category = await Category.create({
        name: 'Test Category',
        awardId: award._id.toString(),
        awardName: award.name,
        organizationId: award.organizationId,
      });

      const nominee = await Nominee.create({
        name: 'Nominee 1',
        categoryId: category._id,
        awardId: award._id,
      });

      const stage = await stageService.createStage({
        name: 'Stage 1',
        awardId: award._id.toString(),
        startDate: new Date('2024-06-01'),
        startTime: '00:00',
        endDate: new Date('2024-06-30'),
        endTime: '23:59',
        order: 1,
        stageType: 'voting' as const,
        qualificationRule: 'manual' as const,
      });

      await contestantService.addContestantsToStage(
        stage._id.toString(),
        [nominee._id.toString()],
        'initial'
      );

      // Verify contestant is in stage
      const isInStage = await contestantService.isContestantInStage(
        stage._id.toString(),
        nominee._id.toString()
      );
      expect(isInStage).toBe(true);

      // Remove contestant
      await contestantService.removeContestantFromStage(
        stage._id.toString(),
        nominee._id.toString()
      );

      // Verify contestant is no longer in stage
      const isStillInStage = await contestantService.isContestantInStage(
        stage._id.toString(),
        nominee._id.toString()
      );
      expect(isStillInStage).toBe(false);
    });
  });

  describe('Active Stage Retrieval', () => {
    it('should get active stage for award', async () => {
      const award = await createTestAward(0);

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Create active stage
      const activeStage = await stageService.createStage({
        name: 'Active Stage',
        awardId: award._id.toString(),
        startDate: yesterday,
        startTime: '00:00',
        endDate: tomorrow,
        endTime: '23:59',
        order: 1,
        stageType: 'voting' as const,
        status: 'active',
        qualificationRule: 'manual' as const,
      });

      // Create upcoming stage (non-overlapping)
      await stageService.createStage({
        name: 'Upcoming Stage',
        awardId: award._id.toString(),
        startDate: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
        startTime: '00:00',
        endDate: nextWeek,
        endTime: '23:59',
        order: 2,
        stageType: 'voting' as const,
        status: 'upcoming',
        qualificationRule: 'manual' as const,
      });

      const retrieved = await stageService.getActiveStage(award._id.toString());

      expect(retrieved).toBeTruthy();
      expect(retrieved?._id.toString()).toBe(activeStage._id.toString());
      expect(retrieved?.status).toBe('active');
    });

    it('should return null when no active stage exists', async () => {
      const award = await createTestAward(0);

      const activeStage = await stageService.getActiveStage(award._id.toString());

      expect(activeStage).toBeNull();
    });
  });
});
