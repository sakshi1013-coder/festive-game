import express, { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { HousieGame, HousieTicket, WinnerClaim, User } from '../models/index';
import { authMiddleware, hostMiddleware } from '../middleware/auth';
import { generateTicket } from '../game-engine/ticketGenerator';
import { validateWinClaim, calculatePlayerProgress } from '../game-engine/winChecker';

const router: Router = express.Router();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// POST /api/housie/create  (host only)
router.post('/create', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const host = (req as any).user;
    const { name, description, maxPlayers, activePatterns, autoCallInterval } = req.body;

    if (!name) return res.status(400).json({ error: 'Game name is required' });

    let roomCode: string;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      const exists = await HousieGame.findOne({ roomCode });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);

    const game = await HousieGame.create({
      name: name.trim(),
      description: description?.trim(),
      roomCode: roomCode!,
      hostId: host.userId,
      status: 'open',
      maxPlayers: maxPlayers || 20,
      calledNumbers: [],
      activePatterns: activePatterns || [
        'early-five',
        'top-line',
        'middle-line',
        'bottom-line',
        'full-house',
      ],
      autoCallInterval: autoCallInterval || 10,
    });

    return res.status(201).json({ game });
  } catch (err) {
    console.error('Create Housie error:', err);
    return res.status(500).json({ error: 'Failed to create game' });
  }
});

