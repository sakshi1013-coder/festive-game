import express, { Router, Request, Response } from 'express';
import { User, QuizGame, HousieGame, HousieTicket, WinnerClaim } from '../models/index';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// GET /api/leaderboard?tab=overall|quiz|housie&limit=20
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tab = 'overall', limit = '20' } = req.query;
    const lim = parseInt(limit as string);
    const player = (req as any).user;

    let leaderboard: any[] = [];

    if (tab === 'quiz') {
      // Top players by quiz score (sum of quiz game scores) - EXCLUDE HOSTS
      leaderboard = await QuizGame.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'playerId',
            foreignField: '_id',
            as: 'player',
          },
        },
        { $unwind: '$player' },
        { $match: { 'player.role': { $ne: 'host' } } },
        {
          $group: {
            _id: '$playerId',
            totalScore: { $sum: '$score' },
            gamesPlayed: { $sum: 1 },
            player: { $first: '$player' },
          },
        },
        { $sort: { totalScore: -1 } },
        { $limit: lim },
        {
          $project: {
            name: '$player.name',
            username: '$player.username',
            avatar: '$player.avatar',
            role: '$player.role',
            totalScore: 1,
            gamesPlayed: 1,
          },
        },
      ]);
    } else if (tab === 'housie') {
      // Top players by housie wins - EXCLUDE HOSTS
      leaderboard = await User.find({ role: { $ne: 'host' } })
        .select('name username avatar role totalWins totalPoints totalGamesPlayed')
        .sort({ totalWins: -1 })
        .limit(lim);
    } else {
      // Overall: by total points - EXCLUDE HOSTS
      leaderboard = await User.find({ role: { $ne: 'host' } })
        .select('name username avatar role totalWins totalLosses totalPoints totalGamesPlayed')
        .sort({ totalPoints: -1 })
        .limit(lim);
    }

    // Find current player's rank (only for players; host is excluded from ranking)
    let playerRank = 0;
    if (player && player.role !== 'host') {
      const allPlayers = await User.find({ role: { $ne: 'host' } })
        .select('totalPoints')
        .sort({ totalPoints: -1 });
      const idx = allPlayers.findIndex((p) => (p._id as any).toString() === player.userId);
      playerRank = idx !== -1 ? idx + 1 : 0;
    }

    return res.json({ leaderboard, playerRank });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/leaderboard/me - Player's own stats
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const player = (req as any).user;
    const user = await User.findById(player.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const quizGames = await QuizGame.find({ playerId: player.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    const housieTickets = await HousieTicket.find({ playerId: player.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    const wins = await WinnerClaim.find({
      playerId: player.userId,
      status: 'approved',
    })
      .sort({ approvedAt: -1 })
      .limit(10)
      .populate('gameId', 'name roomCode');

    // Rank (only for players; host is excluded from rankings)
    let rank = 0;
    if (user.role !== 'host') {
      const allPlayers = await User.find({ role: { $ne: 'host' } })
        .select('totalPoints')
        .sort({ totalPoints: -1 });
      const idx = allPlayers.findIndex((p) => (p._id as any).toString() === player.userId);
      rank = idx !== -1 ? idx + 1 : 0;
    }

    return res.json({ user, quizGames, housieTickets, wins, rank });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

export default router;
