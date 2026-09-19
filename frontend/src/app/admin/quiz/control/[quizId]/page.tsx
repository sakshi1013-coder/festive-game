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
      {/* ─── PROMINENT GAME ROOM CODE BANNER ─── */}
      <div className="bg-white rounded-3xl border border-pastel-border/80 p-6 sm:p-8 shadow-pastel-sm text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-pastel-blue/60 text-bappa-text rounded-full text-xs font-black tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Live Quiz Room
          </div>
          <div className="text-4xl sm:text-6xl font-black font-mono tracking-widest text-primary drop-shadow-sm">
            {quiz.roomId}
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-bold text-bappa-muted pt-1">
            <span>Joined: <strong className="text-bappa-text text-sm font-black">{totalJoinedCount} players</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              Status: <span className="px-2.5 py-0.5 rounded-full bg-pastel-mint text-bappa-text font-black text-xs">{isCompleted ? 'Completed' : quiz.status === 'active' ? 'LIVE' : 'Waiting for Players'}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(quiz.roomId);
              setCodeCopied(true);
              setTimeout(() => setCodeCopied(false), 2000);
            }}
            className="btn-primary py-3 px-6 text-sm font-black flex items-center gap-2 shadow-pastel-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            {codeCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{codeCopied ? 'Room Code Copied!' : 'Copy Room Code'}</span>
          </button>
          <button
            onClick={copyRoomLink}
            className="btn-outline py-3 px-6 text-sm font-black flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
            <span>{copied ? 'Link Copied!' : 'Copy Player Link'}</span>
          </button>
        </div>
      </div>

      {/* ─── TOP STATUS BAR ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-pastel-lavender/80 via-pastel-blue/80 to-pastel-mint/80 border border-pastel-border/80 rounded-3xl p-6 sm:p-7 shadow-pastel-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-xs font-black tracking-wide uppercase text-bappa-text">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Host Console
              </span>
              <span className="text-xs bg-white/70 px-2.5 py-0.5 rounded-full font-bold text-bappa-text">
                {quiz.difficulty.toUpperCase()} • {questions.length} Questions
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-bappa-text tracking-tight">
              {cleanTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-bappa-muted font-medium">
              <span className="bg-white/60 px-2.5 py-0.5 rounded-md font-bold text-bappa-text">
                {quiz.sourceAartis.length} Sacred Aartis Included
              </span>
              <span>•</span>
              <span>Authoritative Live Host Session</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── LIVE CONTROLS & MAIN QUESTION VIEW ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Question Monitor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question Status Card */}
          <div className="bg-white rounded-3xl shadow-pastel-sm border border-pastel-border/80 p-6 sm:p-7 relative">
            {/* Top Row: Q Number + Timer */}
            <div className="flex items-center justify-between border-b border-pastel-border/60 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-pastel-blue text-bappa-text font-black flex items-center justify-center text-lg shadow-xs">
                  {currentIndex + 1}
                </span>
                <div>
                  <div className="text-xs font-black text-bappa-muted uppercase">
                    Active Question ({currentIndex + 1} of {questions.length})
                  </div>
                  <div className="font-black text-sm text-bappa-text">
                    {QUESTION_TYPE_LABELS[currentQ?.type as keyof typeof QUESTION_TYPE_LABELS]?.label ||
                      currentQ?.type}
                  </div>
                </div>
              </div>

              {/* Timer Pill */}
              <div
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-black text-sm transition-colors ${
                  timeLeft <= 5 && isTimerRunning
                    ? 'bg-pastel-pink text-rose-800 animate-pulse border border-rose-300'
                    : 'bg-pastel-yellow text-amber-900 border border-pastel-yellow'
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
              <div className="bg-pastel-surface border border-pastel-border rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <div className="font-black text-bappa-text">
                    Verified Authentic Reference:
                  </div>
                  <div className="text-bappa-muted font-bold">
                    {currentQ?.sourceAarti} • Verse / Line:{' '}
                    <span className="text-primary font-black font-mono">
                      "{currentQ?.sourceLine}"
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Answer Details for Host View */}
            <div className="bg-pastel-surface/60 border border-pastel-border/70 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between text-xs font-black text-bappa-muted uppercase tracking-wider">
                <span>Correct Answer Details</span>
                <span className="text-emerald-900 bg-pastel-mint px-2.5 py-0.5 rounded-full font-bold">
                  {currentQ?.points || 10} pts
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
                        className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-between ${
                          isCorrect
                            ? 'bg-pastel-mint/80 border-pastel-mint text-bappa-text font-black shadow-xs'
                            : 'bg-white border-pastel-border/80 text-bappa-text/80 opacity-80'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {isCorrect && (
                          <span className="flex items-center gap-1 text-xs text-emerald-900 bg-white/80 px-2.5 py-0.5 rounded-full flex-shrink-0 ml-2 font-black">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Correct
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
                        className="bg-pastel-mint border border-pastel-mint/90 text-bappa-text px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xs"
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
                  <div className="p-3.5 bg-pastel-pink/40 border border-pastel-pink rounded-2xl text-xs space-y-1">
                    <div className="text-rose-900 font-bold">
                      Incorrect Word:{' '}
                      <span className="text-rose-950 font-black underline decoration-rose-400 text-sm">
                        {currentQ.incorrectWord}
                      </span>
                    </div>
                    {currentQ.correctWord && (
                      <div className="text-emerald-900 font-bold">
                        Correct Authentic Word:{' '}
                        <span className="text-emerald-950 font-black text-sm">
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
                      className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-pastel-border"
                    >
                      <span className="font-bold text-bappa-text">{p.left}</span>
                      <span className="text-primary font-black">↔</span>
                      <span className="font-bold text-emerald-800">{p.right}</span>
                    </div>
                  ))}
                </div>
              )}

              {currentQ?.explanation && (
                <div className="text-xs text-bappa-muted bg-white p-3 rounded-2xl border border-pastel-border/60">
                  <span className="font-bold text-bappa-text">Explanation: </span>
                  {currentQ.explanation}
                </div>
              )}
            </div>

            {/* Live Host Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-pastel-border/60">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRevealAnswer}
                  disabled={revealed || isCompleted}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all ${
                    revealed
                      ? 'bg-pastel-mint text-emerald-900 border border-pastel-mint cursor-default'
                      : 'bg-pastel-yellow hover:bg-pastel-yellow/80 text-amber-900 border border-pastel-yellow'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  {revealed ? 'Answer Revealed' : 'Reveal Answer to Players'}
                </button>

                {!isTimerRunning && !revealed && (
                  <button
                    onClick={() => setIsTimerRunning(true)}
                    className="px-3.5 py-2.5 bg-pastel-surface hover:bg-pastel-surface/80 border border-pastel-border text-bappa-text rounded-2xl font-bold text-xs flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 text-primary" /> Resume Timer
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleNextQuestion}
                  disabled={isCompleted}
                  className="btn-primary py-2.5 px-6 text-xs flex items-center gap-2 shadow-pastel-sm hover:scale-[1.02] active:scale-[0.98]"
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
          <div className="bg-white rounded-3xl p-6 space-y-3 shadow-pastel-sm border border-pastel-border/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm text-bappa-text">
                <Users className="w-4 h-4 text-primary" />
                <span>Player Submissions (Current Round):</span>
              </div>
              <span className="text-xs bg-pastel-blue/60 text-bappa-text font-black px-3 py-0.5 rounded-full">
                {answeredPlayers.length} answered
              </span>
            </div>

            {/* Real-Time Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center">
              <div className="p-3 bg-pastel-surface rounded-2xl border border-pastel-border/60">
                <div className="text-[10px] font-bold text-bappa-muted uppercase">Answered</div>
                <div className="text-base font-black text-bappa-text">
                  {answeredPlayers.length} / {totalJoinedCount}
                </div>
              </div>
              <div className="p-3 bg-pastel-mint/60 rounded-2xl border border-pastel-mint">
                <div className="text-[10px] font-bold text-emerald-900 uppercase">Correct</div>
                <div className="text-base font-black text-emerald-800">{correctCount}</div>
              </div>
              <div className="p-3 bg-pastel-pink/50 rounded-2xl border border-pastel-pink">
                <div className="text-[10px] font-bold text-rose-900 uppercase">Incorrect</div>
                <div className="text-base font-black text-rose-800">{incorrectCount}</div>
              </div>
              <div className="p-3 bg-pastel-yellow/50 rounded-2xl border border-pastel-yellow">
                <div className="text-[10px] font-bold text-amber-900 uppercase">Waiting</div>
                <div className="text-base font-black text-amber-800">{waitingCount}</div>
              </div>
            </div>

            {answeredPlayers.length === 0 ? (
              <div className="text-center py-6 text-xs text-bappa-muted border border-dashed border-pastel-border rounded-2xl">
                Waiting for player submissions…
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-2">
                {answeredPlayers.map((p, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-xs ${
                      p.correct
                        ? 'bg-pastel-mint/70 border-pastel-mint text-emerald-900'
                        : 'bg-pastel-pink/60 border-pastel-pink text-rose-900'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${p.correct ? 'text-emerald-600' : 'text-rose-500'}`}
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
          <div className="bg-white rounded-3xl p-5 space-y-3 shadow-pastel-sm border border-pastel-border/80">
            <div className="flex items-center justify-between border-b border-pastel-border/60 pb-3">
              <div className="font-black text-sm text-bappa-text flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Questions ({questions.length})</span>
              </div>
              <button
                onClick={handleEndQuiz}
                className="text-xs text-rose-600 font-black hover:underline flex items-center gap-1"
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
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                      isActive
                        ? 'bg-pastel-blue/60 border-primary shadow-xs ring-1 ring-primary'
                        : isPast
                        ? 'bg-white border-pastel-border/60 opacity-90 hover:border-pastel-blue'
                        : 'bg-pastel-surface/60 border-pastel-border/40 hover:border-pastel-blue/60'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-primary text-white shadow-xs'
                          : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-pastel-surface text-bappa-muted'
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
