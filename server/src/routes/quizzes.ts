import express, { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Aarti, Quiz, QuizQuestion, User } from '../models/index';
import { authMiddleware, hostMiddleware } from '../middleware/auth';
import { generateAartiQuiz, QuizGeneratorOptions } from '../game-engine/aartiQuizGenerator';
import { VERIFIED_AARTIS } from '../data/verifiedAartis';

const router: Router = express.Router();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── GET /api/quizzes ──────────────────────────────────────────────────────────
// List all created & completed quizzes for host
router.get('/', hostMiddleware, async (_req: Request, res: Response) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 }).populate('createdBy', 'name username');
    return res.json({ quizzes });
  } catch (err) {
    console.error('Error fetching quizzes:', err);
    return res.status(500).json({ error: 'Error loading quizzes.' });
  }
});

// ─── GET /api/quizzes/aartis ───────────────────────────────────────────────────
// List all verified Aartis stored in MongoDB (with auto-seed & fail-safe fallback)
router.get('/aartis', authMiddleware, async (_req: Request, res: Response) => {
  try {
    let aartis = await Aarti.find().select('title deity author allLines sections');

    // Self-heal: if MongoDB collection is empty, automatically seed it
    if (!aartis || aartis.length === 0) {
      console.log('[API] Aarti collection empty. Auto-seeding verified Aartis...');
      await Aarti.insertMany(VERIFIED_AARTIS);
      aartis = await Aarti.find().select('title deity author allLines sections');
    }

    const result = (aartis || []).map((a) => {
      const lines = Array.isArray(a.allLines) ? a.allLines : [];
      const sections = Array.isArray(a.sections) ? a.sections : [];
      return {
        _id: a._id,
        title: a.title,
        deity: a.deity,
        author: a.author,
        lineCount: lines.length,
        sectionCount: sections.length,
        preview: lines.slice(0, 2),
      };
    });
    return res.json({ aartis: result });
  } catch (err) {
    console.error('Error fetching Aartis:', err);
    // Bulletproof fallback to in-memory verified Aartis so Admin UI is never broken
    const fallback = VERIFIED_AARTIS.map((a, idx) => ({
      _id: `verified-${idx}`,
      title: a.title,
      deity: a.deity,
      author: a.author,
      lineCount: a.allLines?.length || 0,
      sectionCount: a.sections?.length || 0,
      preview: a.allLines ? a.allLines.slice(0, 2) : [],
    }));
    return res.json({ aartis: fallback });
  }
});

// ─── POST /api/quizzes/:quizId/end ────────────────────────────────────────────
// Host explicitly ends live quiz
router.post('/:quizId/end', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await findQuizByIdOrRoom(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    quiz.status = 'completed';
    quiz.completedAt = new Date();
    await quiz.save();

    const io = req.app.get('io');
    const completePayload = {
      quizId: quiz._id.toString(),
      roomId: quiz.roomId,
      totalQuestions: quiz.totalQuestions,
    };
    io?.to(`quiz:${quiz._id}`)?.emit('quiz:completed', completePayload);
    io?.to(`quiz:${quiz.roomId}`)?.emit('quiz:completed', completePayload);

    return res.json({ message: 'Quiz marked completed.', quiz });
  } catch (err) {
    console.error('End quiz error:', err);
    return res.status(500).json({ error: 'Error ending quiz.' });
  }
});

