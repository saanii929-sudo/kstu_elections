import { qualificationProcessor } from '@/services/qualification.service';
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

// Helper function to create test vote
const createTestVote = async (data: {
  awardId: string;
  categoryId: string;
  nomineeId: string;
  stageId: string;
  numberOfVotes: number;
  transactionReference: string;
  createdAt?: Date;
}) => {
  return await Vote.create({
    ...data,
    voterEmail: 'test@example.com',
    voterPhone: '+1234567890',
    amount: data.numberOfVotes * 0.5,
    paymentReference: data.transactionReference,
    paymentStatus: 'completed',
  });
};

describe('QualificationProcessor Service', () => {
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

  describe('Property 6: Qualification Idempotency', () => {
    it('should not create duplicate contestants when run multiple times', async () => {
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

      // Create two stages
      const stage1 = await Stage.create({
        name: 'Stage 1',
        awardId: award._id,
        startDate: new Date('2024-01-01'),
        startTime: '00:00',
        endDate: new Date('2024-01-31'),
        endTime: '23:59',
        order: 1,
        stageType: 'voting',
        status: 'completed',
        qualificationRule: 'topN',
        qualificationCount: 2,
      });

      const stage2 = await Stage.create({
        name: 'Stage 2',
        awardId: award._id,
        startDate: new Date('2024-02-01'),
        startTime: '00:00',
        endDate: new Date('2024-02-28'),
        endTime: '23:59',
        order: 2,
        stageType: 'voting',
        status: 'upcoming',
      });

      // Add contestants to stage 1
      await contestantService.addContestantsToStage(
        stage1._id.toString(),
        nominees.map((n) => n._id.toString()),
        'initial'
      );

      // Create votes
      await Vote.create([
        {
          awardId: award._id,
          categoryId: category._id,
          nomineeId: nominees[0]._id,
          stageId: stage1._id,
          numberOfVotes: 10,
          paymentStatus: 'completed',
          transactionReference: 'ref1',
        },
        {
          awardId: award._id,
          categoryId: category._id,
          nomineeId: nominees[1]._id,
          stageId: stage1._id,
          numberOfVotes: 8,
          paymentStatus: 'completed',
          transactionReference: 'ref2',
        },
        {
          awardId: award._id,
          categoryId: category._id,
          nomineeId: nominees[2]._id,
          stageId: stage1._id,
          numberOfVotes: 5,
          paymentStatus: 'completed',
          transactionReference: 'ref3',
        },
      ]);

      // Create result snapshot
      await StageResult.create({
        stageId: stage1._id,
        awardId: award._id,
        categoryId: category._id,
        rankings: [
          {
            nomineeId: nominees[0]._id,
            nomineeName: 'Nominee 1',
            rank: 1,
            voteCount: 10,
            qualified: false,
          },
          {
            nomineeId: nominees[1]._id,
            nomineeName: 'Nominee 2',
            rank: 2,
            voteCount: 8,
            qualified: false,
          },
          {
            nomineeId: nominees[2]._id,
            nomineeName: 'Nominee 3',
            rank: 3,
            voteCount: 5,
            qualified: false,
          },
        ],
        totalVotes: 23,
        snapshotAt: new Date(),
      });

      // Run qualification processor first time
      const result1 = await qualificationProcessor.processStageQualification(
        stage1._id.toString()
      );

      expect(result1.qualifiedCount).toBe(2);
      expect(result1.nextStageId).toBe(stage2._id.toString());

      // Check contestants in stage 2
      const stage2Contestants1 = await StageContestant.find({ stageId: stage2._id });
      expect(stage2Contestants1).toHaveLength(2);

      // Run qualification processor second time
      const result2 = await qualificationProcessor.processStageQualification(
        stage1._id.toString()
      );

      expect(result2.qualifiedCount).toBe(0); // Already processed

      // Check contestants in stage 2 - should still be 2
      const stage2Contestants2 = await StageContestant.find({ stageId: stage2._id });
      expect(stage2Contestants2).toHaveLength(2);

      // Verify no duplicates
      const uniqueNominees = new Set(
        stage2Contestants2.map((c) => c.nomineeId.toString())
      );
      expect(uniqueNominees.size).toBe(2);
    });
  });

  describe('Property 7: Top N Qualification', () => {
    it('should qualify exactly top N contestants', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await Stage.deleteMany({});
        await StageContestant.deleteMany({});
        await Vote.deleteMany({});
        await Nominee.deleteMany({});
        await Award.deleteMany({});
        await Category.deleteMany({});

        // Create award and category
        const award = await createTestAward(i);

        const category = await createTestCategory(
          award._id.toString(),
          award.name,
          award.organizationId
        );

        // Random number of contestants (5-20)
        const contestantCount = Math.floor(Math.random() * 16) + 5;
        const nominees = [];
        for (let j = 0; j < contestantCount; j++) {
          nominees.push({
            name: `Nominee ${j}`,
            categoryId: category._id,
            awardId: award._id,
          });
        }
        const createdNominees = await Nominee.create(nominees);

        // Random N (1 to contestantCount - 1)
        const topN = Math.floor(Math.random() * (contestantCount - 1)) + 1;

        // Create stage
        const stage = await Stage.create({
          name: 'Stage 1',
          awardId: award._id,
          startDate: new Date('2024-01-01'),
          startTime: '00:00',
          endDate: new Date('2024-01-31'),
          endTime: '23:59',
          order: 1,
          stageType: 'voting',
          status: 'completed',
          qualificationRule: 'topN',
          qualificationCount: topN,
        });

        // Add contestants
        await contestantService.addContestantsToStage(
          stage._id.toString(),
          createdNominees.map((n) => n._id.toString()),
          'initial'
        );

        // Create random votes (ensure different vote counts)
        const votes = [];
        for (let j = 0; j < createdNominees.length; j++) {
          votes.push({
            awardId: award._id,
            categoryId: category._id,
            nomineeId: createdNominees[j]._id,
            stageId: stage._id,
            numberOfVotes: contestantCount - j, // Descending vote counts
            paymentStatus: 'completed',
            transactionReference: `ref${i}-${j}`,
          });
        }
        await Vote.create(votes);

        // Create result snapshot
        const rankings = createdNominees.map((n, idx) => ({
          nomineeId: n._id,
          nomineeName: n.name,
          rank: idx + 1,
          voteCount: contestantCount - idx,
          qualified: false,
        }));

        await StageResult.create({
          stageId: stage._id,
          awardId: award._id,
          categoryId: category._id,
          rankings,
          totalVotes: rankings.reduce((sum, r) => sum + r.voteCount, 0),
          snapshotAt: new Date(),
        });

        // Process qualification
        const result = await qualificationProcessor.processStageQualification(
          stage._id.toString()
        );

        // Verify exactly top N qualified
        expect(result.qualifiedCount).toBe(topN);
        expect(result.qualifiedContestants).toHaveLength(topN);

        // Verify they are the top N by vote count
        const sortedVotes = votes.sort((a, b) => b.numberOfVotes - a.numberOfVotes);
        const expectedQualified = sortedVotes
          .slice(0, topN)
          .map((v) => v.nomineeId.toString());

        const actualQualified = result.qualifiedContestants.map((c) => c.nomineeId);

        expect(actualQualified.sort()).toEqual(expectedQualified.sort());
      }
    });
  });

  describe('Property 8: Threshold Qualification', () => {
    it('should qualify all contestants with votes >= threshold', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await Stage.deleteMany({});
        await StageContestant.deleteMany({});
        await Vote.deleteMany({});
        await Nominee.deleteMany({});
        await Award.deleteMany({});
        await Category.deleteMany({});

        // Create award and category
        const award = await createTestAward(i);

        const category = await createTestCategory(
          award._id.toString(),
          award.name,
          award.organizationId
        );

        // Random number of contestants (5-15)
        const contestantCount = Math.floor(Math.random() * 11) + 5;
        const nominees = [];
        for (let j = 0; j < contestantCount; j++) {
          nominees.push({
            name: `Nominee ${j}`,
            categoryId: category._id,
            awardId: award._id,
          });
        }
        const createdNominees = await Nominee.create(nominees);

        // Random threshold (5-15)
        const threshold = Math.floor(Math.random() * 11) + 5;

        // Create stage
        const stage = await Stage.create({
          name: 'Stage 1',
          awardId: award._id,
          startDate: new Date('2024-01-01'),
          startTime: '00:00',
          endDate: new Date('2024-01-31'),
          endTime: '23:59',
          order: 1,
          stageType: 'voting',
          status: 'completed',
          qualificationRule: 'threshold',
          qualificationThreshold: threshold,
        });

        // Add contestants
        await contestantService.addContestantsToStage(
          stage._id.toString(),
          createdNominees.map((n) => n._id.toString()),
          'initial'
        );

        // Create random votes
        const votes = [];
        for (let j = 0; j < createdNominees.length; j++) {
          const voteCount = Math.floor(Math.random() * 25) + 1; // 1-25 votes
          votes.push({
            awardId: award._id,
            categoryId: category._id,
            nomineeId: createdNominees[j]._id,
            stageId: stage._id,
            numberOfVotes: voteCount,
            paymentStatus: 'completed',
            transactionReference: `ref${i}-${j}`,
          });
        }
        await Vote.create(votes);

        // Create result snapshot
        const rankings = votes
          .sort((a, b) => b.numberOfVotes - a.numberOfVotes)
          .map((v, idx) => ({
            nomineeId: v.nomineeId,
            nomineeName: `Nominee ${idx}`,
            rank: idx + 1,
            voteCount: v.numberOfVotes,
            qualified: false,
          }));

        await StageResult.create({
          stageId: stage._id,
          awardId: award._id,
          categoryId: category._id,
          rankings,
          totalVotes: rankings.reduce((sum, r) => sum + r.voteCount, 0),
          snapshotAt: new Date(),
        });

        // Process qualification
        const result = await qualificationProcessor.processStageQualification(
          stage._id.toString()
        );

        // Count expected qualified (votes >= threshold)
        const expectedQualified = votes.filter((v) => v.numberOfVotes >= threshold);

        // Verify all and only contestants with votes >= threshold are qualified
        expect(result.qualifiedCount).toBe(expectedQualified.length);
        expect(result.qualifiedContestants).toHaveLength(expectedQualified.length);

        // Verify all qualified have votes >= threshold
        result.qualifiedContestants.forEach((c) => {
          expect(c.voteCount).toBeGreaterThanOrEqual(threshold);
        });

        // Verify no unqualified have votes >= threshold
        const qualifiedIds = new Set(result.qualifiedContestants.map((c) => c.nomineeId));
        votes.forEach((v) => {
          if (v.numberOfVotes >= threshold) {
            expect(qualifiedIds.has(v.nomineeId.toString())).toBe(true);
          } else {
            expect(qualifiedIds.has(v.nomineeId.toString())).toBe(false);
          }
        });
      }
    });
  });

  describe('Property 16: Tie-Breaking Determinism', () => {
    it('should produce same qualification decisions when run multiple times with ties', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await Stage.deleteMany({});
        await StageContestant.deleteMany({});
        await Vote.deleteMany({});
        await Nominee.deleteMany({});
        await Award.deleteMany({});
        await Category.deleteMany({});

        // Create award and category
        const award = await createTestAward(i);

        const category = await createTestCategory(
          award._id.toString(),
          award.name,
          award.organizationId
        );

        // Create 5 nominees
        const nominees = await Nominee.create([
          { name: 'Nominee 1', categoryId: category._id, awardId: award._id },
          { name: 'Nominee 2', categoryId: category._id, awardId: award._id },
          { name: 'Nominee 3', categoryId: category._id, awardId: award._id },
          { name: 'Nominee 4', categoryId: category._id, awardId: award._id },
          { name: 'Nominee 5', categoryId: category._id, awardId: award._id },
        ]);

        // Create stage with topN = 3
        const stage = await Stage.create({
          name: 'Stage 1',
          awardId: award._id,
          startDate: new Date('2024-01-01'),
          startTime: '00:00',
          endDate: new Date('2024-01-31'),
          endTime: '23:59',
          order: 1,
          stageType: 'voting',
          status: 'completed',
          qualificationRule: 'topN',
          qualificationCount: 3,
        });

        // Add contestants
        await contestantService.addContestantsToStage(
          stage._id.toString(),
          nominees.map((n) => n._id.toString()),
          'initial'
        );

        // Create votes with tie at position 3
        const baseTime = new Date('2024-01-15T10:00:00Z');
        await Vote.create([
          {
            awardId: award._id,
            categoryId: category._id,
            nomineeId: nominees[0]._id,
            stageId: stage._id,
            numberOfVotes: 10,
            paymentStatus: 'completed',
            transactionReference: `ref${i}-1`,
            createdAt: new Date(baseTime.getTime() + 1000),
          },
          {
            awardId: award._id,
            categoryId: category._id,
            nomineeId: nominees[1]._id,
            stageId: stage._id,
            numberOfVotes: 8,
            paymentStatus: 'completed',
            transactionReference: `ref${i}-2`,
            createdAt: new Date(baseTime.getTime() + 2000),
          },
          {
            awardId: award._id,
            categoryId: category._id,
            nomineeId: nominees[2]._id,
            stageId: stage._id,
            numberOfVotes: 5,
            paymentStatus: 'completed',
            transactionReference: `ref${i}-3`,
            createdAt: new Date(baseTime.getTime() + 3000), // Earlier last vote
          },
          {
            awardId: award._id,
            categoryId: category._id,
            nomineeId: nominees[3]._id,
            stageId: stage._id,
            numberOfVotes: 5,
            paymentStatus: 'completed',
            transactionReference: `ref${i}-4`,
            createdAt: new Date(baseTime.getTime() + 4000), // Later last vote
          },
          {
            awardId: award._id,
            categoryId: category._id,
            nomineeId: nominees[4]._id,
            stageId: stage._id,
            numberOfVotes: 3,
            paymentStatus: 'completed',
            transactionReference: `ref${i}-5`,
            createdAt: new Date(baseTime.getTime() + 5000),
          },
        ]);

        // Create result snapshot
        await StageResult.create({
          stageId: stage._id,
          awardId: award._id,
          categoryId: category._id,
          rankings: [
            {
              nomineeId: nominees[0]._id,
              nomineeName: 'Nominee 1',
              rank: 1,
              voteCount: 10,
              qualified: false,
              lastVoteAt: new Date(baseTime.getTime() + 1000),
            },
            {
              nomineeId: nominees[1]._id,
              nomineeName: 'Nominee 2',
              rank: 2,
              voteCount: 8,
              qualified: false,
              lastVoteAt: new Date(baseTime.getTime() + 2000),
            },
            {
              nomineeId: nominees[2]._id,
              nomineeName: 'Nominee 3',
              rank: 3,
              voteCount: 5,
              qualified: false,
              lastVoteAt: new Date(baseTime.getTime() + 3000),
            },
            {
              nomineeId: nominees[3]._id,
              nomineeName: 'Nominee 4',
              rank: 4,
              voteCount: 5,
              qualified: false,
              lastVoteAt: new Date(baseTime.getTime() + 4000),
            },
            {
              nomineeId: nominees[4]._id,
              nomineeName: 'Nominee 5',
              rank: 5,
              voteCount: 3,
              qualified: false,
              lastVoteAt: new Date(baseTime.getTime() + 5000),
            },
          ],
          totalVotes: 31,
          snapshotAt: new Date(),
        });

        // Process qualification
        const result = await qualificationProcessor.processStageQualification(
          stage._id.toString()
        );

        // Should qualify exactly 3 (top 2 + tie-breaker winner)
        expect(result.qualifiedCount).toBe(3);

        // Verify Nominee 1 and 2 are always qualified
        const qualifiedIds = result.qualifiedContestants.map((c) => c.nomineeId);
        expect(qualifiedIds).toContain(nominees[0]._id.toString());
        expect(qualifiedIds).toContain(nominees[1]._id.toString());

        // Verify Nominee 3 wins tie-breaker (earlier lastVoteAt)
        expect(qualifiedIds).toContain(nominees[2]._id.toString());
        expect(qualifiedIds).not.toContain(nominees[3]._id.toString());
      }
    });
  });
});
