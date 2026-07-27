/**
 * Property Tests for LeaderboardService
 * Feature: multi-stage-voting
 * Property 1: Stage Isolation
 * Property 15: Leaderboard Consistency
 */

import mongoose from 'mongoose';
import { leaderboardService } from '../../services/leaderboard.service';
import Vote from '../../models/Vote';
import Nominee from '../../models/Nominee';
import Stage from '../../models/Stage';
import StageResult from '../../models/StageResult';

jest.mock('../../lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

describe('LeaderboardService', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Vote.deleteMany({});
    await Nominee.deleteMany({});
    await Stage.deleteMany({});
    await StageResult.deleteMany({});
  });

  /**
   * Property 1: Stage Isolation
   * Validates: Requirements 3.1, 3.2, 5.1, 5.2
   */
  describe('Property 1: Stage Isolation', () => {
    it('should show independent leaderboards for different stages', async () => {
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();

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

      // Add votes to stage 1
      await Vote.create({
        awardId,
        categoryId,
        nomineeId: nominee1._id,
        stageId: stage1._id,
        voterEmail: 'voter1@test.com',
        voterPhone: '1234567890',
        numberOfVotes: 10,
        amount: 5,
        paymentReference: 'ref-stage1-1',
        paymentStatus: 'completed',
      });

      // Add votes to stage 2
      await Vote.create({
        awardId,
        categoryId,
        nomineeId: nominee2._id,
        stageId: stage2._id,
        voterEmail: 'voter2@test.com',
        voterPhone: '0987654321',
        numberOfVotes: 20,
        amount: 10,
        paymentReference: 'ref-stage2-1',
        paymentStatus: 'completed',
      });

      // Get leaderboards
      const leaderboard1 = await leaderboardService.getStageLeaderboard(stage1._id.toString());
      const leaderboard2 = await leaderboardService.getStageLeaderboard(stage2._id.toString());

      // Verify isolation
      expect(leaderboard1).toHaveLength(1);
      expect(leaderboard1[0].nomineeId).toBe(nominee1._id.toString());
      expect(leaderboard1[0].voteCount).toBe(10);

      expect(leaderboard2).toHaveLength(1);
      expect(leaderboard2[0].nomineeId).toBe(nominee2._id.toString());
      expect(leaderboard2[0].voteCount).toBe(20);
    });
  });

  /**
   * Property 15: Leaderboard Consistency
   * Validates: Requirements 5.5, 7.6, 7.7
   */
  describe('Property 15: Leaderboard Consistency', () => {
    it('should match snapshot with live leaderboard at time of closure', async () => {
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();

      const stage = await Stage.create({
        name: 'Test Stage',
        awardId,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startTime: '09:00',
        endTime: '17:00',
        order: 1,
        stageType: 'voting',
        qualificationRule: 'manual',
        status: 'completed',
      });

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

      // Add votes
      await Vote.create({
        awardId,
        categoryId,
        nomineeId: nominee1._id,
        stageId: stage._id,
        voterEmail: 'voter1@test.com',
        voterPhone: '1234567890',
        numberOfVotes: 15,
        amount: 7.5,
        paymentReference: 'ref-1',
        paymentStatus: 'completed',
      });

      await Vote.create({
        awardId,
        categoryId,
        nomineeId: nominee2._id,
        stageId: stage._id,
        voterEmail: 'voter2@test.com',
        voterPhone: '0987654321',
        numberOfVotes: 10,
        amount: 5,
        paymentReference: 'ref-2',
        paymentStatus: 'completed',
      });

      // Get live leaderboard
      const liveLeaderboard = await leaderboardService.getStageLeaderboard(stage._id.toString());

      // Create snapshot
      await leaderboardService.createResultSnapshot(stage._id.toString());

      // Get historical leaderboard
      const historicalLeaderboard = await leaderboardService.getHistoricalLeaderboard(stage._id.toString());

      // Verify consistency
      expect(liveLeaderboard).toHaveLength(2);
      expect(historicalLeaderboard).toHaveLength(2);

      expect(liveLeaderboard[0].nomineeId).toBe(historicalLeaderboard[0].nomineeId);
      expect(liveLeaderboard[0].voteCount).toBe(historicalLeaderboard[0].voteCount);
      expect(liveLeaderboard[0].rank).toBe(historicalLeaderboard[0].rank);

      expect(liveLeaderboard[1].nomineeId).toBe(historicalLeaderboard[1].nomineeId);
      expect(liveLeaderboard[1].voteCount).toBe(historicalLeaderboard[1].voteCount);
      expect(liveLeaderboard[1].rank).toBe(historicalLeaderboard[1].rank);
    });
  });

  describe('Additional LeaderboardService Methods', () => {
    it('should get award leaderboard without stages', async () => {
      const awardId = new mongoose.Types.ObjectId();
      const categoryId = new mongoose.Types.ObjectId();

      const nominee = await Nominee.create({
        name: 'Nominee 1',
        awardId,
        categoryId,
        status: 'published',
      });

      await Vote.create({
        awardId,
        categoryId,
        nomineeId: nominee._id,
        voterEmail: 'voter@test.com',
        voterPhone: '1234567890',
        numberOfVotes: 5,
        amount: 2.5,
        paymentReference: 'ref-no-stage',
        paymentStatus: 'completed',
      });

      const leaderboard = await leaderboardService.getAwardLeaderboard(awardId.toString());
      expect(leaderboard).toHaveLength(1);
      expect(leaderboard[0].voteCount).toBe(5);
    });
  });
});