// ─── POST /api/quizzes/generate ────────────────────────────────────────────────
// Host dynamically generates a fresh Aarti quiz with real-time feedback
router.post('/generate', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const host = (req as any).user;
    const {
      roomId,
      title,
      totalQuestions = 10,
      difficulty = 'mixed',
      selectedTypes = ['mixed'],
      sourceAartis = [],
    } = req.body;

    const count = parseInt(totalQuestions, 10);
    if (isNaN(count) || count < 3 || count > 30) {
      return res.status(400).json({ error: 'Number of questions must be between 3 and 30.' });
    }

    if (!Array.isArray(sourceAartis) || sourceAartis.length === 0) {
      return res.status(400).json({ error: 'Please select at least one Aarti.' });
    }

    // Fetch verified Aartis strictly from MongoDB (with auto-seed if needed)
    let aartis = await Aarti.find({ title: { $in: sourceAartis } });
    if (!aartis || aartis.length === 0) {
      await Aarti.insertMany(VERIFIED_AARTIS);
      aartis = await Aarti.find({ title: { $in: sourceAartis } });
    }
    if (!aartis || aartis.length === 0) {
      aartis = VERIFIED_AARTIS.filter((a) => sourceAartis.includes(a.title)) as any;
    }
    if (!aartis || aartis.length === 0) {
      return res.status(404).json({ error: 'Selected Aartis not found in database.' });
    }

    const app = req.app;
    const io = app.get('io');
    const finalRoomId = roomId ? roomId.trim().toUpperCase() : generateRoomCode();

    // Stream generation progress via Socket.IO if available
    io?.to(`host:${host.userId}`)?.emit('quiz:generation_started', {
      totalQuestions: count,
      sourceAartis,
    });

    const onProgress = (progress: number, message: string) => {
      io?.to(`host:${host.userId}`)?.emit('quiz:generation_progress', { progress, message });
    };

    // Generate fresh questions dynamically from authentic verified text
    const generatorOptions: QuizGeneratorOptions = {
      totalQuestions: count,
      difficulty,
      selectedTypes,
      sourceAartis,
    };

    const generatedRawQuestions = generateAartiQuiz(aartis, generatorOptions, onProgress);

    // Create Quiz in MongoDB
    const quizTitle = title?.trim() || 'Ganapati Aarti Quiz';
    const quiz = await Quiz.create({
      roomId: finalRoomId,
      title: quizTitle,
      totalQuestions: generatedRawQuestions.length,
      difficulty,
      selectedTypes,
      sourceAartis,
      status: 'ready',
      createdBy: host.userId,
      currentQuestionIndex: 0,
    });

    // Save individual questions linked to this quiz
    const questionsToInsert = generatedRawQuestions.map((q) => ({
      ...q,
      quizId: quiz._id,
      createdBy: host.userId,
    }));

    const savedQuestions = await QuizQuestion.insertMany(questionsToInsert);

    io?.to(`host:${host.userId}`)?.emit('quiz:generation_completed', {
      quizId: quiz._id,
      roomId: finalRoomId,
      questionsCount: savedQuestions.length,
    });

    return res.status(201).json({
      quiz,
      questions: savedQuestions,
      message: 'Quiz generated successfully!',
    });
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    const host = (req as any).user;
    req.app.get('io')?.to(`host:${host?.userId}`)?.emit('quiz:generation_failed', {
      error: err.message || 'Quiz generation failed.',
    });
    return res.status(400).json({ error: err.message || 'Error generating quiz.' });
  }
});

// Helper to look up quiz by either Mongo ObjectId or 6-character roomCode
async function findQuizByIdOrRoom(identifier: string) {
  if (identifier && identifier.length === 24 && /^[0-9a-fA-F]{24}$/.test(identifier)) {
    const q = await Quiz.findById(identifier).populate('createdBy', 'name username');
    if (q) return q;
  }
  return await Quiz.findOne({ roomId: identifier.toUpperCase() }).populate('createdBy', 'name username');
}

// ─── GET /api/quizzes/:quizId ─────────────────────────────────────────────────
// Fetch quiz details and questions
router.get('/:quizId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const user = (req as any).user;
    const isHost = user.role === 'host' || user.role === 'admin';

    const quiz = await findQuizByIdOrRoom(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    const questions = await QuizQuestion.find({ quizId: quiz._id }).sort({ createdAt: 1 });

    if (isHost) {
      // Host receives full data including correct answers for preview/control
      return res.json({ quiz, questions });
    } else {
      // Player receives sanitized questions if quiz is not finished
      const sanitized = questions.map((q) => {
        const doc = q.toObject();
        // Hide answers during active play
        if (quiz?.status !== 'completed') {
          delete doc.correctAnswer;
          delete doc.correctOrder;
          delete doc.incorrectWord;
          delete doc.correctWord;
        }
        return doc;
      });
      return res.json({ quiz, questions: sanitized });
    }
  } catch (err) {
    console.error('Fetch quiz error:', err);
    return res.status(500).json({ error: 'Error loading quiz.' });
  }
});

