'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Timer,
  CheckCircle2,
  XCircle,
  Trophy,
  Award,
  ArrowRight,
  ArrowLeft,
  Users,
  RefreshCw,
  AlertCircle,
  BookOpen,
  Home,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { quizzesApi } from '@/lib/api';
import {
  DynamicQuiz,
  DynamicQuizQuestion,
  QUESTION_TYPE_LABELS,
} from '@/types/index';
import {
  FillBlankPlayer,
  ArrangeAartiPlayer,
  IncorrectWordPlayer,
  IncorrectSentencePlayer,
  MatchLinesPlayer,
  StandardOptionsPlayer,
} from '@/components/quiz';

export default function PlayerQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizIdParam = params?.quizId as string;
  const { user, token } = useAuth();

  const [quiz, setQuiz] = useState<DynamicQuiz | null>(null);
  const [questions, setQuestions] = useState<DynamicQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Round State
  const [currentQuestion, setCurrentQuestion] = useState<DynamicQuizQuestion | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<any>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitConfirmed, setSubmitConfirmed] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [answerResult, setAnswerResult] = useState<{
    correct: boolean;
    points: number;
    timeTaken?: number;
    speedMultiplier?: number;
    correctAnswer?: any;
    correctWord?: string;
    sourceAarti?: string;
    sourceLine?: string;
  } | null>(null);

  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [totalEarnedPoints, setTotalEarnedPoints] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);

  // Multiplayer Live Stats
  const [playerCount, setPlayerCount] = useState<number>(1);
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const [roundStats, setRoundStats] = useState<{
    answeredCount: number;
    correctCount: number;
    incorrectCount: number;
    totalPlayers: number;
  } | null>(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState<number>(25);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Quiz initial state via REST
  const loadQuiz = useCallback(async () => {
    if (!quizIdParam) return;
    try {
      setLoading(true);
      const res = await quizzesApi.get(quizIdParam);
      setQuiz(res.data.quiz);
      setQuestions(res.data.questions || []);

      const qIdx = res.data.quiz.currentQuestionIndex || 0;
      setCurrentIndex(qIdx);

      if (res.data.questions && res.data.questions[qIdx]) {
        setCurrentQuestion(res.data.questions[qIdx]);
        setTimeLeft(res.data.questions[qIdx].timeLimit || 25);
        if (res.data.quiz.status === 'active') {
          setTimerActive(true);
          startTimeRef.current = Date.now();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to find quiz.');
    } finally {
      setLoading(false);
    }
  }, [quizIdParam]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  // Setup Socket.IO connection & listeners
  useEffect(() => {
    if (!token || !quizIdParam) return;
    const socket = getSocket(token);

    socket.emit('join-quiz', {
      quizId: quizIdParam.length === 24 ? quizIdParam : undefined,
      roomId: quizIdParam.length !== 24 ? quizIdParam : undefined,
    });

    socket.on('quiz:state', (data: any) => {
      if (data.quiz) setQuiz(data.quiz);
      if (data.currentQuestionIndex !== undefined) {
        setCurrentIndex(data.currentQuestionIndex);
      }
      if (data.playerCount) {
        setPlayerCount(data.playerCount);
      }
      if (data.answeredCount !== undefined) {
        setAnsweredCount(data.answeredCount);
      }
      if (data.currentQuestion) {
        setCurrentQuestion(data.currentQuestion);
        const limit = data.timeLimit || data.currentQuestion.timeLimit || 25;
        const elapsed = data.startedAt ? Math.floor((Date.now() - data.startedAt) / 1000) : 0;
        setTimeLeft(Math.max(1, limit - elapsed));
      }
    });

    socket.on('quiz:player_joined', (data: any) => {
      if (data.playerCount) setPlayerCount(data.playerCount);
      else setPlayerCount((prev) => prev + 1);
    });

    socket.on('quiz:player_left', (data: any) => {
      if (data.playerCount) setPlayerCount(data.playerCount);
      else setPlayerCount((prev) => Math.max(1, prev - 1));
    });

    socket.on('quiz:player_answered', (data: any) => {
      if (data.answeredCount !== undefined) {
        setAnsweredCount(data.answeredCount);
      }
      if (data.totalPlayers) {
        setPlayerCount(data.totalPlayers);
      }
    });

    socket.on('quiz:started', () => {
      setQuiz((q) => (q ? { ...q, status: 'active' } : null));
      setTimerActive(true);
      startTimeRef.current = Date.now();
    });

    const handleQuestionUpdate = (data: any) => {
      if (data.questionIndex !== undefined) {
        setCurrentIndex(data.questionIndex);
      }
      if (data.question) {
        setCurrentQuestion(data.question);
      }
      setSubmittedAnswer(null);
      setHasSubmitted(false);
      setSubmitting(false);
      setSubmitConfirmed(false);
      setSubmitError('');
      setAnswerResult(null);
      setIsRevealed(false);
      setAnsweredCount(0);
      setRoundStats(null);

      const limit = data.timeLimit || data.question?.timeLimit || 25;
      const elapsed = data.startedAt ? Math.floor((Date.now() - data.startedAt) / 1000) : 0;
      setTimeLeft(Math.max(1, limit - elapsed));
      setTimerActive(true);
      startTimeRef.current = Date.now();
    };

    socket.on('quiz:question', handleQuestionUpdate);
    socket.on('quiz:next_question', handleQuestionUpdate);

    socket.on('player:answer_received', () => {
      setSubmitting(false);
      setSubmitConfirmed(true);
      setSubmitError('');
    });

    socket.on('player:submit_error', (data: any) => {
      setSubmitting(false);
      setSubmitError(data?.message || 'Submission error. Please retry.');
    });

    socket.on('player:answer_result', (data: any) => {
      setSubmitting(false);
      setSubmitConfirmed(true);
      setAnswerResult(data);
      if (data.correct) {
        setTotalEarnedPoints((prev) => prev + (data.points || 10));
        setCorrectCount((prev) => prev + 1);
      }
    });

    socket.on('quiz:question_ended', (data: any) => {
      setIsRevealed(true);
      setTimerActive(false);
      if (data) {
        if (data.answeredCount !== undefined) {
          setRoundStats({
            answeredCount: data.answeredCount || 0,
            correctCount: data.correctCount || 0,
            incorrectCount: data.incorrectCount || 0,
            totalPlayers: data.totalPlayers || playerCount,
          });
        }
        setAnswerResult((prev) => ({
          correct: prev?.correct || false,
          points: prev?.points || 0,
          timeTaken: prev?.timeTaken,
          speedMultiplier: prev?.speedMultiplier,
          correctAnswer: data.correctAnswer,
          correctWord: data.correctWord,
          sourceAarti: data.sourceAarti,
          sourceLine: data.sourceLine,
        }));
      }
    });

    socket.on('quiz:completed', () => {
      setTimerActive(false);
      setQuiz((q) => (q ? { ...q, status: 'completed' } : null));
    });

    return () => {
      socket.off('quiz:state');
      socket.off('quiz:player_joined');
      socket.off('quiz:player_left');
      socket.off('quiz:player_answered');
      socket.off('quiz:started');
      socket.off('quiz:question', handleQuestionUpdate);
      socket.off('quiz:next_question', handleQuestionUpdate);
      socket.off('player:answer_received');
      socket.off('player:submit_error');
      socket.off('player:answer_result');
      socket.off('quiz:question_ended');
      socket.off('quiz:completed');
    };
  }, [token, quizIdParam]);

  // Countdown timer effect
  useEffect(() => {
    if (!timerActive || isRevealed) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          // Auto submit if not submitted yet
          if (!hasSubmitted && currentQuestion) {
            handleAnswerSubmit(null);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, isRevealed, hasSubmitted, currentQuestion]);

  // Player Answer Submission
  const handleAnswerSubmit = (answer: any) => {
    if (hasSubmitted || !currentQuestion || !quiz) return;

    setHasSubmitted(true);
    setSubmitting(true);
    setSubmitError('');
    setSubmittedAnswer(answer);
    const timeTaken = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

    // Emit to Socket
    if (token) {
      const socket = getSocket(token);
      socket.emit('player:submit_answer', {
        roomId: quiz.roomId,
        quizId: quiz._id,
        questionId: currentQuestion._id,
        answer,
        timeTaken,
      });
    }

    // Safety timeout: if server acknowledgement doesn't arrive within 6 seconds, provide Retry
    const timeout = setTimeout(() => {
      setSubmitting((s) => {
        if (s) {
          setSubmitError('Server acknowledgement taking longer than expected. You can retry.');
          return false;
        }
        return s;
      });
    }, 6000);

    // Also call REST fallback
    quizzesApi
      .submit(quiz._id, {
        questionId: currentQuestion._id,
        answer,
        timeTaken,
      })
      .then((res: any) => {
        clearTimeout(timeout);
        setSubmitting(false);
        setSubmitConfirmed(true);
        if (res.data) {
          setAnswerResult(res.data);
          if (res.data.isCorrect) {
            setTotalEarnedPoints((prev) => prev + (res.data.points || 10));
            setCorrectCount((prev) => prev + 1);
          }
        }
      })
      .catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
        <p className="text-lg font-bold text-bappa-text">Opening Aarti Quiz...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="card max-w-lg mx-auto text-center space-y-5 my-12 p-8 shadow-card-lg">
        <AlertCircle className="w-12 h-12 text-error mx-auto" />
        <h2 className="text-2xl font-black text-bappa-text">Quiz Not Found</h2>
        <p className="text-bappa-muted">{error || 'Please check the room code and try again.'}</p>
        <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
          <Home className="w-4 h-4" /> Go to Dashboard
        </Link>
      </div>
    );
  }

  // ─── 1. WAITING LOBBY (Status = 'ready') ─────────────────────────────────────
  if (quiz.status === 'ready') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6 sm:py-8 px-4 page-transition">
        <div className="flex items-center justify-between">
          <Link
            href="/quiz"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-bappa-muted hover:text-bappa-text px-3 py-1.5 rounded-xl bg-white border border-bappa-border hover:border-primary transition-all shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Quizzes
          </Link>
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-bappa-text px-3 py-1.5 rounded-xl bg-pastel-blue/40 border border-pastel-blue">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>{playerCount} Players Joined</span>
          </div>
        </div>

        <div className="card shadow-card-lg border border-bappa-border text-center p-6 sm:p-8 space-y-6 relative overflow-hidden rounded-4xl bg-surface">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-pastel-lavender flex items-center justify-center shadow-xs border border-pastel-lavender-dark">
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>

          <div className="space-y-2">
            <span className="badge-lavender text-xs uppercase tracking-wider font-black">
              Multiplayer Game Lobby
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-bappa-text">{quiz.title}</h1>
            <p className="text-xs sm:text-sm text-bappa-secondary font-medium">
              The host will start this live session shortly. Get ready!
            </p>
          </div>

          {/* Prominent Pastel Room Code Card */}
          <div className="bg-pastel-blue/35 border-2 border-pastel-blue p-5 rounded-3xl inline-block max-w-xs mx-auto shadow-pastel-blue">
            <div className="text-[11px] font-black text-pastel-blue-dark tracking-wider uppercase">ROOM CODE</div>
            <div className="text-4xl font-black tracking-widest text-[#204068] font-mono mt-1">
              {quiz.roomId}
            </div>
          </div>

          {/* Quiz Details */}
          <div className="grid grid-cols-2 gap-3 text-left pt-1">
            <div className="p-3.5 bg-surface-secondary/70 rounded-2xl border border-bappa-border">
              <div className="text-[11px] text-bappa-muted font-bold">Total Questions:</div>
              <div className="text-base font-black text-bappa-text">{quiz.totalQuestions} Questions</div>
            </div>
            <div className="p-3.5 bg-surface-secondary/70 rounded-2xl border border-bappa-border">
              <div className="text-[11px] text-bappa-muted font-bold">Difficulty:</div>
              <div className="text-base font-black text-bappa-text capitalize">{quiz.difficulty}</div>
            </div>
          </div>

          <div className="text-xs text-bappa-secondary bg-pastel-lavender/30 p-4 rounded-2xl border border-pastel-lavender text-left space-y-1.5">
            <div className="font-bold text-primary-dark flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Quick Game Rules:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-bappa-secondary">
              <li>Each question has a countdown timer (20-30 seconds).</li>
              <li>Options are color-coded in 4 friendly pastel cards.</li>
              <li>Faster correct answers earn speed bonus points!</li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary animate-pulse pt-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Waiting for host to start...</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── 2. COMPLETED FINAL SCREEN (Status = 'completed') ────────────────────────
  if (quiz.status === 'completed') {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-8 sm:py-10 px-4 page-transition text-center">
        <div className="flex justify-start">
          <Link
            href="/quiz"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-bappa-muted hover:text-bappa-text px-3 py-1.5 rounded-xl bg-white border border-bappa-border hover:border-primary transition-all shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Quizzes
          </Link>
        </div>

        <div className="card shadow-card-lg border border-bappa-border p-6 sm:p-8 space-y-6 relative overflow-hidden rounded-4xl bg-surface">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-pastel-yellow flex items-center justify-center border border-pastel-yellow-dark shadow-pastel-yellow">
            <Trophy className="w-10 h-10 text-gold-dark animate-pulse" />
          </div>
          <div className="space-y-2">
            <span className="badge-yellow text-xs font-black uppercase tracking-wider">
              Quiz Completed
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-bappa-text">Festive Celebrations!</h1>
            <p className="text-bappa-secondary text-xs sm:text-sm">
              You have successfully finished the Ganapati Aarti quiz.
            </p>
          </div>

          {/* Celebratory Score Card */}
          <div className="bg-pastel-yellow/35 border-2 border-pastel-yellow-dark rounded-3xl p-6 sm:p-8 space-y-2 shadow-pastel-yellow">
            <div className="text-xs font-black text-[#5A4108] uppercase tracking-wider">Your Final Score</div>
            <div className="text-5xl sm:text-6xl font-black text-primary font-mono drop-shadow-xs">
              {totalEarnedPoints}
            </div>
            <div className="text-xs font-bold text-bappa-secondary">
              {correctCount} of {quiz.totalQuestions} questions correct
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/leaderboard" className="btn-primary py-3 px-6 text-sm flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-pastel-yellow" /> View Leaderboard
            </Link>
            <Link href="/dashboard" className="btn-outline py-3 px-6 text-sm flex items-center justify-center gap-2">
              <Home className="w-4 h-4" /> Main Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── 3. ACTIVE PLAYING ROUND ────────────────────────────────────────────────
  const maxTimer = currentQuestion?.timeLimit || 25;
  const timerPercentage = Math.max(0, (timeLeft / maxTimer) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pb-20 page-transition">
      {/* Top Back & Multiplayer Live Stats Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/quiz"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-bappa-muted hover:text-bappa-text px-3 py-1.5 rounded-xl bg-white border border-bappa-border hover:border-primary transition-all shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Quizzes
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-xl bg-pastel-blue/40 border border-pastel-blue text-[#204068]">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>{playerCount} in Room</span>
          </div>
          <div className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-xl bg-pastel-mint/50 border border-pastel-mint text-[#1C4D32]">
            <Sparkles className="w-3.5 h-3.5 text-emerald-800" />
            <span>⚡ {answeredCount} / {playerCount} Answered</span>
          </div>
        </div>
      </div>
      {/* Top Header with Q Number, Timer, and Score */}
      <div className="card shadow-card border border-bappa-border p-4 sm:p-5 flex items-center justify-between gap-4 rounded-3xl bg-surface">
        {/* Question Counter */}
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-pastel-lavender text-primary font-black flex items-center justify-center text-base shadow-xs border border-pastel-lavender-dark">
            {currentIndex + 1}
          </span>
          <div>
            <div className="text-[11px] font-black text-bappa-muted uppercase tracking-wider">
              Question {currentIndex + 1} of {quiz.totalQuestions}
            </div>
            <div className="text-xs font-bold text-bappa-text truncate max-w-[150px] sm:max-w-xs">
              Ganapati Aarti Quiz
            </div>
          </div>
        </div>

        {/* Live Timer Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-black text-xs sm:text-sm border transition-all ${
              timeLeft <= 5 && timerActive
                ? 'bg-pastel-pink text-error border-pastel-pink-dark animate-pulse'
                : 'bg-pastel-blue/40 text-[#204068] border-pastel-blue'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-pastel-yellow/40 text-bappa-text font-black text-xs border border-pastel-yellow">
            <Trophy className="w-3.5 h-3.5 text-gold-dark" />
            <span>{totalEarnedPoints} pts</span>
          </div>
        </div>
      </div>

      {/* Dynamic Animated Timer Progress Bar */}
      <div className="w-full bg-surface-secondary border border-bappa-border rounded-full h-2.5 overflow-hidden shadow-xs">
        <motion.div
          className={`h-full transition-all duration-300 ${
            timeLeft <= 5 ? 'bg-pastel-pink-dark' : timeLeft <= 10 ? 'bg-pastel-yellow-dark' : 'bg-pastel-mint-dark'
          }`}
          style={{ width: `${timerPercentage}%` }}
        />
      </div>

      {/* Real-time Answer Breakdown (Kahoot-Style) on Question Ended */}
      {isRevealed && roundStats && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border border-bappa-border p-4 rounded-3xl bg-surface shadow-xs flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-bappa-text">🎯 Round Results:</span>
            <span className="text-xs font-black text-emerald-900 bg-pastel-mint px-2.5 py-1 rounded-xl border border-pastel-mint-dark">
              ✅ {roundStats.correctCount} Correct
            </span>
            <span className="text-xs font-black text-rose-900 bg-pastel-pink px-2.5 py-1 rounded-xl border border-pastel-pink-dark">
              ❌ {roundStats.incorrectCount} Incorrect
            </span>
          </div>
          <div className="text-xs text-bappa-muted font-bold">
            {roundStats.answeredCount} of {roundStats.totalPlayers} answered
          </div>
        </motion.div>
      )}

      {/* Main Question Card */}
      {currentQuestion && (
        <div className="card shadow-card-lg border border-bappa-border p-6 sm:p-8 space-y-6 relative rounded-4xl bg-surface">
          {/* Question Type Tag */}
          <div className="flex items-center justify-between">
            <span className="badge-lavender text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {QUESTION_TYPE_LABELS[currentQuestion.type as keyof typeof QUESTION_TYPE_LABELS]?.label ||
                currentQuestion.type}
            </span>
            <span className="text-xs font-bold text-bappa-muted">
              Points: +{currentQuestion.points || 10}
            </span>
          </div>

          {/* Question Heading */}
          <h2 className="text-xl sm:text-2xl font-black text-bappa-text leading-relaxed">
            {currentQuestion.question}
          </h2>

          {/* DYNAMIC INTERACTIVE QUESTION COMPONENT */}
          <div className="pt-2">
            {/* 1. Fill In The Blanks */}
            {currentQuestion.type === 'fill_blank_options' && (
              <FillBlankPlayer
                question={currentQuestion}
                onSubmit={handleAnswerSubmit}
                disabled={hasSubmitted}
                revealed={isRevealed}
                selectedAnswer={submittedAnswer}
                correctAnswer={answerResult?.correctAnswer}
              />
            )}

            {/* 2. Arrange Aarti Order */}
            {currentQuestion.type === 'arrange_aarti' && (
              <ArrangeAartiPlayer
                question={currentQuestion}
                onSubmit={handleAnswerSubmit}
                disabled={hasSubmitted}
                revealed={isRevealed}
                correctOrder={answerResult?.correctAnswer}
              />
            )}

            {/* 3. Find Incorrect Word */}
            {currentQuestion.type === 'incorrect_word' && (
              <IncorrectWordPlayer
                question={currentQuestion}
                onSubmit={handleAnswerSubmit}
                disabled={hasSubmitted}
                revealed={isRevealed}
                incorrectWord={answerResult?.correctAnswer}
                correctWord={answerResult?.correctWord}
              />
            )}

            {/* 4. Find Incorrect Sentence */}
            {currentQuestion.type === 'incorrect_sentence' && (
              <IncorrectSentencePlayer
                question={currentQuestion}
                onSubmit={handleAnswerSubmit}
                disabled={hasSubmitted}
                revealed={isRevealed}
                selectedSentence={submittedAnswer}
                correctAnswer={answerResult?.correctAnswer}
              />
            )}

            {/* 5. Match Pairs */}
            {currentQuestion.type === 'match_lines' && (
              <MatchLinesPlayer
                question={currentQuestion}
                onSubmit={handleAnswerSubmit}
                disabled={hasSubmitted}
                revealed={isRevealed}
              />
            )}

            {/* 6. MCQ, True/False & Missing Line */}
            {(currentQuestion.type === 'mcq' ||
              currentQuestion.type === 'true_false' ||
              currentQuestion.type === 'missing_line') && (
              <StandardOptionsPlayer
                question={currentQuestion}
                onSubmit={handleAnswerSubmit}
                disabled={hasSubmitted}
                revealed={isRevealed}
                selectedAnswer={submittedAnswer}
                correctAnswer={answerResult?.correctAnswer}
              />
            )}
          </div>

          {/* Submission Status Indicator */}
          {hasSubmitted && !isRevealed && (
            <div className="p-4 rounded-3xl bg-pastel-mint/35 border border-pastel-mint-dark flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#1C4D32]">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>Answer registered! Waiting for timer and answers reveal...</span>
              </div>
              <span className="text-xs text-bappa-muted font-bold">{timeLeft}s left</span>
            </div>
          )}

          {/* ANSWER REVEAL & AUTHENTIC AARTI REFERENCE BANNER */}
          <AnimatePresence>
            {isRevealed && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4 pt-4 border-t border-bappa-border"
              >
                {/* Result Feedback Banner */}
                {answerResult && (
                  <div
                    className={`p-4 sm:p-5 rounded-3xl border flex items-center gap-3.5 shadow-xs ${
                      answerResult.correct
                        ? 'bg-pastel-mint/35 border-pastel-mint-dark text-[#1C4D32]'
                        : 'bg-pastel-pink/35 border-pastel-pink-dark text-[#782828]'
                    }`}
                  >
                    {answerResult.correct ? (
                      <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-error flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-black text-sm sm:text-base">
                        {answerResult.correct ? 'Brilliant! Correct Answer!' : 'Time Expired or Incorrect Answer'}
                      </div>
                      <div className="text-xs opacity-90 font-medium">
                        {answerResult.correct
                          ? `You earned +${answerResult.points} points!${
                              answerResult.timeTaken ? ` (⚡ Fast answer in ${answerResult.timeTaken}s)` : ''
                            }`
                          : 'Check the authentic verse reference below.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Verified Source Aarti Reference */}
                <div className="bg-pastel-lavender/30 border border-pastel-lavender rounded-3xl p-4 sm:p-5 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Authentic Verse Reference</span>
                  </div>

                  <div className="text-sm font-bold text-bappa-text">
                    {answerResult?.sourceAarti || currentQuestion.sourceAarti}
                  </div>

                  {(answerResult?.sourceLine || currentQuestion.sourceLine) && (
                    <div className="p-3.5 bg-surface border border-pastel-lavender-dark rounded-2xl text-primary font-black text-sm sm:text-base">
                      "{answerResult?.sourceLine || currentQuestion.sourceLine}"
                    </div>
                  )}

                  {currentQuestion.explanation && (
                    <div className="text-xs text-bappa-secondary pt-1 leading-relaxed">
                      <span className="font-bold text-bappa-text">Meaning: </span>
                      {currentQuestion.explanation}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs font-bold text-bappa-muted pt-2 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Host is advancing to the next question...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
