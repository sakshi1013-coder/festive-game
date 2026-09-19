import { Server, Socket } from 'socket.io';
import { HousieGame, HousieTicket, WinnerClaim, User, Quiz, QuizQuestion, Aarti } from './models/index';
import { verifySocketToken, AuthPayload } from './middleware/auth';
import { generateTicket } from './game-engine/ticketGenerator';
import { validateWinClaim, calculatePlayerProgress } from './game-engine/winChecker';
import { generateAartiQuiz, QuizGeneratorOptions } from './game-engine/aartiQuizGenerator';

interface AuthenticatedSocket extends Socket {
  user: AuthPayload;
}

// Track auto-call timers per game
const autoCallTimers = new Map<string, NodeJS.Timeout>();
// Track online players per game: gameId -> Set<userId>
const onlinePlayersPerGame = new Map<string, Set<string>>();
// Track synchronized question timers per quiz: quizId -> Timeout
const quizTimers = new Map<string, NodeJS.Timeout>();

export function initSocket(io: Server): void {
  // ─── Authentication Middleware ─────────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const user = verifySocketToken(token);
    if (!user) {
      return next(new Error('Invalid token'));
    }

    (socket as AuthenticatedSocket).user = user;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const authedSocket = socket as AuthenticatedSocket;
    console.log(`[Socket] Connected: ${authedSocket.user.name} (${authedSocket.user.role})`);

    // ─── Join Game Room ──────────────────────────────────────────────────────
    authedSocket.on('join-game', async ({ gameId }: { gameId: string }) => {
      try {
        let game = null;
        if (gameId && gameId.length === 24 && /^[0-9a-fA-F]{24}$/.test(gameId)) {
          game = await HousieGame.findById(gameId);
        }
        if (!game && gameId) {
          game = await HousieGame.findOne({ roomCode: gameId.toUpperCase() });
        }

        if (!game) {
          authedSocket.emit('error', { message: 'Game not found' });
          return;
        }

        const isHost =
          authedSocket.user.role === 'host' || authedSocket.user.role === 'admin';

        // Verify player has a ticket or auto-generate if active
        let ticket = await HousieTicket.findOne({
          gameId: game._id,
          playerId: authedSocket.user.userId,
        });

        if (!ticket && !isHost && ['open', 'started'].includes(game.status)) {
          const user = await User.findById(authedSocket.user.userId);
          const ticketGrid = generateTicket();
          ticket = await HousieTicket.create({
            gameId: game._id,
            playerId: authedSocket.user.userId,
            playerName: user?.name || authedSocket.user.name,
            username: user?.username || '',
            ticketGrid,
            markedNumbers: [],
          });
        }

        const gameIdStr = game._id.toString();
        authedSocket.join(`game:${gameIdStr}`);
        authedSocket.join(`game:${game.roomCode}`);
        authedSocket.join(`game:${gameIdStr}:user:${authedSocket.user.userId}`);

        // Track online status
        if (!onlinePlayersPerGame.has(gameIdStr)) {
          onlinePlayersPerGame.set(gameIdStr, new Set());
        }
        onlinePlayersPerGame.get(gameIdStr)!.add(authedSocket.user.userId);

        // Send current game state
        const tickets = await HousieTicket.find({ gameId: game._id }).populate(
          'playerId',
          'name username'
        );
        const playerCount = tickets.length;

        authedSocket.emit('game-state', {
          game,
          ticket: isHost ? undefined : ticket,
          tickets: isHost ? tickets : undefined,
          playerCount,
          calledNumbers: game.calledNumbers,
          onlinePlayers: Array.from(onlinePlayersPerGame.get(gameIdStr) || []),
        });

        // Notify others in both rooms
        const joinPayload = {
          userId: authedSocket.user.userId,
          name: authedSocket.user.name,
          playerCount: playerCount,
        };
        io.to(`game:${gameIdStr}`).emit('player-joined', joinPayload);
        io.to(`game:${game.roomCode}`).emit('player-joined', joinPayload);

        console.log(`[Socket] ${authedSocket.user.name} joined game ${game.roomCode}`);
      } catch (err) {
        console.error('[Socket] join-game error:', err);
        authedSocket.emit('error', { message: 'Failed to join game' });
      }
    });

    // ─── Leave Game ──────────────────────────────────────────────────────────
    authedSocket.on('leave-game', ({ gameId }: { gameId: string }) => {
      authedSocket.leave(`game:${gameId}`);
      onlinePlayersPerGame.get(gameId)?.delete(authedSocket.user.userId);
      io.to(`game:${gameId}`).emit('player-left', {
        userId: authedSocket.user.userId,
        name: authedSocket.user.name,
      });
    });

    // ─── Start Game (Host only) ───────────────────────────────────────────────
    authedSocket.on('start-game', async ({ gameId }: { gameId: string }) => {
      if (!isHost(authedSocket)) {
        authedSocket.emit('error', { message: 'Host access required' });
        return;
      }
      try {
        const game = await HousieGame.findById(gameId);
        if (!game) return;

        game.status = 'started';
        game.startedAt = new Date();
        await game.save();

        io.to(`game:${gameId}`).emit('game-started', { game });
        console.log(`[Socket] Game started: ${gameId}`);
      } catch (err) {
        console.error('[Socket] start-game error:', err);
      }
    });

    // ─── Call Number (Host only, server-authoritative) ────────────────────────
    authedSocket.on('call-number', async ({ gameId, manualNumber }: { gameId: string; manualNumber?: number }) => {
      if (!isHost(authedSocket)) {
        authedSocket.emit('error', { message: 'Host access required' });
        return;
      }
      try {
        const game = await HousieGame.findById(gameId);
        if (!game) return;

        if (!['started', 'open'].includes(game.status)) {
          authedSocket.emit('error', { message: 'Game is not active' });
          return;
        }

        const called = new Set(game.calledNumbers);
        if (called.size >= 90) {
          authedSocket.emit('error', { message: 'All numbers have been called' });
          return;
        }

        let nextNumber: number;
        if (manualNumber && !called.has(manualNumber)) {
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

        // Update all player progress
        const tickets = await HousieTicket.find({ gameId });
        const progressUpdates = tickets.map((t: InstanceType<typeof HousieTicket>) => ({
          ticketId: (t._id as any).toString(),
          playerId: (t.playerId as any).toString(),
          progress: calculatePlayerProgress(t.ticketGrid, game.calledNumbers, game.activePatterns),
        }));

        // Broadcast to all in game room
        io.to(`game:${gameId}`).emit('number-called', {
          number: nextNumber,
          calledNumbers: game.calledNumbers,
          totalCalled: game.calledNumbers.length,
          playerProgress: progressUpdates,
        });

        console.log(`[Socket] Number called: ${nextNumber} in game ${gameId}`);
      } catch (err) {
        console.error('[Socket] call-number error:', err);
      }
    });

    // ─── Auto Call Toggle (Host only) ─────────────────────────────────────────
    authedSocket.on(
      'toggle-auto-call',
      async ({ gameId, enabled, interval }: { gameId: string; enabled: boolean; interval?: number }) => {
        if (!isHost(authedSocket)) return;

        if (!enabled) {
          const timer = autoCallTimers.get(gameId);
          if (timer) {
            clearInterval(timer);
            autoCallTimers.delete(gameId);
          }
          io.to(`game:${gameId}`).emit('auto-call-toggled', { enabled: false });
          return;
        }

        const game = await HousieGame.findById(gameId);
        if (!game || !['started', 'open'].includes(game.status)) return;

        const intervalMs = (interval || game.autoCallInterval || 10) * 1000;

        const timer = setInterval(async () => {
          const currentGame = await HousieGame.findById(gameId);
          if (!currentGame || !['started', 'open'].includes(currentGame.status)) {
            clearInterval(timer);
            autoCallTimers.delete(gameId);
            return;
          }

          const called = new Set(currentGame.calledNumbers);
          if (called.size >= 90) {
            clearInterval(timer);
            autoCallTimers.delete(gameId);
            io.to(`game:${gameId}`).emit('all-numbers-called');
            return;
          }

          const remaining = Array.from({ length: 90 }, (_, i) => i + 1).filter(
            (n) => !called.has(n)
          );
          const nextNumber = remaining[Math.floor(Math.random() * remaining.length)];

          currentGame.calledNumbers.push(nextNumber);
          currentGame.currentNumber = nextNumber;
          await currentGame.save();

          const tickets = await HousieTicket.find({ gameId });
          const progressUpdates = tickets.map((t: InstanceType<typeof HousieTicket>) => ({
            ticketId: (t._id as any).toString(),
            playerId: (t.playerId as any).toString(),
            progress: calculatePlayerProgress(
              t.ticketGrid,
              currentGame.calledNumbers,
              currentGame.activePatterns
            ),
          }));

          io.to(`game:${gameId}`).emit('number-called', {
            number: nextNumber,
            calledNumbers: currentGame.calledNumbers,
            totalCalled: currentGame.calledNumbers.length,
            playerProgress: progressUpdates,
          });
        }, intervalMs);

        autoCallTimers.set(gameId, timer);
        io.to(`game:${gameId}`).emit('auto-call-toggled', { enabled: true, interval: intervalMs / 1000 });
      }
    );

    // ─── Pause Game (Host only) ───────────────────────────────────────────────
    authedSocket.on('pause-game', async ({ gameId }: { gameId: string }) => {
      if (!isHost(authedSocket)) return;
      try {
        // Stop auto-call
        const timer = autoCallTimers.get(gameId);
        if (timer) { clearInterval(timer); autoCallTimers.delete(gameId); }

        await HousieGame.findByIdAndUpdate(gameId, { status: 'paused' });
        io.to(`game:${gameId}`).emit('game-paused', { gameId });
      } catch (err) {
        console.error('[Socket] pause-game error:', err);
      }
    });

    // ─── Resume Game (Host only) ──────────────────────────────────────────────
    authedSocket.on('resume-game', async ({ gameId }: { gameId: string }) => {
      if (!isHost(authedSocket)) return;
      try {
        await HousieGame.findByIdAndUpdate(gameId, { status: 'started' });
        io.to(`game:${gameId}`).emit('game-resumed', { gameId });
      } catch (err) {
        console.error('[Socket] resume-game error:', err);
      }
    });

    // ─── Mark Ticket Number (Player clicks called number) ──────────────────────
    authedSocket.on('mark-ticket-number', async ({ gameId, number }: { gameId: string; number: number }) => {
      try {
        const game = await HousieGame.findById(gameId);
        if (!game || !['started', 'open'].includes(game.status)) return;

        // Player can only mark numbers that have actually been called
        if (!game.calledNumbers.includes(number)) {
          authedSocket.emit('mark-error', { number, message: `Number ${number} has not been called yet` });
          return;
        }

        const ticket = await HousieTicket.findOne({
          gameId,
          playerId: authedSocket.user.userId,
        });
        if (!ticket) return;

        const flatNums = ticket.ticketGrid.flat().filter((n: any): n is number => n !== null);
        if (!flatNums.includes(number)) return;

        const currentMarked = new Set(ticket.markedNumbers || []);
        let isNowMarked = false;
        if (currentMarked.has(number)) {
          currentMarked.delete(number);
          isNowMarked = false;
        } else {
          currentMarked.add(number);
          isNowMarked = true;
        }

        ticket.markedNumbers = Array.from(currentMarked);
        await ticket.save();

        authedSocket.emit('ticket-marked', {
          ticketId: ticket._id.toString(),
          markedNumbers: ticket.markedNumbers,
          number,
          isNowMarked,
        });

        // Broadcast to host and room so host sees player's actual marks in real time
        io.to(`game:${gameId}`).emit('player-ticket-updated', {
          ticketId: ticket._id.toString(),
          playerId: authedSocket.user.userId,
          markedNumbers: ticket.markedNumbers,
        });
      } catch (err) {
        console.error('[Socket] mark-ticket-number error:', err);
      }
    });

    // ─── Claim Win (Player) ───────────────────────────────────────────────────
    authedSocket.on('claim-win', async ({ gameId, pattern }: { gameId: string; pattern: string }) => {
      try {
        const game = await HousieGame.findById(gameId);
        if (!game || game.status !== 'started') {
          authedSocket.emit('error', { message: 'Game is not active' });
          return;
        }

        if (!game.activePatterns.includes(pattern)) {
          authedSocket.emit('error', { message: 'Pattern not active' });
          return;
        }

        const ticket = await HousieTicket.findOne({
          gameId,
          playerId: authedSocket.user.userId,
        });
        if (!ticket) {
          authedSocket.emit('error', { message: 'Ticket not found' });
          return;
        }

        // Prevent duplicate claims
        const existingClaim = await WinnerClaim.findOne({
          gameId,
          playerId: authedSocket.user.userId,
          pattern,
          status: { $in: ['pending', 'approved'] },
        });
        if (existingClaim) {
          authedSocket.emit('error', { message: 'Already claimed this pattern' });
          return;
        }

        // Server-side validation
        const validation = validateWinClaim(pattern, ticket.ticketGrid, game.calledNumbers);

        const claim = await WinnerClaim.create({
          gameId,
          playerId: authedSocket.user.userId,
          ticketId: ticket._id,
          pattern,
          claimTime: new Date(),
          calledNumbersAtClaim: [...game.calledNumbers],
          serverValidationResult: validation.valid,
        });

        const claimWithPlayer = {
          ...claim.toJSON(),
          playerName: authedSocket.user.name,
          username: authedSocket.user.userId,
          ticket: ticket.toJSON(),
          validationResult: validation,
        };

        // Notify the player
        authedSocket.emit('claim-submitted', { claim: claimWithPlayer, valid: validation.valid });

        // Notify host
        io.to(`game:${gameId}`).emit('winner-claim-pending', {
          claim: claimWithPlayer,
        });

        console.log(`[Socket] Claim submitted: ${authedSocket.user.name} -> ${pattern}`);
      } catch (err) {
        console.error('[Socket] claim-win error:', err);
      }
    });

    // ─── Approve Claim (Host only) ────────────────────────────────────────────
    authedSocket.on('approve-claim', async ({ claimId }: { claimId: string }) => {
      if (!isHost(authedSocket)) return;
      try {
        const claim = await WinnerClaim.findById(claimId);
        if (!claim) return;

        claim.status = 'approved';
        claim.approvedAt = new Date();
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

        const gameId = claim.gameId.toString();
        const player = await User.findById(claim.playerId);
        io.to(`game:${gameId}`).emit('winner-approved', {
          claimId,
          playerId: claim.playerId.toString(),
          playerName: player?.name || 'A player',
          pattern: claim.pattern,
        });
      } catch (err) {
        console.error('[Socket] approve-claim error:', err);
      }
    });

    // ─── Reject Claim (Host only) ─────────────────────────────────────────────
    authedSocket.on('reject-claim', async ({ claimId, note }: { claimId: string; note?: string }) => {
      if (!isHost(authedSocket)) return;
      try {
        const claim = await WinnerClaim.findByIdAndUpdate(
          claimId,
          { status: 'rejected', hostDecisionNote: note },
          { new: true }
        );
        if (!claim) return;

        const gameId = claim.gameId.toString();
        io.to(`game:${gameId}`).emit('winner-rejected', {
          claimId,
          playerId: claim.playerId.toString(),
          pattern: claim.pattern,
          note,
        });
      } catch (err) {
        console.error('[Socket] reject-claim error:', err);
      }
    });

    // ─── End Game (Host only) ─────────────────────────────────────────────────
    authedSocket.on('end-game', async ({ gameId }: { gameId: string }) => {
      if (!isHost(authedSocket)) return;
      try {
        // Stop auto-call
        const timer = autoCallTimers.get(gameId);
        if (timer) { clearInterval(timer); autoCallTimers.delete(gameId); }

        const game = await HousieGame.findByIdAndUpdate(
          gameId,
          { status: 'completed', endedAt: new Date() },
          { new: true }
        );

        io.to(`game:${gameId}`).emit('game-ended', { game });
        onlinePlayersPerGame.delete(gameId);
      } catch (err) {
        console.error('[Socket] end-game error:', err);
      }
    });

    // ─── Request Game State (reconnect) ──────────────────────────────────────
    authedSocket.on('request-game-state', async ({ gameId }: { gameId: string }) => {
      try {
        const game = await HousieGame.findById(gameId);
        if (!game) return;

        const ticket = await HousieTicket.findOne({
          gameId,
          playerId: authedSocket.user.userId,
        });

        authedSocket.emit('game-state', {
          game,
          ticket,
          calledNumbers: game.calledNumbers,
          onlinePlayers: Array.from(onlinePlayersPerGame.get(gameId) || []),
        });
      } catch (err) {
        console.error('[Socket] request-game-state error:', err);
      }
    });

    // ─── Quiz Rooms & Real-time Events ────────────────────────────────────────

    // Join quiz room
    authedSocket.on('join-quiz', async ({ quizId, roomId }: { quizId?: string; roomId?: string }) => {
      try {
        let quiz = null;
        if (quizId && quizId.length === 24 && /^[0-9a-fA-F]{24}$/.test(quizId)) {
          quiz = await Quiz.findById(quizId);
        }
        if (!quiz && (roomId || quizId)) {
          quiz = await Quiz.findOne({ roomId: (roomId || quizId)!.toUpperCase() });
        }

        if (!quiz) {
          authedSocket.emit('quiz:error', { message: 'Quiz room not found.' });
          return;
        }

        const roomKey = `quiz:${quiz._id}`;
        authedSocket.join(roomKey);
        authedSocket.join(`quiz:${quiz.roomId}`);
        authedSocket.join(`quiz:room:${quiz.roomId}`);
        authedSocket.join(`user:${authedSocket.user.userId}`);

        const hostRole = isHost(authedSocket);
        const questions = await QuizQuestion.find({ quizId: quiz._id }).sort({ createdAt: 1 });

        // Send current state
        const currentQ = questions[quiz.currentQuestionIndex || 0];
        let sanitizedQ = null;
        if (currentQ) {
          sanitizedQ = currentQ.toObject();
          if (!hostRole && quiz.status !== 'completed') {
            delete sanitizedQ.correctAnswer;
            delete sanitizedQ.correctOrder;
            delete sanitizedQ.incorrectWord;
            delete sanitizedQ.correctWord;
          }
        }

        authedSocket.emit('quiz:state', {
          quiz,
          currentQuestionIndex: quiz.currentQuestionIndex || 0,
          currentQuestion: sanitizedQ,
          totalQuestions: quiz.totalQuestions,
          isHost: hostRole,
          activeQuestionId: currentQ?._id,
          timeLimit: currentQ?.timeLimit || 25,
          startedAt: quiz.startedAt ? new Date(quiz.startedAt).getTime() : Date.now(),
        });

        // Notify room of player join
        const joinInfo = {
          userId: authedSocket.user.userId,
          name: authedSocket.user.name,
        };
        io.to(roomKey).emit('quiz:player_joined', joinInfo);
        io.to(`quiz:${quiz.roomId}`).emit('quiz:player_joined', joinInfo);
      } catch (err) {
        console.error('[Socket] join-quiz error:', err);
      }
    });

    // Host generates quiz via socket
    authedSocket.on('host:generate_quiz', async (payload: QuizGeneratorOptions & { roomId?: string; title?: string }) => {
      if (!isHost(authedSocket)) {
        authedSocket.emit('quiz:error', { message: 'Only hosts can generate a quiz.' });
        return;
      }

      try {
        authedSocket.emit('quiz:generation_started', {
          totalQuestions: payload.totalQuestions,
          sourceAartis: payload.sourceAartis,
        });

        const aartis = await Aarti.find({ title: { $in: payload.sourceAartis } });
        if (aartis.length === 0) {
          authedSocket.emit('quiz:generation_failed', { error: 'Selected Aartis not found.' });
          return;
        }

        const onProgress = (progress: number, message: string) => {
          authedSocket.emit('quiz:generation_progress', { progress, message });
        };

        const generated = generateAartiQuiz(aartis, payload, onProgress);
        const code = payload.roomId || Math.random().toString(36).substring(2, 8).toUpperCase();

        const quiz = await Quiz.create({
          roomId: code,
          title: payload.title?.trim() || 'Ganapati Aarti Quiz',
          totalQuestions: generated.length,
          difficulty: payload.difficulty || 'mixed',
          selectedTypes: payload.selectedTypes || ['mixed'],
          sourceAartis: payload.sourceAartis,
          status: 'ready',
          createdBy: authedSocket.user.userId,
          currentQuestionIndex: 0,
        });

        const questionsToInsert = generated.map((q) => ({
          ...q,
          quizId: quiz._id,
          createdBy: authedSocket.user.userId,
        }));

        const saved = await QuizQuestion.insertMany(questionsToInsert);

        authedSocket.emit('quiz:generation_completed', {
          quizId: quiz._id,
          roomId: code,
          questionsCount: saved.length,
          quiz,
          questions: saved,
        });
      } catch (err: any) {
        console.error('[Socket] host:generate_quiz error:', err);
        authedSocket.emit('quiz:generation_failed', { error: err.message || 'Quiz generation failed.' });
      }
    });

    // Host starts live quiz
    authedSocket.on('host:start_quiz', async ({ quizId }: { quizId: string }) => {
      if (!isHost(authedSocket)) {
        authedSocket.emit('error', { message: 'Host access required' });
        return;
      }

      try {
        let quiz = null;
        if (quizId && quizId.length === 24 && /^[0-9a-fA-F]{24}$/.test(quizId)) {
          quiz = await Quiz.findById(quizId);
        }
        if (!quiz && quizId) {
          quiz = await Quiz.findOne({ roomId: quizId.toUpperCase() });
        }
        if (!quiz) return;

        quiz.status = 'active';
        quiz.startedAt = new Date();
        quiz.currentQuestionIndex = 0;
        await quiz.save();

        const firstQ = await QuizQuestion.findOne({ quizId: quiz._id }).sort({ createdAt: 1 });

        const startPayload = {
          quizId: quiz._id,
          roomId: quiz.roomId,
          title: quiz.title,
          totalQuestions: quiz.totalQuestions,
        };
        io.to(`quiz:${quiz._id}`).emit('quiz:started', startPayload);
        io.to(`quiz:${quiz.roomId}`).emit('quiz:started', startPayload);

        if (firstQ) {
          const sanitized = firstQ.toObject();
          delete sanitized.correctAnswer;
          delete sanitized.correctOrder;
          delete sanitized.incorrectWord;
          delete sanitized.correctWord;

          const limit = firstQ.timeLimit || 25;
          const questionPayload = {
            quizId: quiz._id.toString(),
            roomId: quiz.roomId,
            questionId: firstQ._id.toString(),
            questionNumber: 1,
            questionIndex: 0,
            totalQuestions: quiz.totalQuestions,
            question: sanitized,
            timeLimit: limit,
            startedAt: Date.now(),
            fullQuestionForHost: firstQ,
          };

          io.to(`quiz:${quiz._id}`).emit('quiz:question', questionPayload);
          io.to(`quiz:${quiz.roomId}`).emit('quiz:question', questionPayload);
          io.to(`quiz:${quiz._id}`).emit('quiz:next_question', questionPayload);
          io.to(`quiz:${quiz.roomId}`).emit('quiz:next_question', questionPayload);

          // Clear previous timer & set authoritative question timer
          const qTimerKey = quiz._id.toString();
          if (quizTimers.has(qTimerKey)) {
            clearTimeout(quizTimers.get(qTimerKey)!);
          }
          const timer = setTimeout(() => {
            const endPayload = {
              quizId: quiz!._id.toString(),
              roomId: quiz!.roomId,
              questionId: firstQ._id.toString(),
              correctAnswer: firstQ.correctAnswer || firstQ.correctOrder || firstQ.incorrectWord,
              correctWord: firstQ.correctWord,
              sourceAarti: firstQ.sourceAarti,
              sourceLine: firstQ.sourceLine,
              explanation: firstQ.explanation,
            };
            io.to(`quiz:${quiz!._id}`).emit('quiz:question_ended', endPayload);
            io.to(`quiz:${quiz!.roomId}`).emit('quiz:question_ended', endPayload);
          }, limit * 1000 + 1000);
          quizTimers.set(qTimerKey, timer);
        }
      } catch (err) {
        console.error('[Socket] host:start_quiz error:', err);
      }
    });

    // Host moves to next question
    authedSocket.on('host:next_question', async ({ quizId, questionIndex }: { quizId: string; questionIndex: number }) => {
      if (!isHost(authedSocket)) {
        authedSocket.emit('error', { message: 'Host access required' });
        return;
      }

      try {
        let quiz = null;
        if (quizId && quizId.length === 24 && /^[0-9a-fA-F]{24}$/.test(quizId)) {
          quiz = await Quiz.findById(quizId);
        }
        if (!quiz && quizId) {
          quiz = await Quiz.findOne({ roomId: quizId.toUpperCase() });
        }
        if (!quiz) return;

        const qTimerKey = quiz._id.toString();
        if (quizTimers.has(qTimerKey)) {
          clearTimeout(quizTimers.get(qTimerKey)!);
          quizTimers.delete(qTimerKey);
        }

        const questions = await QuizQuestion.find({ quizId: quiz._id }).sort({ createdAt: 1 });
        const nextIdx = questionIndex !== undefined ? questionIndex : (quiz.currentQuestionIndex || 0) + 1;

        if (nextIdx >= questions.length) {
          quiz.status = 'completed';
          quiz.completedAt = new Date();
          await quiz.save();

          const completePayload = {
            quizId: quiz._id.toString(),
            roomId: quiz.roomId,
            totalQuestions: quiz.totalQuestions,
          };
          io.to(`quiz:${quiz._id}`).emit('quiz:completed', completePayload);
          io.to(`quiz:${quiz.roomId}`).emit('quiz:completed', completePayload);
          return;
        }

        quiz.currentQuestionIndex = nextIdx;
        await quiz.save();

        const nextQ = questions[nextIdx];
        const sanitized = nextQ.toObject();
        delete sanitized.correctAnswer;
        delete sanitized.correctOrder;
        delete sanitized.incorrectWord;
        delete sanitized.correctWord;

        const limit = nextQ.timeLimit || 25;
        const questionPayload = {
          quizId: quiz._id.toString(),
          roomId: quiz.roomId,
          questionId: nextQ._id.toString(),
          questionNumber: nextIdx + 1,
          questionIndex: nextIdx,
          totalQuestions: quiz.totalQuestions,
          question: sanitized,
          timeLimit: limit,
          startedAt: Date.now(),
          fullQuestionForHost: nextQ,
        };

        io.to(`quiz:${quiz._id}`).emit('quiz:question', questionPayload);
        io.to(`quiz:${quiz.roomId}`).emit('quiz:question', questionPayload);
        io.to(`quiz:${quiz._id}`).emit('quiz:next_question', questionPayload);
        io.to(`quiz:${quiz.roomId}`).emit('quiz:next_question', questionPayload);

        // Synchronized question timer
        const timer = setTimeout(() => {
          const endPayload = {
            quizId: quiz!._id.toString(),
            roomId: quiz!.roomId,
            questionId: nextQ._id.toString(),
            correctAnswer: nextQ.correctAnswer || nextQ.correctOrder || nextQ.incorrectWord,
            correctWord: nextQ.correctWord,
            sourceAarti: nextQ.sourceAarti,
            sourceLine: nextQ.sourceLine,
            explanation: nextQ.explanation,
          };
          io.to(`quiz:${quiz!._id}`).emit('quiz:question_ended', endPayload);
          io.to(`quiz:${quiz!.roomId}`).emit('quiz:question_ended', endPayload);
        }, limit * 1000 + 1000);
        quizTimers.set(qTimerKey, timer);
      } catch (err) {
        console.error('[Socket] host:next_question error:', err);
      }
    });

    // Host ends question time and reveals answer
    authedSocket.on('host:end_question', async ({ quizId, questionId }: { quizId: string; questionId: string }) => {
      if (!isHost(authedSocket)) {
        authedSocket.emit('error', { message: 'Host access required' });
        return;
      }

      try {
        let quiz = null;
        if (quizId && quizId.length === 24 && /^[0-9a-fA-F]{24}$/.test(quizId)) {
          quiz = await Quiz.findById(quizId);
        }
        if (!quiz && quizId) {
          quiz = await Quiz.findOne({ roomId: quizId.toUpperCase() });
        }

        const qTimerKey = quiz ? quiz._id.toString() : quizId;
        if (quizTimers.has(qTimerKey)) {
          clearTimeout(quizTimers.get(qTimerKey)!);
          quizTimers.delete(qTimerKey);
        }

        const question = await QuizQuestion.findById(questionId);
        if (!question) return;

        const endPayload = {
          quizId: quiz ? quiz._id.toString() : quizId,
          roomId: quiz?.roomId,
          questionId,
          correctAnswer: question.correctAnswer || question.correctOrder || question.incorrectWord,
          correctWord: question.correctWord,
          sourceAarti: question.sourceAarti,
          sourceLine: question.sourceLine,
          explanation: question.explanation,
        };

        io.to(`quiz:${qTimerKey}`).emit('quiz:question_ended', endPayload);
        if (quiz?.roomId) {
          io.to(`quiz:${quiz.roomId}`).emit('quiz:question_ended', endPayload);
        }
      } catch (err) {
        console.error('[Socket] host:end_question error:', err);
      }
    });

    // Player submits answer in real-time
    authedSocket.on('player:submit_answer', async ({ roomId, quizId, questionId, answer, timeTaken }: any) => {
      try {
        let quiz = null;
        if (quizId && quizId.length === 24 && /^[0-9a-fA-F]{24}$/.test(quizId)) {
          quiz = await Quiz.findById(quizId);
        }
        if (!quiz && (roomId || quizId)) {
          quiz = await Quiz.findOne({ roomId: (roomId || quizId).toUpperCase() });
        }

        const question = await QuizQuestion.findById(questionId);
        if (!question) {
          authedSocket.emit('player:submit_error', { message: 'Question not found.' });
          return;
        }

        // 1. Immediately acknowledge submission so player UI never freezes
        authedSocket.emit('player:answer_received', {
          questionId,
          received: true,
          timestamp: Date.now(),
        });

        let isCorrect = false;
        switch (question.type) {
          case 'fill_blank_options':
          case 'mcq':
          case 'true_false':
          case 'missing_line':
            isCorrect = String(answer).trim() === String(question.correctAnswer).trim();
            break;
          case 'arrange_aarti':
            if (Array.isArray(answer) && Array.isArray(question.correctOrder)) {
              isCorrect = answer.join(' ').trim() === question.correctOrder.join(' ').trim();
            }
            break;
          case 'incorrect_word':
            isCorrect = String(answer).trim() === String(question.incorrectWord).trim();
            break;
          case 'incorrect_sentence':
            isCorrect = String(answer).trim() === String(question.correctAnswer).trim();
            break;
          case 'match_lines':
            if (Array.isArray(answer) && question.pairs) {
              const pairMap = new Map(question.pairs.map((p: any) => [p.left, p.right]));
              const matchCount = answer.filter((a: any) => pairMap.get(a.left) === a.right).length;
              isCorrect = matchCount === question.pairs.length;
            }
            break;
        }

        let points = 0;
        if (isCorrect) {
          points = question.points || 10;
          if (timeTaken <= (question.timeLimit || 25) / 2) {
            points += 5; // Fast response bonus
          }
          await User.findByIdAndUpdate(authedSocket.user.userId, {
            $inc: { totalPoints: points },
          });
        }

        // Return individual result to player
        authedSocket.emit('player:answer_result', {
          questionId,
          correct: isCorrect,
          points,
          correctAnswer: question.correctAnswer || question.correctOrder || question.incorrectWord,
          correctWord: question.correctWord,
          sourceAarti: question.sourceAarti,
          sourceLine: question.sourceLine,
          explanation: question.explanation,
        });

        // Broadcast to host that player answered
        const targetRoom = quiz ? `quiz:${quiz._id}` : `quiz:${quizId}`;
        const answerBroadcast = {
          userId: authedSocket.user.userId,
          name: authedSocket.user.name,
          correct: isCorrect,
          questionId,
        };
        io.to(targetRoom).emit('quiz:player_answered', answerBroadcast);
        if (quiz?.roomId) {
          io.to(`quiz:${quiz.roomId}`).emit('quiz:player_answered', answerBroadcast);
        }
      } catch (err) {
        console.error('[Socket] player:submit_answer error:', err);
        authedSocket.emit('player:submit_error', { message: 'Submission error. Please retry.' });
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    authedSocket.on('disconnect', () => {
      // Remove from all online tracking
      for (const [gameId, players] of onlinePlayersPerGame.entries()) {
        if (players.has(authedSocket.user.userId)) {
          players.delete(authedSocket.user.userId);
          io.to(`game:${gameId}`).emit('player-left', {
            userId: authedSocket.user.userId,
            name: authedSocket.user.name,
          });
        }
      }
      console.log(`[Socket] Disconnected: ${authedSocket.user.name}`);
    });
  });
}

function isHost(socket: AuthenticatedSocket): boolean {
  return socket.user.role === 'host' || socket.user.role === 'admin';
}