// ─── POST /api/quizzes/:quizId/start ──────────────────────────────────────────
// Host starts live quiz
router.post('/:quizId/start', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await findQuizByIdOrRoom(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    quiz.status = 'active';
    quiz.startedAt = new Date();
    quiz.currentQuestionIndex = 0;
    await quiz.save();

    const firstQuestion = await QuizQuestion.findOne({ quizId: quiz._id }).sort({ createdAt: 1 });

    const io = req.app.get('io');
    const startPayload = {
      quizId: quiz._id,
      roomId: quiz.roomId,
      title: quiz.title,
      totalQuestions: quiz.totalQuestions,
    };
    io?.to(`quiz:${quiz._id}`)?.emit('quiz:started', startPayload);
    io?.to(`quiz:${quiz.roomId}`)?.emit('quiz:started', startPayload);

    let sanitizedFirstQ = null;
    if (firstQuestion) {
      const sanitized = firstQuestion.toObject();
      delete sanitized.correctAnswer;
      delete sanitized.correctOrder;
      delete sanitized.incorrectWord;
      delete sanitized.correctWord;
      sanitizedFirstQ = sanitized;

      const questionPayload = {
        quizId: quiz._id,
        questionId: firstQuestion._id,
        questionNumber: 1,
        totalQuestions: quiz.totalQuestions,
        questionIndex: 0,
        question: sanitized,
        timeLimit: firstQuestion.timeLimit || 25,
        startedAt: Date.now(),
      };

      io?.to(`quiz:${quiz._id}`)?.emit('quiz:question', questionPayload);
      io?.to(`quiz:${quiz.roomId}`)?.emit('quiz:question', questionPayload);
      io?.to(`quiz:${quiz._id}`)?.emit('quiz:next_question', {
        questionIndex: 0,
        totalQuestions: quiz.totalQuestions,
        question: sanitized,
        fullQuestionForHost: firstQuestion,
      });
      io?.to(`quiz:${quiz.roomId}`)?.emit('quiz:next_question', {
        questionIndex: 0,
        totalQuestions: quiz.totalQuestions,
        question: sanitized,
        fullQuestionForHost: firstQuestion,
      });
    }

    return res.json({ quiz, currentQuestion: firstQuestion, sanitizedQuestion: sanitizedFirstQ });
  } catch (err) {
    console.error('Start quiz error:', err);
    return res.status(500).json({ error: 'Error starting quiz.' });
  }
});

