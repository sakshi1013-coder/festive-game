'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, CheckCircle, ChevronRight, Trophy, RefreshCw, Award, Sparkles, Flame, BookOpen, Star, History, Clock } from 'lucide-react';
import { quizApi } from '@/lib/api';
import { QuizQuestion, QUIZ_CATEGORIES } from '@/types/index';
import { SEED_QUESTIONS } from '@/data/quizQuestions';

type Phase = 'select' | 'playing' | 'result';

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const CATEGORY_NAMES: Record<string, string> = {
  'Ganapati Basics': 'Ganapati Basics',
  'Ganesh Chaturthi Traditions': 'Festival Traditions',
  'Maharashtra Culture': 'Culture & Heritage',
  'Modak & Festival Food': 'Modak & Festive Food',
  'Ganapati History': 'Mythology & History',
  'Festival Knowledge': 'Festival Knowledge',
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const getCategoryIcon = (iconName?: string) => {
  switch (iconName) {
    case 'Flame': return <Flame className="w-6 h-6 text-primary" />;
    case 'BookOpen': return <BookOpen className="w-6 h-6 text-primary" />;
    case 'Award': return <Award className="w-6 h-6 text-primary" />;
    case 'Star': return <Star className="w-6 h-6 text-primary" />;
    case 'History': return <History className="w-6 h-6 text-primary" />;
    case 'Trophy': return <Trophy className="w-6 h-6 text-primary" />;
    default: return <Sparkles className="w-6 h-6 text-primary" />;
  }
};

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>('select');
  const [category, setCategory] = useState('random');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selectedOption: number; timeTaken: number }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Start quiz
  const startQuiz = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await quizApi.start(category, 10);
      if (res.data?.questions && res.data.questions.length > 0) {
        setQuestions(res.data.questions);
      } else {
        throw new Error('No questions returned');
      }
    } catch {
      // Offline fallback: Pick 10 Marathi questions matching category from SEED_QUESTIONS
      console.warn('API unavailable or empty, using offline Marathi questions');
      let pool = SEED_QUESTIONS;
      if (category !== 'random') {
        pool = SEED_QUESTIONS.filter((q) => q.category === category);
        if (pool.length === 0) pool = SEED_QUESTIONS;
      }
      const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 10);
      setQuestions(shuffled.map((q, idx) => ({ ...q, _id: `offline-${idx}` } as unknown as QuizQuestion)));
    } finally {
      setPhase('playing');
      setCurrent(0);
      setAnswers([]);
      setScore(0);
      setSelected(null);
      setRevealed(false);
      setLoading(false);
    }
  };

  const currentQuestion = questions[current];

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || revealed) return;
    setTimeLeft(currentQuestion?.timerSeconds || 25);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleAnswer(-1); // Time's up
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current!);
  }, [current, phase]);

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (revealed) return;
      clearInterval(timerRef.current!);
      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
      setSelected(optionIndex);
      setRevealed(true);

      const answer = {
        questionId: currentQuestion._id,
        selectedOption: optionIndex,
        timeTaken,
      };
      setAnswers((prev) => [...prev, answer]);
    },
    [currentQuestion, revealed]
  );

  // Submit to server after last question
  useEffect(() => {
    if (revealed && current === questions.length - 1 && questions.length > 0) {
      setTimeout(() => finishQuiz(), 1800);
    }
  }, [revealed, current, questions.length]);

  const nextQuestion = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const finishQuiz = async () => {
    try {
      const res = await quizApi.submit({
        questionIds: questions.map((q) => q._id),
        answers,
        category,
      });
      setScore(res.data.score);
    } catch {
      // Calculate score locally if offline
      let localScore = 0;
      answers.forEach((ans, idx) => {
        const q = questions[idx];
        if (q && q.correctAnswer === ans.selectedOption) {
          localScore += 10;
        }
      });
      setScore(localScore);
    }
    setPhase('result');
  };

  const timerPercent = (timeLeft / (currentQuestion?.timerSeconds || 25)) * 100;

  // ─── Select Category ───────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="page-transition space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-light text-primary rounded-full text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Ganapati Quiz
          </div>
          <h1 className="text-3xl font-black text-bappa-text">Festival Knowledge Challenge</h1>
          <p className="text-bappa-muted mt-1">
            Test your knowledge of Lord Ganesha, festival traditions, modak recipes, and sacred lore.
          </p>
        </div>

        {error && (
          <div className="bg-error-light border border-error/20 text-error rounded-xl px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        <div>
          <h2 className="font-bold text-bappa-text mb-4 text-lg">Select Category:</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUIZ_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`card text-left transition-all duration-200 hover:-translate-y-0.5 ${
                  category === cat.value
                    ? 'border-primary shadow-saffron bg-primary-light ring-2 ring-primary/30'
                    : 'hover:shadow-card-hover'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-primary-light/60 flex items-center justify-center mb-3">
                  {getCategoryIcon(cat.icon)}
                </div>
                <div className="font-bold text-bappa-text text-base">{cat.label}</div>
                <div className="text-xs text-bappa-muted mt-1">
                  {cat.value === 'random' ? '10 Mixed Questions' : 'Curated category questions'}
                </div>
                {category === cat.value && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-primary font-bold">
                    <CheckCircle className="w-4 h-4 text-primary" /> Selected
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="card bg-surface-secondary">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-bappa-text">10</div>
              <div className="text-xs text-bappa-muted">Questions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-bappa-text">25s</div>
              <div className="text-xs text-bappa-muted">Per Question</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-bappa-text">+10 pts</div>
              <div className="text-xs text-bappa-muted">Correct Answer</div>
            </div>
          </div>
        </div>

        <button
          onClick={startQuiz}
          className="btn-primary btn-lg w-full sm:w-auto shadow-saffron flex items-center justify-center gap-2 text-base font-bold"
          disabled={loading}
        >
          {loading ? 'Loading questions…' : `Start Quiz — ${QUIZ_CATEGORIES.find(c => c.value === category)?.label || 'All Questions'}`}
        </button>
      </div>
    );
  }

  // ─── Playing ───────────────────────────────────────────────────────────────
  if (phase === 'playing' && currentQuestion) {
    const categoryDisplay = CATEGORY_NAMES[currentQuestion.category] || currentQuestion.category;
    const difficultyDisplay = DIFFICULTY_LABELS[currentQuestion.difficulty] || currentQuestion.difficulty;

    return (
      <div className="page-transition max-w-2xl mx-auto space-y-6">
        {/* Progress & Timer */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-bappa-muted">
            Question {current + 1} of {questions.length}
          </span>
          <div className="flex items-center gap-2 text-sm font-extrabold text-bappa-text bg-surface px-3 py-1.5 rounded-full border border-bappa-border shadow-sm">
            <Timer className="w-4 h-4 text-primary animate-pulse" />
            <span>{timeLeft}s left</span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="w-full h-2.5 bg-bappa-border rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-all ${
              timerPercent > 50 ? 'bg-success' : timerPercent > 25 ? 'bg-gold' : 'bg-error'
            }`}
            animate={{ width: `${timerPercent}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="card shadow-card-lg border-primary/20"
          >
            <div className="flex items-start gap-2 mb-4">
              <span className="badge-saffron text-xs flex-shrink-0 font-bold">{categoryDisplay}</span>
              <span className={`badge text-xs flex-shrink-0 font-bold ${
                currentQuestion.difficulty === 'hard' ? 'badge-maroon' :
                currentQuestion.difficulty === 'medium' ? 'badge-gold' : 'badge-success'
              }`}>{difficultyDisplay}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-bappa-text mb-6 leading-relaxed">
              {currentQuestion.question}
            </h2>

            <div className="grid sm:grid-cols-2 gap-3">
              {currentQuestion.options.map((option, i) => {
                let cellClass = 'border-2 border-bappa-border bg-surface hover:border-primary hover:bg-primary-light shadow-sm';
                if (revealed) {
                  cellClass = selected === i
                    ? 'border-2 border-primary bg-primary-light shadow-saffron'
                    : 'border-2 border-bappa-border bg-surface opacity-60';
                } else if (selected === i) {
                  cellClass = 'border-2 border-primary bg-primary-light';
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={revealed}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200 font-medium ${cellClass} disabled:cursor-default`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 transition-colors ${
                      selected === i ? 'bg-primary text-white shadow-sm' : 'bg-surface-secondary text-bappa-text border border-bappa-border'
                    }`}>
                      {OPTION_LETTERS[i] || (i + 1)}
                    </span>
                    <span className="text-sm sm:text-base text-bappa-text font-semibold">{option}</span>
                  </button>
                );
              })}
            </div>

            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 p-3.5 bg-primary-light rounded-xl border border-primary/20 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-sm text-primary font-bold">
                  {selected === -1 ? 'Time is up! Moving to the next question...' : 'Answer recorded!'}
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Next button */}
        {revealed && current < questions.length - 1 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={nextQuestion}
            className="btn-primary btn-lg w-full shadow-saffron flex items-center justify-center gap-2 font-bold"
          >
            Next Question <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}

        {revealed && current === questions.length - 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-primary font-bold text-sm bg-primary-light py-2 rounded-xl"
          >
            Evaluating final score…
          </motion.div>
        )}
      </div>
    );
  }

  // ─── Result ────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const totalPossible = questions.length * 10;
    const pct = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="page-transition max-w-lg mx-auto"
      >
        <div className="card text-center shadow-card-lg border-primary/20">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-9 h-9 text-primary" />
          </div>
          <h2 className="text-3xl font-black text-bappa-text">Congratulations! Quiz Completed!</h2>
          <p className="text-bappa-muted mt-2 mb-6 font-medium">
            {pct >= 80
              ? 'Outstanding performance! Blessed with divine knowledge and wisdom.'
              : pct >= 50
              ? 'Great effort! You have impressive knowledge of Ganapati traditions.'
              : 'Good participation! Keep practicing to master all festival traditions.'}
          </p>

          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-6xl font-black text-primary">{score}</span>
            <span className="text-2xl text-bappa-muted font-bold">/ {totalPossible}</span>
          </div>
          <div className="text-bappa-muted font-semibold mb-6">Total Points Achieved</div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-surface-secondary rounded-xl p-3.5 border border-bappa-border">
              <div className="text-2xl font-black text-bappa-text">{pct}%</div>
              <div className="text-xs text-bappa-muted font-medium mt-0.5">Accuracy</div>
            </div>
            <div className="bg-surface-secondary rounded-xl p-3.5 border border-bappa-border">
              <div className="text-2xl font-black text-bappa-text">{questions.length}</div>
              <div className="text-xs text-bappa-muted font-medium mt-0.5">Questions</div>
            </div>
            <div className="bg-success-light rounded-xl p-3.5 border border-success/20">
              <div className="text-2xl font-black text-success">+{score}</div>
              <div className="text-xs text-success/80 font-medium mt-0.5">Points Added</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setPhase('select')}
              className="btn-outline flex-1 flex items-center justify-center gap-2 font-bold py-3"
            >
              <RefreshCw className="w-4 h-4" /> Play Again
            </button>
            <a
              href="/leaderboard"
              className="btn-gold flex-1 flex items-center justify-center gap-2 font-bold py-3"
            >
              <Trophy className="w-4 h-4" /> View Leaderboard
            </a>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
