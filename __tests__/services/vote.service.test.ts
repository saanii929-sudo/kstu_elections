import { voteService } from '@/services/vote.service';
import { contestantService } from '@/services/contestant.service';
import Stage from '@/models/Stage';
import StageContestant from '@/models/StageContestant';
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

describe('VoteService with Stage Validation', () => {
  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Stage.deleteMany({});
    await StageContestant.deleteMany({});
    await Vote.deleteMany({});
    await Nominee.deleteMany({});
    await Award.deleteMany({});
    await Category.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Property 3: Vote Stage Validation', () => {
    it('should reject votes when stage is not active', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await Stage.deleteMany({});
        await Award.deleteMany({});
        await Category.deleteMany({});
        await Nominee.deleteMany({});
        await StageContestant.deleteMany({});

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

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Create stages with different statuses
        const statuses = ['upcoming', 'completed'] as const;
        const status = statuses[i % 2];

        const stage = await Stage.create({
          name: 'Test Stage',
          awardId: award._id,
          startDate: status === 'upcoming' ? tomorrow : yesterday,
          startTime: '00:00',
          endDate: status === 'upcoming' ? new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) : yesterday,
          endTime: '23:59',
          order: 1,
          stageType: 'voting',
          status,
          qualificationRule: 'manual',
        });

        // Add contestant to stage
        await contestantService.addContestantsToStage(
          stage._id.toString(),
          [nominee._id.toString()],
          'initial'
        );

        // Try to create vote
        try {
          await voteService.createVote({
            awardId: award._id.toString(),
            categoryId: category._id.toString(),
            nomineeId: nominee._id.toString(),
            stageId: stage._id.toString(),
            voteCount: 1,
            voterEmail: 'test@example.com',
            voterPhone: '+1234567890',
            paymentReference: `ref${i}`,
            transactionReference: `ref${i}`,
          });

          // Should not reach here
          fail('Vote should have been rejected');
        } catch (error: any) {
          // Verify error message indicates stage is not active
          expect(error.message).toMatch(/not allowed|not started|ended/i);
        }
      }
    });
  });

  describe('Property 4: Contestant Eligibility', () => {
    it('should reject votes for nominees not in stage', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await Stage.deleteMany({});
        await Award.deleteMany({});
        await Category.deleteMany({});
        await Nominee.deleteMany({});
        await StageContestant.deleteMany({});

        // Create award and category
        const award = await createTestAward(i);
        const category = await createTestCategory(
          award._id.toString(),
          award.name,
          award.organizationId
        );

        // Create nominees
        const nominee1 = await Nominee.create({
          name: 'Nominee 1',
          categoryId: category._id,
          awardId: award._id,
        });

        const nominee2 = await Nominee.create({
          name: 'Nominee 2',
          categoryId: category._id,
          awardId: award._id,
        });

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Create active stage
        const stage = await Stage.create({
          name: 'Test Stage',
          awardId: award._id,
          startDate: yesterday,
          startTime: '00:00',
          endDate: tomorrow,
          endTime: '23:59',
          order: 1,
          stageType: 'voting',
          status: 'active',
          qualificationRule: 'manual',
        });

        // Add only nominee1 to stage
        await contestantService.addContestantsToStage(
          stage._id.toString(),
          [nominee1._id.toString()],
          'initial'
        );

        // Try to vote for nominee2 (not in stage)
        try {
          await voteService.createVote({
            awardId: award._id.toString(),
            categoryId: category._id.toString(),
            nomineeId: nominee2._id.toString(),
            stageId: stage._id.toString(),
            voteCount: 1,
            voterEmail: 'test@example.com',
            voterPhone: '+1234567890',
            paymentReference: `ref${i}`,
            transactionReference: `ref${i}`,
          });

          // Should not reach here
          fail('Vote should have been rejected');
        } catch (error: any) {
          // Verify error message indicates nominee not eligible
          expect(error.message).toMatch(/not eligible|not in|current stage/i);
        }

        // Vote for nominee1 should succeed
        const vote = await voteService.createVote({
          awardId: award._id.toString(),
          categoryId: category._id.toString(),
          nomineeId: nominee1._id.toString(),
          stageId: stage._id.toString(),
          voteCount: 1,
          voterEmail: 'test@example.com',
          voterPhone: '+1234567890',
          paymentReference: `ref${i}-valid`,
          transactionReference: `ref${i}-valid`,
        });

        expect(vote).toBeTruthy();
        expect(vote.nomineeId.toString()).toBe(nominee1._id.toString());
        expect(vote.stageId?.toString()).toBe(stage._id.toString());
      }
    });
  });

  describe('Property 17: Vote Preservation', () => {
    it('should preserve votes when contestant is removed from stage', async () => {
      // Create award and category
      const award = await createTestAward(0);
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

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Create active stage
      const stage = await Stage.create({
        name: 'Test Stage',
        awardId: award._id,
        startDate: yesterday,
        startTime: '00:00',
        endDate: tomorrow,
        endTime: '23:59',
        order: 1,
        stageType: 'voting',
        status: 'active',
        qualificationRule: 'manual',
      });

      // Add contestant to stage
      await contestantService.addContestantsToStage(
        stage._id.toString(),
        [nominee._id.toString()],
        'initial'
      );

      // Create votes
      const vote1 = await voteService.createVote({
        awardId: award._id.toString(),
        categoryId: category._id.toString(),
        nomineeId: nominee._id.toString(),
        stageId: stage._id.toString(),
        voteCount: 5,
        voterEmail: 'test1@example.com',
        voterPhone: '+1234567890',
        paymentReference: 'ref1',
        transactionReference: 'ref1',
      });

      const vote2 = await voteService.createVote({
        awardId: award._id.toString(),
        categoryId: category._id.toString(),
        nomineeId: nominee._id.toString(),
        stageId: stage._id.toString(),
        voteCount: 3,
        voterEmail: 'test2@example.com',
        voterPhone: '+1234567891',
        paymentReference: 'ref2',
        transactionReference: 'ref2',
      });

      // Verify votes exist
      const votesBefore = await Vote.find({
        stageId: stage._id,
        nomineeId: nominee._id,
      });
      expect(votesBefore).toHaveLength(2);

      // Remove contestant from stage
      await contestantService.removeContestantFromStage(
        stage._id.toString(),
        nominee._id.toString()
      );

      // Verify votes still exist
      const votesAfter = await Vote.find({
        stageId: stage._id,
        nomineeId: nominee._id,
      });
      expect(votesAfter).toHaveLength(2);

      // Verify vote data unchanged
      const vote1After = await Vote.findById(vote1._id);
      const vote2After = await Vote.findById(vote2._id);

      expect(vote1After?.numberOfVotes).toBe(5);
      expect(vote2After?.numberOfVotes).toBe(3);
      expect(vote1After?.stageId?.toString()).toBe(stage._id.toString());
      expect(vote2After?.stageId?.toString()).toBe(stage._id.toString());
    });
  });

  describe('Property 18: Zero Vote Start', () => {
    it('should start new stage with zero votes for all contestants', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await Stage.deleteMany({});
        await Award.deleteMany({});
        await Category.deleteMany({});
        await Nominee.deleteMany({});
        await StageContestant.deleteMany({});
        await Vote.deleteMany({});

        // Create award and category
        const award = await createTestAward(i);
        const category = await createTestCategory(
          award._id.toString(),
          award.name,
          award.organizationId
        );

        // Create nominees
        const nominees = await Nominee.create([
          { name: 'Nominee 1', categoryId: category._id, awardId: award._id },
          { name: 'Nominee 2', categoryId: category._id, awardId: award._id },
        ]);

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Create stage 1 (completed)
        const stage1 = await Stage.create({
          name: 'Stage 1',
          awardId: award._id,
          startDate: new Date(yesterday.getTime() - 48 * 60 * 60 * 1000),
          startTime: '00:00',
          endDate: yesterday,
          endTime: '23:59',
          order: 1,
          stageType: 'voting',
          status: 'completed',
          qualificationRule: 'manual',
        });

        // Add contestants to stage 1
        await contestantService.addContestantsToStage(
          stage1._id.toString(),
          nominees.map((n) => n._id.toString()),
          'initial'
        );

        // Create votes in stage 1
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
            paymentReference: `ref${i}-1`,
            transactionReference: `ref${i}-1`,
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
            paymentReference: `ref${i}-2`,
            transactionReference: `ref${i}-2`,
            paymentStatus: 'completed',
          },
        ]);

        // Create stage 2 (active)
        const stage2 = await Stage.create({
          name: 'Stage 2',
          awardId: award._id,
          startDate: yesterday,
          startTime: '00:00',
          endDate: tomorrow,
          endTime: '23:59',
          order: 2,
          stageType: 'voting',
          status: 'active',
          qualificationRule: 'manual',
        });

        // Add same contestants to stage 2
        await contestantService.addContestantsToStage(
          stage2._id.toString(),
          nominees.map((n) => n._id.toString()),
          'qualification'
        );

        // Verify stage 2 has zero votes for all contestants
        const stage2Votes = await Vote.find({ stageId: stage2._id });
        expect(stage2Votes).toHaveLength(0);

        // Verify stage 1 votes still exist
        const stage1Votes = await Vote.find({ stageId: stage1._id });
        expect(stage1Votes).toHaveLength(2);

        // Verify total votes across all stages
        const totalVotes = await Vote.find({ awardId: award._id });
        expect(totalVotes).toHaveLength(2); // Only stage 1 votes
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should allow votes without stageId for awards without stages', async () => {
      // Create award and category
      const award = await createTestAward(0);
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

      // Create vote without stageId (no stages exist for this award)
      const vote = await voteService.createVote({
        awardId: award._id.toString(),
        categoryId: category._id.toString(),
        nomineeId: nominee._id.toString(),
        voteCount: 1,
        voterEmail: 'test@example.com',
        voterPhone: '+1234567890',
        paymentReference: 'ref1',
        transactionReference: 'ref1',
      });

      expect(vote).toBeTruthy();
      expect(vote.stageId).toBeUndefined();
    });

    it('should auto-assign active stage when stageId not provided', async () => {
      // Create award and category
      const award = await createTestAward(0);
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

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Create active stage
      const stage = await Stage.create({
        name: 'Test Stage',
        awardId: award._id,
        startDate: yesterday,
        startTime: '00:00',
        endDate: tomorrow,
        endTime: '23:59',
        order: 1,
        stageType: 'voting',
        status: 'active',
        qualificationRule: 'manual',
      });

      // Add contestant to stage
      await contestantService.addContestantsToStage(
        stage._id.toString(),
        [nominee._id.toString()],
        'initial'
      );

      // Create vote without stageId
      const vote = await voteService.createVote({
        awardId: award._id.toString(),
        categoryId: category._id.toString(),
        nomineeId: nominee._id.toString(),
        voteCount: 1,
        voterEmail: 'test@example.com',
        voterPhone: '+1234567890',
        paymentReference: 'ref1',
        transactionReference: 'ref1',
      });

      expect(vote).toBeTruthy();
      expect(vote.stageId?.toString()).toBe(stage._id.toString());
    });
  });
});