// ─── POST /api/quizzes/:quizId/submit ─────────────────────────────────────────
// Player submits an answer
router.post('/:quizId/submit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { quizId } = req.params;
    const { questionId, answer, timeTaken = 5 } = req.body;

    const question = await QuizQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    let isCorrect = false;
    let feedback = '';

    switch (question.type) {
      case 'fill_blank_options':
      case 'mcq':
      case 'true_false':
      case 'missing_line':
        isCorrect = String(answer).trim() === String(question.correctAnswer).trim();
        break;

      case 'arrange_aarti':
        // Array comparison
        if (Array.isArray(answer) && Array.isArray(question.correctOrder)) {
          isCorrect = answer.join(' ').trim() === question.correctOrder.join(' ').trim();
        }
        break;

      case 'incorrect_word':
        // Player picked the incorrect word
        isCorrect = String(answer).trim() === String(question.incorrectWord).trim();
        break;

      case 'incorrect_sentence':
        isCorrect = String(answer).trim() === String(question.correctAnswer).trim();
        break;

      case 'match_lines':
        // Array of { left, right }
        if (Array.isArray(answer) && question.pairs) {
          const pairMap = new Map(question.pairs.map((p: any) => [p.left, p.right]));
          const matchCount = answer.filter((a: any) => pairMap.get(a.left) === a.right).length;
          isCorrect = matchCount === question.pairs.length;
        }
        break;

      default:
        isCorrect = false;
    }

    // Award points based on speed (Kahoot-style dynamic response scoring)
    let pointsEarned = 0;
    const timeLimit = Math.max(question.timeLimit || 25, 5);
    const validTime = Math.min(Math.max(Number(timeTaken) || 0, 0.2), timeLimit);

    if (isCorrect) {
      // Kahoot formula: points = maxPoints * (1 - ((response_time / time_limit) / 2))
      // Instant answer = 100% maxPoints, last-second answer = 50% maxPoints
      const maxPoints = (question.points && question.points >= 100) ? question.points : ((question.points || 10) * 100);
      const speedMultiplier = Math.max(0.5, 1 - ((validTime / timeLimit) / 2));
      pointsEarned = Math.max(Math.round(maxPoints * speedMultiplier), 50);

      await User.findByIdAndUpdate(user.userId, {
        $inc: { totalPoints: pointsEarned },
      });
    }

    return res.json({
      correct: isCorrect,
      points: pointsEarned,
      timeTaken: Math.round(validTime * 10) / 10,
      correctAnswer: question.correctAnswer || question.correctOrder || question.incorrectWord,
      correctWord: question.correctWord,
      sourceAarti: question.sourceAarti,
      sourceLine: question.sourceLine,
      explanation: question.explanation,
    });
  } catch (err) {
    console.error('Submit quiz answer error:', err);
    return res.status(500).json({ error: 'Error submitting answer.' });
  }
});

// ─── POST /api/quizzes/:quizId/regenerate-question ─────────────────────────────
// Host regenerates a single question with a new valid question
router.post('/:quizId/regenerate-question', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const { questionId, type } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    const existingQ = await QuizQuestion.findById(questionId);
    if (!existingQ) return res.status(404).json({ error: 'Question not found.' });

    const targetType = type || existingQ.type;
    const aartis = await Aarti.find({ title: { $in: quiz.sourceAartis } });

    // Generate fresh replacement
    const newQuestions = generateAartiQuiz(aartis, {
      totalQuestions: 1,
      difficulty: quiz.difficulty,
      selectedTypes: [targetType],
      sourceAartis: quiz.sourceAartis,
    });

    if (newQuestions.length === 0) {
      return res.status(400).json({ error: 'Could not generate a new question.' });
    }

    const replacementData = newQuestions[0];
    const updated = await QuizQuestion.findByIdAndUpdate(
      questionId,
      {
        ...replacementData,
        quizId: quiz._id,
      },
      { new: true }
    );

    return res.json({ question: updated, message: 'Question regenerated successfully!' });
  } catch (err: any) {
    console.error('Regenerate question error:', err);
    return res.status(400).json({ error: err.message || 'Error regenerating question.' });
  }
});

// ─── PATCH /api/quizzes/:quizId/questions/:questionId ─────────────────────────
// Host edits a question
router.patch('/:quizId/questions/:questionId', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const updated = await QuizQuestion.findByIdAndUpdate(questionId, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Question not found.' });
    return res.json({ question: updated });
  } catch (err) {
    console.error('Update question error:', err);
    return res.status(500).json({ error: 'Error updating question.' });
  }
});

// ─── DELETE /api/quizzes/:quizId/questions/:questionId ─────────────────────────
// Host deletes a question
router.delete('/:quizId/questions/:questionId', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const { quizId, questionId } = req.params;
    await QuizQuestion.findByIdAndDelete(questionId);
    await Quiz.findByIdAndUpdate(quizId, { $inc: { totalQuestions: -1 } });
    return res.json({ success: true, message: 'Question removed successfully.' });
  } catch (err) {
    console.error('Delete question error:', err);
    return res.status(500).json({ error: 'Error removing question.' });
  }
});

export default router;
