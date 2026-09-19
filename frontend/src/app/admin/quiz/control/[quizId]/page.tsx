'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Play,
  SkipForward,
  Eye,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Users,
  Timer,
  BookOpen,
  Award,
  HelpCircle,
  ChevronRight,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Flame,
  Link2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { quizzesApi } from '@/lib/api';
import {
  DynamicQuiz,
  DynamicQuizQuestion,
  QUESTION_TYPE_LABELS,
} from '@/types/index';

export default function HostQuizControlPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params?.quizId as string;
  const { user, token } = useAuth();

  const [quiz, setQuiz] = useState<DynamicQuiz | null>(null);
  const [questions, setQuestions] = useState<DynamicQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Live timer state
  const [timeLeft, setTimeLeft] = useState<number>(25);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Players tracking
  const [joinedPlayers, setJoinedPlayers] = useState<Set<string>>(new Set());
  const [answeredPlayers, setAnsweredPlayers] = useState<
    Array<{ userId: string; name: string; correct?: boolean }>
  >([]);

  // Load quiz details via REST
  const loadQuiz = useCallback(async () => {
    if (!quizId) return;
    try {
      setLoading(true);
      const res = await quizzesApi.get(quizId);
      setQuiz(res.data.quiz);
      setQuestions(res.data.questions);
      const idx = res.data.quiz.currentQuestionIndex || 0;
      setCurrentIndex(idx);
      const initialLimit = res.data.questions[idx]?.timeLimit || 25;
      setTimeLeft(initialLimit);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load quiz details.');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  // Connect to Socket.IO
  useEffect(() => {
    if (!token || !quizId) return;
    const socket = getSocket(token);

    socket.emit('join-quiz', { quizId });

    socket.on('quiz:state', (data: any) => {
      if (data.quiz) setQuiz(data.quiz);
      if (data.currentQuestionIndex !== undefined) {
        setCurrentIndex(data.currentQuestionIndex);
      }
    });

    socket.on('quiz:player_joined', (data: { userId: string; name: string }) => {
      if (data?.name) {
        setJoinedPlayers((prev) => new Set([...prev, data.name]));
      }
    });

    socket.on('quiz:player_answered', (data: { userId: string; name: string; correct: boolean }) => {
      setAnsweredPlayers((prev) => {
        if (prev.some((p) => p.userId === data.userId)) return prev;
        return [...prev, data];
      });
    });

    const handleNextQ = (data: { questionIndex: number; totalQuestions: number; question: any; fullQuestionForHost?: any }) => {
      setCurrentIndex(data.questionIndex);
      setRevealed(false);
      setAnsweredPlayers([]);
      const limit = data.fullQuestionForHost?.timeLimit || data.question?.timeLimit || 25;
      setTimeLeft(limit);
      setIsTimerRunning(true);
    };

    socket.on('quiz:question', handleNextQ);
    socket.on('quiz:next_question', handleNextQ);

    socket.on('quiz:question_ended', () => {
      setRevealed(true);
      setIsTimerRunning(false);
    });

    socket.on('quiz:completed', () => {
      setIsTimerRunning(false);
      setQuiz((q) => (q ? { ...q, status: 'completed' } : null));
    });

    return () => {
      socket.off('quiz:state');
      socket.off('quiz:player_joined');
      socket.off('quiz:player_answered');
      socket.off('quiz:question', handleNextQ);
      socket.off('quiz:next_question', handleNextQ);
      socket.off('quiz:question_ended');
      socket.off('quiz:completed');
    };
  }, [token, quizId]);

  // Host Countdown Timer
  useEffect(() => {
    if (!isTimerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsTimerRunning(false);
          handleRevealAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, currentIndex]);

  const currentQ = questions[currentIndex];

  // Start / Next Question
  const handleNextQuestion = () => {
    if (!token || !quiz) return;
    const socket = getSocket(token);
    const nextIdx = currentIndex + 1;
    if (nextIdx >= questions.length) {
      handleEndQuiz();
      return;
    }
    socket.emit('host:next_question', {
      quizId: quiz._id,
      questionIndex: nextIdx,
    });
    setCurrentIndex(nextIdx);
    setRevealed(false);
    setAnsweredPlayers([]);
    const limit = questions[nextIdx]?.timeLimit || 25;
    setTimeLeft(limit);
    setIsTimerRunning(true);
  };

  // Reveal Answer to everyone
  const handleRevealAnswer = () => {
    if (!token || !quiz || !currentQ) return;
    const socket = getSocket(token);
    socket.emit('host:end_question', {
      quizId: quiz._id,
      questionId: currentQ._id,
    });
    setRevealed(true);
    setIsTimerRunning(false);
  };

  // End Quiz
  const handleEndQuiz = () => {
    if (!token || !quiz) return;
    if (!confirm('Are you sure you want to end this quiz? Final scores will be shown to all players.')) return;
    const socket = getSocket(token);
    socket.emit('host:next_question', {
      quizId: quiz._id,
      questionIndex: questions.length,
    });
    setQuiz((q) => (q ? { ...q, status: 'completed' } : null));
    setIsTimerRunning(false);
  };

  // Copy Room Link / Code
  const copyRoomLink = () => {
    if (!quiz) return;
    const link = `${window.location.origin}/quiz/${quiz.roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
        <p className="text-lg font-bold text-bappa-text">Connecting to Live Host Control Room...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="card max-w-xl mx-auto text-center space-y-4 my-12 p-8">
        <AlertCircle className="w-12 h-12 text-error mx-auto" />
        <h2 className="text-2xl font-black text-bappa-text">Error Occurred</h2>
        <p className="text-bappa-muted">{error || 'Could not load quiz details.'}</p>
        <button onClick={() => router.push('/admin/quiz/generator')} className="btn-primary">
          Create New Quiz
        </button>
      </div>
    );
  }

  const isCompleted = quiz.status === 'completed';
  const cleanTitle =
    quiz.title
      ?.replace(/^Aarti Knowledge Quiz\s*\([^)]*\)/i, 'Ganapati Aarti Quiz')
      .replace(/\([^)]*\)/g, '')
      .trim() || 'Ganapati Aarti Quiz';

  const totalJoinedCount = Math.max(joinedPlayers.size, answeredPlayers.length, 1);
  const correctCount = answeredPlayers.filter((p) => p.correct).length;
  const incorrectCount = answeredPlayers.filter((p) => p.correct === false).length;
  const waitingCount = Math.max(0, totalJoinedCount - answeredPlayers.length);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 page-transition">
      {/* ─── PROMINENT GAME ROOM CODE BANNER (Requirement 1) ─── */}
      <div className="card border-2 border-primary/40 bg-gradient-to-br from-amber-500/10 via-surface to-primary-light/30 p-6 sm:p-8 shadow-card-lg text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary text-white rounded-full text-xs font-black tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Your Game Room
          </span>
          <div className="text-4xl sm:text-6xl font-black font-mono tracking-widest text-primary drop-shadow-sm">
            {quiz.roomId}
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-bold text-bappa-muted pt-1">
            <span>Players Joined: <strong className="text-primary text-sm">{totalJoinedCount}</strong></span>
            <span>•</span>
            <span>Status: <strong className="text-emerald-700 text-sm">{isCompleted ? 'Completed' : quiz.status === 'active' ? 'LIVE' : 'Waiting for Players'}</strong></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(quiz.roomId);
              setCodeCopied(true);
              setTimeout(() => setCodeCopied(false), 2000);
            }}
            className="btn-primary py-3.5 px-6 text-sm font-black flex items-center gap-2 shadow-saffron hover:scale-[1.02] active:scale-[0.98]"
          >
            {codeCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{codeCopied ? 'Room Code Copied!' : 'Copy Room Code'}</span>
          </button>
          <button
            onClick={copyRoomLink}
            className="btn-outline py-3.5 px-6 text-sm font-black flex items-center gap-2 border-2 border-primary text-primary hover:bg-primary-light hover:scale-[1.02] active:scale-[0.98]"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
            <span>{copied ? 'Player Link Copied!' : 'Copy Player Link'}</span>
          </button>
        </div>
      </div>

      {/* ─── TOP STATUS BAR ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-primary via-saffron to-maroon text-white rounded-3xl p-6 shadow-card-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-8 pointer-events-none">
          <Flame className="w-40 h-40 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Host Control Room
              </span>
              <span className="text-xs bg-black/25 px-2.5 py-0.5 rounded-full font-bold">
                {quiz.difficulty.toUpperCase()} • {questions.length} Questions
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight drop-shadow-sm">
              {cleanTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/90">
              <span className="font-semibold">Source Aartis:</span>
              {quiz.sourceAartis.map((art) => (
                <span key={art} className="bg-white/15 px-2 py-0.5 rounded-md font-medium">
                  {art}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── LIVE CONTROLS & MAIN QUESTION VIEW ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Question Monitor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question Status Card */}
          <div className="card shadow-card-lg border-2 border-primary/20 p-6 relative">
            {/* Top Row: Q Number + Timer */}
            <div className="flex items-center justify-between border-b border-bappa-border pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-primary text-white font-black flex items-center justify-center text-lg shadow-md">
                  {currentIndex + 1}
                </span>
                <div>
                  <div className="text-xs font-black text-bappa-muted uppercase">
                    Active Question ({currentIndex + 1} of {questions.length})
                  </div>
                  <div className="font-bold text-sm text-bappa-text">
                    {QUESTION_TYPE_LABELS[currentQ?.type as keyof typeof QUESTION_TYPE_LABELS]?.label ||
                      currentQ?.type}
                  </div>
                </div>
              </div>

              {/* Timer Pill */}
              <div
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-black text-sm transition-colors ${
                  timeLeft <= 5 && isTimerRunning
                    ? 'bg-error-light text-error animate-pulse border border-error/30'
                    : 'bg-primary-light text-primary border border-primary/20'
                }`}
              >
                <Timer className="w-4 h-4" />
                <span>{timeLeft}s left</span>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-4 mb-6">
              <h2 className="text-xl md:text-2xl font-black text-bappa-text leading-relaxed">
                {currentQ?.question}
              </h2>

              {/* Authentic Source Reference Banner */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <div className="font-black text-amber-900">
                    Verified Authentic Reference:
                  </div>
                  <div className="text-amber-800 font-bold">
                    {currentQ?.sourceAarti} • Verse / Line:{' '}
                    <span className="text-maroon font-black font-mono">
                      "{currentQ?.sourceLine}"
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Answer Details for Host View */}
            <div className="bg-sand-light/50 border border-sand rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between text-xs font-black text-bappa-muted uppercase tracking-wider">
                <span>Answer Details</span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Points: {currentQ?.points || 10} pts
                </span>
              </div>

              {/* Fill Blank / MCQ / Sentence Answer */}
              {currentQ?.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQ.options.map((opt, oIdx) => {
                    const isCorrect = String(opt).trim() === String(currentQ.correctAnswer).trim();
                    return (
                      <div
                        key={oIdx}
                        className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-between ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-black shadow-sm'
                            : 'bg-white border-bappa-border text-bappa-text/80 opacity-75'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {isCorrect && (
                          <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct Answer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Arrange Aarti Order */}
              {currentQ?.type === 'arrange_aarti' && currentQ.correctOrder && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-bappa-muted">Correct Order:</div>
                  <div className="flex flex-wrap gap-2">
                    {currentQ.correctOrder.map((tok, tIdx) => (
                      <span
                        key={tIdx}
                        className="bg-emerald-100 border border-emerald-300 text-emerald-900 px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                          {tIdx + 1}
                        </span>
                        {tok}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Incorrect Word Highlights */}
              {currentQ?.type === 'incorrect_word' && (
                <div className="space-y-2">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs space-y-1">
                    <div className="text-red-700 font-bold">
                      Incorrect Word:{' '}
                      <span className="text-red-900 font-black underline decoration-red-400 text-sm">
                        {currentQ.incorrectWord}
                      </span>
                    </div>
                    {currentQ.correctWord && (
                      <div className="text-emerald-800 font-bold">
                        Correct Authentic Word:{' '}
                        <span className="text-emerald-900 font-black text-sm">
                          {currentQ.correctWord}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Match Lines */}
              {currentQ?.type === 'match_lines' && currentQ.pairs && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-bappa-muted">Verified Pairs:</div>
                  {currentQ.pairs.map((p, pIdx) => (
                    <div
                      key={pIdx}
                      className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-bappa-border"
                    >
                      <span className="font-bold text-bappa-text">{p.left}</span>
                      <span className="text-primary font-black">↔</span>
                      <span className="font-bold text-emerald-800">{p.right}</span>
                    </div>
                  ))}
                </div>
              )}

              {currentQ?.explanation && (
                <div className="text-xs text-bappa-muted bg-white/80 p-3 rounded-xl border border-bappa-border">
                  <span className="font-bold text-bappa-text">Explanation: </span>
                  {currentQ.explanation}
                </div>
              )}
            </div>

            {/* Live Host Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-bappa-border">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRevealAnswer}
                  disabled={revealed || isCompleted}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
                    revealed
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  {revealed ? 'Answer Revealed' : 'Reveal Answer'}
                </button>

                {!isTimerRunning && !revealed && (
                  <button
                    onClick={() => setIsTimerRunning(true)}
                    className="px-3 py-2.5 bg-sand hover:bg-sand/80 text-bappa-text rounded-xl font-bold text-xs flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 text-primary" /> Resume Timer
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleNextQuestion}
                  disabled={isCompleted}
                  className="btn-primary py-2.5 px-5 text-xs flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>
                    {currentIndex + 1 >= questions.length
                      ? 'Finish Quiz'
                      : 'Next Question'}
                  </span>
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Player Real-Time Responses Panel */}
          <div className="card p-5 space-y-3 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm text-bappa-text">
                <Users className="w-4 h-4 text-primary" />
                <span>Player Submissions (This Round):</span>
              </div>
              <span className="text-xs bg-primary-light text-primary font-black px-2.5 py-0.5 rounded-full">
                {answeredPlayers.length} answered
              </span>
            </div>

            {/* Real-Time Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2.5 bg-surface-secondary rounded-xl border border-bappa-border">
                <div className="text-[10px] font-bold text-bappa-muted uppercase">Answered</div>
                <div className="text-base font-black text-bappa-text">
                  {answeredPlayers.length} / {totalJoinedCount}
                </div>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">Correct</div>
                <div className="text-base font-black text-emerald-700">{correctCount}</div>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <div className="text-[10px] font-bold text-amber-800 uppercase">Incorrect</div>
                <div className="text-base font-black text-amber-700">{incorrectCount}</div>
              </div>
              <div className="p-2.5 bg-sand-light rounded-xl border border-bappa-border">
                <div className="text-[10px] font-bold text-bappa-muted uppercase">Waiting</div>
                <div className="text-base font-black text-primary">{waitingCount}</div>
              </div>
            </div>

            {answeredPlayers.length === 0 ? (
              <div className="text-center py-6 text-xs text-bappa-muted border border-dashed border-bappa-border rounded-xl">
                Waiting for player submissions…
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-2">
                {answeredPlayers.map((p, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-xs ${
                      p.correct
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${p.correct ? 'text-emerald-600' : 'text-amber-500'}`}
                    />
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Question Navigation List */}
        <div className="space-y-4">
          <div className="card p-4 space-y-3 shadow-card">
            <div className="flex items-center justify-between border-b border-bappa-border pb-3">
              <div className="font-black text-sm text-bappa-text flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Questions List ({questions.length})</span>
              </div>
              <button
                onClick={handleEndQuiz}
                className="text-xs text-error font-black hover:underline flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> End Quiz
              </button>
            </div>

            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isActive = idx === currentIndex;
                const isPast = idx < currentIndex;

                return (
                  <button
                    key={q._id || idx}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setRevealed(false);
                      setAnsweredPlayers([]);
                      setTimeLeft(q.timeLimit || 25);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isActive
                        ? 'bg-primary-light/60 border-primary shadow-sm ring-1 ring-primary'
                        : isPast
                        ? 'bg-white border-bappa-border/60 opacity-85 hover:border-primary/50'
                        : 'bg-sand-light/40 border-bappa-border/40 hover:border-primary/40'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-primary text-white shadow-xs'
                          : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-sand text-bappa-muted'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-black text-primary truncate">
                        {QUESTION_TYPE_LABELS[q.type as keyof typeof QUESTION_TYPE_LABELS]?.label ||
                          q.type}
                      </div>
                      <div className="text-xs font-bold text-bappa-text line-clamp-1 mt-0.5">
                        {q.question}
                      </div>
                      <div className="text-[10px] text-bappa-muted mt-1 truncate">
                        {q.sourceAarti}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
