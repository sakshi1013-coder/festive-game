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
  const [answerResult, setAnswerResult] = useState<{
    correct: boolean;
    points: number;
    correctAnswer?: any;
    correctWord?: string;
    sourceAarti?: string;
    sourceLine?: string;
  } | null>(null);

  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [totalEarnedPoints, setTotalEarnedPoints] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);

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
      if (data.currentQuestion) {
        setCurrentQuestion(data.currentQuestion);
        setTimeLeft(data.currentQuestion.timeLimit || 25);
      }
    });

    socket.on('quiz:started', () => {
      setQuiz((q) => (q ? { ...q, status: 'active' } : null));
      setTimerActive(true);
      startTimeRef.current = Date.now();
    });

    socket.on('quiz:next_question', (data: { questionIndex: number; totalQuestions: number; question: any }) => {
      setCurrentIndex(data.questionIndex);
      setCurrentQuestion(data.question);
      setSubmittedAnswer(null);
      setHasSubmitted(false);
      setAnswerResult(null);
      setIsRevealed(false);

      const limit = data.question?.timeLimit || 25;
      setTimeLeft(limit);
      setTimerActive(true);
      startTimeRef.current = Date.now();
    });

    socket.on('player:answer_result', (data: any) => {
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
        setAnswerResult((prev) => ({
          correct: prev?.correct || false,
          points: prev?.points || 0,
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
      socket.off('quiz:started');
      socket.off('quiz:next_question');
      socket.off('quiz:player_answered');
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
    setSubmittedAnswer(answer);
    const timeTaken = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

    // Emit to Socket
    if (token) {
      const socket = getSocket(token);
      socket.emit('player:submit_answer', {
        quizId: quiz._id,
        questionId: currentQuestion._id,
        answer,
        timeTaken,
      });
    }

    // Also call REST fallback
    quizzesApi
      .submit(quiz._id, {
        questionId: currentQuestion._id,
        answer,
        timeTaken,
      })
      .then((res: any) => {
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
        <div className="card shadow-card-lg border-2 border-primary/20 text-center p-6 sm:p-8 space-y-6 relative overflow-hidden">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-primary-light flex items-center justify-center shadow-inner border border-primary/20">
            <Flame className="w-8 h-8 sm:w-10 sm:h-10 text-primary animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Live Quiz Waiting Lobby
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-bappa-text">{quiz.title}</h1>
            <p className="text-xs sm:text-sm text-bappa-muted">
              The host will start this quiz shortly. Please get ready!
            </p>
          </div>

          {/* Room Code Banner */}
          <div className="bg-sand-light/60 border border-bappa-border p-4 rounded-2xl inline-block max-w-xs mx-auto">
            <div className="text-[11px] font-bold text-bappa-muted uppercase">Room Code</div>
            <div className="text-3xl font-black tracking-widest text-primary font-mono mt-0.5">
              {quiz.roomId}
            </div>
          </div>

          {/* Quiz Details */}
          <div className="grid grid-cols-2 gap-3 text-left pt-2">
            <div className="p-3 bg-white rounded-xl border border-bappa-border">
              <div className="text-[11px] text-bappa-muted font-bold">Total Questions:</div>
              <div className="text-sm font-black text-bappa-text">{quiz.totalQuestions} Questions</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-bappa-border">
              <div className="text-[11px] text-bappa-muted font-bold">Difficulty:</div>
              <div className="text-sm font-black text-bappa-text capitalize">{quiz.difficulty}</div>
            </div>
          </div>

          <div className="text-xs text-bappa-muted/90 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 text-left space-y-1.5">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Rules & Information:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-bappa-text/80">
              <li>Each question has a countdown timer (approx. 20-30 seconds).</li>
              <li>Questions are derived 100% strictly from authentic Aarti verses.</li>
              <li>Answering quickly and accurately earns speed bonus points.</li>
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

  // ─── 2. COMPLETED FINAL LEADERBOARD SCREEN (Status = 'completed') ────────────
  if (quiz.status === 'completed') {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-8 sm:py-10 px-4 page-transition text-center">
        <div className="card shadow-card-lg border-2 border-primary/20 p-6 sm:p-8 space-y-6 relative overflow-hidden">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gold-light/60 flex items-center justify-center border border-gold/30">
            <Trophy className="w-10 h-10 text-gold-dark animate-pulse" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary-light px-3 py-1 rounded-full">
              Quiz Completed
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-bappa-text">Festive Blessings!</h1>
            <p className="text-bappa-muted text-xs sm:text-sm">
              You have successfully completed the Aarti quiz.
            </p>
          </div>

          {/* Score Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 space-y-2">
            <div className="text-xs font-black text-amber-900 uppercase">Your Final Score</div>
            <div className="text-4xl sm:text-5xl font-black text-primary font-mono drop-shadow-sm">
              {totalEarnedPoints}
            </div>
            <div className="text-xs font-bold text-bappa-muted">
              {correctCount} of {quiz.totalQuestions} questions correct
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/leaderboard" className="btn-primary py-3 px-6 text-sm flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-gold" /> View Leaderboard
            </Link>
            <Link href="/dashboard" className="btn-secondary py-3 px-6 text-sm flex items-center justify-center gap-2">
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
    <div className="max-w-3xl mx-auto space-y-6 pb-20 page-transition">
      {/* Top Header with Q Number, Timer, and Score */}
      <div className="card shadow-card border border-primary/20 p-4 sm:p-5 flex items-center justify-between gap-4">
        {/* Question Counter */}
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-primary text-white font-black flex items-center justify-center text-lg shadow-md">
            {currentIndex + 1}
          </span>
          <div>
            <div className="text-[11px] font-black text-bappa-muted uppercase">
              Question {currentIndex + 1} of {quiz.totalQuestions}
            </div>
            <div className="text-xs font-bold text-bappa-text truncate max-w-[150px] sm:max-w-xs">
              {currentQuestion?.sourceAarti || quiz.title}
            </div>
          </div>
        </div>

        {/* Live Timer Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-xs sm:text-sm border transition-all ${
              timeLeft <= 5 && timerActive
                ? 'bg-error-light text-error border-error/30 animate-pulse'
                : 'bg-primary-light text-primary border-primary/20'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-gold-light text-gold-dark font-black text-xs border border-gold/30">
            <Trophy className="w-3.5 h-3.5" />
            <span>{totalEarnedPoints} pts</span>
          </div>
        </div>
      </div>

      {/* Dynamic Animated Timer Progress Bar */}
      <div className="w-full bg-sand rounded-full h-2.5 overflow-hidden shadow-inner">
        <motion.div
          className={`h-full transition-all duration-300 ${
            timeLeft <= 5 ? 'bg-error' : timeLeft <= 10 ? 'bg-amber-500' : 'bg-primary'
          }`}
          style={{ width: `${timerPercentage}%` }}
        />
      </div>

      {/* Main Question Card */}
      {currentQuestion && (
        <div className="card shadow-card-lg border-2 border-primary/20 p-6 sm:p-8 space-y-6 relative">
          {/* Question Type Tag */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
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

            {/* 5. Match Lines */}
            {currentQuestion.type === 'match_lines' && (
              <MatchLinesPlayer
                question={currentQuestion}
                onSubmit={handleAnswerSubmit}
                disabled={hasSubmitted}
                revealed={isRevealed}
              />
            )}

            {/* 6. MCQ / True False / Missing Line */}
            {['mcq', 'true_false', 'missing_line'].includes(currentQuestion.type) && (
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

          {/* ANSWER REVEAL & AUTHENTIC AARTI REFERENCE BANNER */}
          <AnimatePresence>
            {isRevealed && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4 pt-4 border-t border-bappa-border"
              >
                {/* Result Feedback Banner */}
                {answerResult && (
                  <div
                    className={`p-4 rounded-2xl border flex items-center gap-3 ${
                      answerResult.correct
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    {answerResult.correct ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-black text-sm">
                        {answerResult.correct ? 'Brilliant! Correct Answer!' : 'Time Expired or Incorrect Answer'}
                      </div>
                      <div className="text-xs opacity-90">
                        {answerResult.correct
                          ? `You earned +${answerResult.points} points!`
                          : 'Check the authentic verse reference below.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Verified Source Aarti Reference */}
                <div className="bg-amber-50/80 border border-amber-300/80 rounded-2xl p-4 sm:p-5 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Authentic Verse Reference</span>
                  </div>

                  <div className="text-sm font-bold text-amber-950">
                    {answerResult?.sourceAarti || currentQuestion.sourceAarti}
                  </div>

                  {(answerResult?.sourceLine || currentQuestion.sourceLine) && (
                    <div className="p-3 bg-white/90 border border-amber-200 rounded-xl text-maroon font-black text-sm sm:text-base">
                      "{answerResult?.sourceLine || currentQuestion.sourceLine}"
                    </div>
                  )}

                  {currentQuestion.explanation && (
                    <div className="text-xs text-amber-900/90 pt-1">
                      <span className="font-bold">Meaning / Explanation: </span>
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
