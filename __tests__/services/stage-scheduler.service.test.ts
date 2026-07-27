import { stageScheduler } from '@/services/stage-scheduler.service';
import { contestantService } from '@/services/contestant.service';
import Stage from '@/models/Stage';
import StageContestant from '@/models/StageContestant';
import StageResult from '@/models/StageResult';
import Vote from '@/models/Vote';
import Nominee from '@/models/Nominee';
import Award from '@/models/Award';
import Category from '@/models/Category';
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

// Helper function to create test category
const createTestCategory = async (awardId: string, awardName: string, organizationId: string) => {
  return await Category.create({
    name: 'Test Category',
    awardId,
    awardName,
    organizationId,
  });
};

describe('StageScheduler Service', () => {
  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Stage.deleteMany({});
    await StageContestant.deleteMany({});
    await StageResult.deleteMany({});
    await Vote.deleteMany({});
    await Nominee.deleteMany({});
    await Award.deleteMany({});
    await Category.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Property 11: Automatic Stage Activation', () => {
    it('should activate all eligible stages', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await Stage.deleteMany({});
        await Award.deleteMany({});

        // Create award
        const award = await createTestAward(i);

        // Create stages with various start times
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Stage 1: Should be activated (start time in the past)
        const stage1 = await Stage.create({
          name: 'Stage 1',
          awardId: award._id,
          startDate: yesterday,
          startTime: '00:00',
          endDate: tomorrow,
          endTime: '23:59',
          order: 1,
          stageType: 'voting',
          status: 'upcoming',
          qualificationRule: 'manual',
        });

        // Stage 2: Should NOT be activated (start time in the future)
        const stage2 = await Stage.create({
          name: 'Stage 2',
          awardId: award._id,
          startDate: tomorrow,
          startTime: '00:00',
          endDate: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
          endTime: '23:59',
          order: 2,
          stageType: 'voting',
          status: 'upcoming',
          qualificationRule: 'manual',
        });

        // Run scheduler
        const result = await stageScheduler.processStageTransitions();

        // Verify stage 1 was activated
        const updatedStage1 = await Stage.findById(stage1._id);
        expect(updatedStage1?.status).toBe('active');

        // Verify stage 2 was NOT activated
        const updatedStage2 = await Stage.findById(stage2._id);
        expect(updatedStage2?.status).toBe('upcoming');

        // Verify result
        expect(result.activatedStages).toContain(stage1._id.toString());
        expect(result.activatedStages).not.toContain(stage2._id.toString());
      }
    });
  });

  describe('Property 12: Automatic Stage Closure', () => {
    it('should close all eligible stages', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await Stage.deleteMany({});
        await Award.deleteMany({});
        await Category.deleteMany({});
        await Nominee.deleteMany({});
        await Vote.deleteMany({});
        await StageResult.deleteMany({});

        // Create award and category
        const award = await createTestAward(i);
        const category = await createTestCategory(
          award._id.toString(),
          award.name,
          award.organizationId
        );

        // Create nominee
        const nominee = await Nominee.create({
          name: 'Test Nominee',
          categoryId: category._id,
          awardId: award._id,
        });

        // Create stages with various end times
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Stage 1: Should be closed (end time in the past)
        const stage1 = await Stage.create({
          name: 'Stage 1',
          awardId: award._id,
          startDate: new Date(yesterday.getTime() - 24 * 60 * 60 * 1000),
          startTime: '00:00',
          endDate: yesterday,
          endTime: '23:59',
          order: 1,
          stageType: 'voting',
          status: 'active',
          qualificationRule: 'manual',
        });

        // Add contestant to stage 1
        await contestantService.addContestantsToStage(
          stage1._id.toString(),
          [nominee._id.toString()],
          'initial'
        );

        // Stage 2: Should NOT be closed (end time in the future)
        const stage2 = await Stage.create({
          name: 'Stage 2',
          awardId: award._id,
          startDate: now,
          startTime: '00:00',
          endDate: tomorrow,
          endTime: '23:59',
          order: 2,
          stageType: 'voting',
          status: 'active',
          qualificationRule: 'manual',
        });

        // Run scheduler
        const result = await stageScheduler.processStageTransitions();

        // Verify stage 1 was closed
        const updatedStage1 = await Stage.findById(stage1._id);
        expect(updatedStage1?.status).toBe('completed');

        // Verify stage 2 was NOT closed
        const updatedStage2 = await Stage.findById(stage2._id);
        expect(updatedStage2?.status).toBe('active');

        // Verify result
        expect(result.closedStages).toContain(stage1._id.toString());
        expect(result.closedStages).not.toContain(stage2._id.toString());
      }
    });
  });

  describe('Property 2: Single Active Stage', () => {
    it('should maintain at most one active stage per award', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await Stage.deleteMany({});
        await Award.deleteMany({});

        // Create award
        const award = await createTestAward(i);

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Create multiple stages that should be activated
        const stages = [];
        for (let j = 0; j < 3; j++) {
          const stage = await Stage.create({
            name: `Stage ${j + 1}`,
            awardId: award._id,
            startDate: yesterday,
            startTime: '00:00',
            endDate: tomorrow,
            endTime: '23:59',
            order: j + 1,
            stageType: 'voting',
            status: 'upcoming',
            qualificationRule: 'manual',
          });
          stages.push(stage);
        }

        // Run scheduler
        await stageScheduler.processStageTransitions();

        // Count active stages for this award
        const activeStages = await Stage.find({
          awardId: award._id,
          status: 'active',
        });

        // Should have at most 1 active stage
        expect(activeStages.length).toBeLessThanOrEqual(1);

        // If there's an active stage, it should be the first one by order
        if (activeStages.length === 1) {
          expect(activeStages[0].order).toBe(1);
        }
      }
    });
  });

  describe('Integration: Stage Lifecycle', () => {
    it('should handle complete stage lifecycle with qualification', async () => {
      // Create award and category
      const award = await createTestAward(0);
      const category = await createTestCategory(
        award._id.toString(),
        award.name,
        award.organizationId
      );

      // Create nominees
      const nominees = await Nominee.create([
        { name: 'Nominee 1', categoryId: category._id, awardId: award._id },
        { name: 'Nominee 2', categoryId: category._id, awardId: award._id },
        { name: 'Nominee 3', categoryId: category._id, awardId: award._id },
      ]);

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Create stage 1 (should be closed)
      const stage1 = await Stage.create({
        name: 'Stage 1',
        awardId: award._id,
        startDate: new Date(yesterday.getTime() - 24 * 60 * 60 * 1000),
        startTime: '00:00',
        endDate: yesterday,
        endTime: '23:59',
        order: 1,
        stageType: 'voting',
        status: 'active',
        qualificationRule: 'topN',
        qualificationCount: 2,
      });

      // Create stage 2 (should be activated after stage 1 closes)
      const stage2 = await Stage.create({
        name: 'Stage 2',
        awardId: award._id,
        startDate: yesterday,
        startTime: '00:00',
        endDate: tomorrow,
        endTime: '23:59',
        order: 2,
        stageType: 'voting',
        status: 'upcoming',
        qualificationRule: 'manual',
      });

      // Add contestants to stage 1
      await contestantService.addContestantsToStage(
        stage1._id.toString(),
        nominees.map((n) => n._id.toString()),
        'initial'
      );

      // Create votes for stage 1
      await Vote.create([
        {
          awardId: award._id,
          categoryId: category._id,
          nomineeId: nominees[0]._id,
          stageId: stage1._id,
          numberOfVotes: 10,
          voterEmail: 'test1@example.com',
          voterPhone: '+1234567890',
          amount: 5,
          paymentReference: 'ref1',
          transactionReference: 'ref1',
          paymentStatus: 'completed',
        },
        {
          awardId: award._id,
          categoryId: category._id,
          nomineeId: nominees[1]._id,
          stageId: stage1._id,
          numberOfVotes: 8,
          voterEmail: 'test2@example.com',
          voterPhone: '+1234567891',
          amount: 4,
          paymentReference: 'ref2',
          transactionReference: 'ref2',
          paymentStatus: 'completed',
        },
        {
          awardId: award._id,
          categoryId: category._id,
          nomineeId: nominees[2]._id,
          stageId: stage1._id,
          numberOfVotes: 5,
          voterEmail: 'test3@example.com',
          voterPhone: '+1234567892',
          amount: 2.5,
          paymentReference: 'ref3',
          transactionReference: 'ref3',
          paymentStatus: 'completed',
        },
      ]);

      // Run scheduler
      const result = await stageScheduler.processStageTransitions();

      // Verify stage 1 was closed
      const updatedStage1 = await Stage.findById(stage1._id);
      expect(updatedStage1?.status).toBe('completed');
      expect(updatedStage1?.qualificationProcessed).toBe(true);

      // Verify stage 2 was activated
      const updatedStage2 = await Stage.findById(stage2._id);
      expect(updatedStage2?.status).toBe('active');

      // Verify qualification results
      expect(result.qualificationResults).toHaveLength(1);
      expect(result.qualificationResults[0].qualifiedCount).toBe(2);

      // Verify top 2 contestants were added to stage 2
      const stage2Contestants = await StageContestant.find({ stageId: stage2._id });
      expect(stage2Contestants).toHaveLength(2);

      const stage2NomineeIds = stage2Contestants.map((c) => c.nomineeId.toString());
      expect(stage2NomineeIds).toContain(nominees[0]._id.toString());
      expect(stage2NomineeIds).toContain(nominees[1]._id.toString());
      expect(stage2NomineeIds).not.toContain(nominees[2]._id.toString());

      // Verify result snapshot was created
      const snapshot = await StageResult.findOne({ stageId: stage1._id });
      expect(snapshot).toBeTruthy();
      expect(snapshot?.rankings).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle stages with no votes gracefully', async () => {
      const award = await createTestAward(0);

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stage = await Stage.create({
        name: 'Stage 1',
        awardId: award._id,
        startDate: new Date(yesterday.getTime() - 24 * 60 * 60 * 1000),
        startTime: '00:00',
        endDate: yesterday,
        endTime: '23:59',
        order: 1,
        stageType: 'voting',
        status: 'active',
        qualificationRule: 'topN',
        qualificationCount: 2,
      });

      // Run scheduler (no votes exist)
      const result = await stageScheduler.processStageTransitions();

      // Should still close the stage
      const updatedStage = await Stage.findById(stage._id);
      expect(updatedStage?.status).toBe('completed');

      // Qualification should process but qualify 0 contestants
      expect(result.qualificationResults).toHaveLength(1);
      expect(result.qualificationResults[0].qualifiedCount).toBe(0);
    });

    it('should not activate multiple stages for same award simultaneously', async () => {
      const award = await createTestAward(0);

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Create 3 stages all eligible for activation
      await Stage.create([
        {
          name: 'Stage 1',
          awardId: award._id,
          startDate: yesterday,
          startTime: '00:00',
          endDate: tomorrow,
          endTime: '23:59',
          order: 1,
          stageType: 'voting',
          status: 'upcoming',
          qualificationRule: 'manual',
        },
        {
          name: 'Stage 2',
          awardId: award._id,
          startDate: yesterday,
          startTime: '00:00',
          endDate: tomorrow,
          endTime: '23:59',
          order: 2,
          stageType: 'voting',
          status: 'upcoming',
          qualificationRule: 'manual',
        },
        {
          name: 'Stage 3',
          awardId: award._id,
          startDate: yesterday,
          startTime: '00:00',
          endDate: tomorrow,
          endTime: '23:59',
          order: 3,
          stageType: 'voting',
          status: 'upcoming',
          qualificationRule: 'manual',
        },
      ]);

      // Run scheduler
      await stageScheduler.processStageTransitions();

      // Only one stage should be active
      const activeStages = await Stage.find({
        awardId: award._id,
        status: 'active',
      });

      expect(activeStages).toHaveLength(1);
      expect(activeStages[0].order).toBe(1); // First stage by order
    });
  });
});