// GET /api/housie/available
router.get('/available', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const games = await HousieGame.find({ status: { $in: ['open', 'started'] } })
      .populate('hostId', 'name username')
      .sort({ createdAt: -1 })
      .limit(20);

    const gamesWithCounts = await Promise.all(
      games.map(async (g) => {
        const playerCount = await HousieTicket.countDocuments({ gameId: g._id });
        return { ...g.toJSON(), playerCount };
      })
    );

    return res.json({ games: gamesWithCounts });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// POST /api/housie/join
router.post('/join', authMiddleware, async (req: Request, res: Response) => {
  try {
    const player = (req as any).user;
    const { roomCode } = req.body;

    if (!roomCode) return res.status(400).json({ error: 'Room code is required' });

    const game = await HousieGame.findOne({ roomCode: roomCode.toUpperCase() });
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (!['open', 'started'].includes(game.status)) {
      return res.status(400).json({ error: 'Game is not accepting players' });
    }

    // Check if already joined
    const existingTicket = await HousieTicket.findOne({
      gameId: game._id,
      playerId: player.userId,
    });

    if (existingTicket) {
      return res.json({ game, ticket: existingTicket, alreadyJoined: true });
    }

    // Check capacity
    const playerCount = await HousieTicket.countDocuments({ gameId: game._id });
    if (playerCount >= game.maxPlayers) {
      return res.status(400).json({ error: 'Game is full' });
    }

    // Generate ticket
    const user = await User.findById(player.userId);
    const ticketGrid = generateTicket();

    const ticket = await HousieTicket.create({
      gameId: game._id,
      playerId: player.userId,
      playerName: user?.name || player.name,
      username: user?.username || '',
      ticketGrid,
      markedNumbers: [],
    });

    return res.status(201).json({ game, ticket });
  } catch (err) {
    console.error('Join error:', err);
    return res.status(500).json({ error: 'Failed to join game' });
  }
});

// GET /api/housie/:gameId
router.get('/:gameId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const game = await HousieGame.findById(req.params.gameId).populate(
      'hostId',
      'name username'
    );
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const playerCount = await HousieTicket.countDocuments({ gameId: game._id });
    return res.json({ game, playerCount });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// GET /api/housie/:gameId/ticket
router.get('/:gameId/ticket', authMiddleware, async (req: Request, res: Response) => {
  try {
    const player = (req as any).user;
    const ticket = await HousieTicket.findOne({
      gameId: req.params.gameId,
      playerId: player.userId,
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    return res.json({ ticket });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// POST /api/housie/:gameId/claim
router.post('/:gameId/claim', authMiddleware, async (req: Request, res: Response) => {
  try {
    const player = (req as any).user;
    const { pattern } = req.body;

    const game = await HousieGame.findById(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (game.status !== 'started') {
      return res.status(400).json({ error: 'Game is not active' });
    }

    if (!game.activePatterns.includes(pattern)) {
      return res.status(400).json({ error: 'Pattern not active in this game' });
    }

    const ticket = await HousieTicket.findOne({
      gameId: game._id,
      playerId: player.userId,
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Prevent duplicate claims
    const existingClaim = await WinnerClaim.findOne({
      gameId: game._id,
      playerId: player.userId,
      pattern,
      status: { $in: ['pending', 'approved'] },
    });
    if (existingClaim) {
      return res.status(409).json({ error: 'You have already claimed this pattern' });
    }

    // Server-side validation
    const validation = validateWinClaim(pattern, ticket.ticketGrid, game.calledNumbers);

    const claim = await WinnerClaim.create({
      gameId: game._id,
      playerId: player.userId,
      ticketId: ticket._id,
      pattern,
      claimTime: new Date(),
      calledNumbersAtClaim: [...game.calledNumbers],
      serverValidationResult: validation.valid,
    });

    return res.status(201).json({
      claim,
      validationResult: validation,
    });
  } catch (err) {
    console.error('Claim error:', err);
    return res.status(500).json({ error: 'Failed to submit claim' });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /api/housie/admin/games
router.get('/admin/games', hostMiddleware, async (_req: Request, res: Response) => {
  try {
    const games = await HousieGame.find()
      .populate('hostId', 'name username')
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json({ games });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// POST /api/housie/admin/:gameId/call (server-authoritative number call)
router.post('/admin/:gameId/call', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const game = await HousieGame.findById(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (!['started', 'open'].includes(game.status)) {
      return res.status(400).json({ error: 'Game is not active' });
    }

    const called = new Set(game.calledNumbers);
    if (called.size >= 90) {
      return res.status(400).json({ error: 'All 90 numbers have been called' });
    }

    const { manualNumber } = req.body;
    let nextNumber: number;

    if (manualNumber) {
      if (called.has(manualNumber)) {
        return res.status(400).json({ error: 'Number already called' });
      }
      nextNumber = manualNumber;
    } else {
      const remaining = Array.from({ length: 90 }, (_, i) => i + 1).filter(
        (n) => !called.has(n)
      );
      nextNumber = remaining[Math.floor(Math.random() * remaining.length)];
    }

    game.calledNumbers.push(nextNumber);
    game.currentNumber = nextNumber;
    if (game.status === 'open') game.status = 'started';
    await game.save();

    const io = req.app.get('io');
    if (io) {
      const tickets = await HousieTicket.find({ gameId: game._id });
      const progressUpdates = tickets.map((t: any) => ({
        ticketId: t._id.toString(),
        playerId: t.playerId.toString(),
        progress: calculatePlayerProgress(t.ticketGrid, game.calledNumbers, game.activePatterns),
      }));

      io.to(`game:${game._id}`).emit('number-called', {
        number: nextNumber,
        calledNumbers: game.calledNumbers,
        totalCalled: game.calledNumbers.length,
        playerProgress: progressUpdates,
      });
    }

    return res.json({ calledNumber: nextNumber, game });
  } catch (err) {
    console.error('Call number error:', err);
    return res.status(500).json({ error: 'Failed to call number' });
  }
});

// POST /api/housie/admin/:gameId/pause
router.post('/admin/:gameId/pause', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const game = await HousieGame.findById(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    game.status = 'paused';
    await game.save();

    const io = req.app.get('io');
    if (io) io.to(`game:${game._id}`).emit('game-paused', { gameId: game._id });

    return res.json({ game });
  } catch {
    return res.status(500).json({ error: 'Failed to pause game' });
  }
});

// POST /api/housie/admin/:gameId/resume
router.post('/admin/:gameId/resume', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const game = await HousieGame.findById(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    game.status = 'started';
    await game.save();

    const io = req.app.get('io');
    if (io) io.to(`game:${game._id}`).emit('game-resumed', { gameId: game._id });

    return res.json({ game });
  } catch {
    return res.status(500).json({ error: 'Failed to resume game' });
  }
});

// POST /api/housie/admin/:gameId/end
router.post('/admin/:gameId/end', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const game = await HousieGame.findById(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    game.status = 'completed';
    game.endedAt = new Date();
    await game.save();

    const io = req.app.get('io');
    if (io) io.to(`game:${game._id}`).emit('game-ended', { game });

    // Award losses to players who didn't win
    const allTickets = await HousieTicket.find({ gameId: game._id });
    const winnerIds = new Set(game.winners.map((w: any) => w.playerId.toString()));

    for (const ticket of allTickets) {
      const pid = ticket.playerId.toString();
      if (!winnerIds.has(pid)) {
        await User.findByIdAndUpdate(pid, {
          $inc: { totalLosses: 1, totalGamesPlayed: 1 },
        });
      } else {
        await User.findByIdAndUpdate(pid, {
          $inc: { totalGamesPlayed: 1 },
        });
      }
    }

    return res.json({ game });
  } catch {
    return res.status(500).json({ error: 'Failed to end game' });
  }
});

// GET /api/housie/admin/:gameId/tickets
router.get('/admin/:gameId/tickets', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const game = await HousieGame.findById(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const tickets = await HousieTicket.find({ gameId: game._id }).populate(
      'playerId',
      'name username email'
    );

    const claims = await WinnerClaim.find({ gameId: game._id });

    const ticketsWithProgress = tickets.map((t) => {
      const { calculatePlayerProgress } = require('../game-engine/winChecker');
      const progress = calculatePlayerProgress(
        t.ticketGrid,
        game.calledNumbers,
        game.activePatterns
      );
      const playerClaims = claims.filter(
        (c) => c.playerId.toString() === t.playerId.toString()
      );
      return {
        ...t.toJSON(),
        progress,
        claims: playerClaims,
      };
    });

    return res.json({ tickets: ticketsWithProgress, game });
  } catch (err) {
    console.error('Get tickets error:', err);
    return res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// GET /api/housie/admin/:gameId/claims
router.get('/admin/:gameId/claims', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const claims = await WinnerClaim.find({ gameId: req.params.gameId })
      .populate('playerId', 'name username')
      .populate('ticketId')
      .sort({ claimTime: -1 });
    return res.json({ claims });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// POST /api/housie/admin/claims/:claimId/approve
router.post(
  '/admin/claims/:claimId/approve',
  hostMiddleware,
  async (req: Request, res: Response) => {
    try {
      const host = (req as any).user;
      const claim = await WinnerClaim.findById(req.params.claimId);
      if (!claim) return res.status(404).json({ error: 'Claim not found' });

      claim.status = 'approved';
      claim.approvedAt = new Date();
      claim.approvedBy = new mongoose.Types.ObjectId(host.userId);
      await claim.save();

      // Update game winners
      await HousieGame.findByIdAndUpdate(claim.gameId, {
        $push: {
          winners: {
            playerId: claim.playerId,
            pattern: claim.pattern,
            claimId: claim._id,
            approvedAt: new Date(),
          },
        },
      });

      // Update player stats
      await User.findByIdAndUpdate(claim.playerId, {
        $inc: { totalWins: 1, totalPoints: 50 },
      });

      return res.json({ claim });
    } catch {
      return res.status(500).json({ error: 'Failed to approve claim' });
    }
  }
);

// POST /api/housie/admin/claims/:claimId/reject
router.post(
  '/admin/claims/:claimId/reject',
  hostMiddleware,
  async (req: Request, res: Response) => {
    try {
      const host = (req as any).user;
      const { note } = req.body;
      const claim = await WinnerClaim.findById(req.params.claimId);
      if (!claim) return res.status(404).json({ error: 'Claim not found' });

      claim.status = 'rejected';
      claim.approvedBy = new mongoose.Types.ObjectId(host.userId);
      claim.hostDecisionNote = note;
      await claim.save();

      return res.json({ claim });
    } catch {
      return res.status(500).json({ error: 'Failed to reject claim' });
    }
  }
);

export default router;
