import express, { Router, Request, Response } from 'express';
import { QuizQuestion, QuizGame, User } from '../models/index';
import { authMiddleware, hostMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// GET /api/quiz/questions
router.get('/questions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { category, difficulty, limit = '10' } = req.query;
    const filter: Record<string, string> = {};
    if (category) filter.category = category as string;
    if (difficulty) filter.difficulty = difficulty as string;

    const questions = await QuizQuestion.find(filter)
      .select('-correctAnswer') // Don't expose correct answer in listing
      .limit(parseInt(limit as string))
      .sort({ createdAt: -1 });

    return res.json({ questions });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// POST /api/quiz/start
router.post('/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { category, count = 10 } = req.body;
    const filter: Record<string, string> = {};
    if (category && category !== 'random') filter.category = category;

    const questions = await QuizQuestion.aggregate([
      { $match: filter },
      { $sample: { size: parseInt(count) } },
    ]);

    if (questions.length === 0) {
      return res.status(404).json({ error: 'No questions found for this category' });
    }

    // Don't send correct answers to client
    const safeQuestions = questions.map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
      category: q.category,
      difficulty: q.difficulty,
      timerSeconds: q.timerSeconds,
    }));

    return res.json({ questions: safeQuestions, total: safeQuestions.length });
  } catch {
    return res.status(500).json({ error: 'Failed to start quiz' });
  }
});

// POST /api/quiz/submit
router.post('/submit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const player = (req as any).user;
    const { questionIds, answers, category } = req.body;
    // answers: [{ questionId, selectedOption, timeTaken }]

    if (!questionIds || !answers) {
      return res.status(400).json({ error: 'Missing quiz data' });
    }

    // Fetch correct answers from DB
    const questions = await QuizQuestion.find({ _id: { $in: questionIds } });
    const questionMap = new Map(questions.map((q) => [(q._id as any).toString(), q]));

    let score = 0;
    const processedAnswers = answers.map(
      (a: { questionId: string; selectedOption: number; timeTaken: number }) => {
        const q = questionMap.get(a.questionId);
        const correct = q ? q.correctAnswer === a.selectedOption : false;
        if (correct) score += 10; // 10 points per correct answer
        return { questionId: a.questionId, selectedOption: a.selectedOption, correct, timeTaken: a.timeTaken };
      }
    );

    const quizGame = await QuizGame.create({
      playerId: player.userId,
      questions: questionIds,
      answers: processedAnswers,
      score,
      totalQuestions: questionIds.length,
      category: category || 'random',
      completedAt: new Date(),
    });

    // Update player points
    await User.findByIdAndUpdate(player.userId, {
      $inc: { totalPoints: score, totalGamesPlayed: 1 },
    });

    return res.json({ quizGame, score, totalQuestions: questionIds.length });
  } catch (err) {
    console.error('Submit quiz error:', err);
    return res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// GET /api/quiz/history
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const player = (req as any).user;
    const games = await QuizGame.find({ playerId: player.userId })
      .sort({ createdAt: -1 })
      .limit(20);
    return res.json({ games });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch quiz history' });
  }
});

// ─── Admin Quiz Routes ────────────────────────────────────────────────────────

// GET /api/quiz/admin/questions
router.get('/admin/questions', hostMiddleware, async (_req: Request, res: Response) => {
  try {
    const questions = await QuizQuestion.find().sort({ createdAt: -1 });
    return res.json({ questions });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// POST /api/quiz/admin/questions
router.post('/admin/questions', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const host = (req as any).user;
    const { question, options, correctAnswer, category, difficulty, timerSeconds } = req.body;

    if (!question || !options || correctAnswer === undefined || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const q = await QuizQuestion.create({
      question,
      options,
      correctAnswer,
      category,
      difficulty: difficulty || 'easy',
      timerSeconds: timerSeconds || 30,
      createdBy: host.userId,
    });

    return res.status(201).json({ question: q });
  } catch {
    return res.status(500).json({ error: 'Failed to create question' });
  }
});

// PUT /api/quiz/admin/questions/:id
router.put('/admin/questions/:id', hostMiddleware, async (req: Request, res: Response) => {
  try {
    const q = await QuizQuestion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!q) return res.status(404).json({ error: 'Question not found' });
    return res.json({ question: q });
  } catch {
    return res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /api/quiz/admin/questions/:id
router.delete('/admin/questions/:id', hostMiddleware, async (req: Request, res: Response) => {
  try {
    await QuizQuestion.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete question' });
  }
});

export default router;
