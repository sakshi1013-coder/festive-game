'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles, CheckCircle2, RotateCcw, Play, Trash2, Edit3,
  ArrowUp, ArrowDown, BookOpen, AlertCircle, Loader2,
  ShieldCheck, HelpCircle, Layers, Check, Clock,
  Search, Link2, Scale, PlusCircle, Edit2, CheckCircle,
  Copy, RefreshCw, ChevronRight, ArrowLeft
} from 'lucide-react';
import { quizzesApi, quizApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  AartiItem, DynamicQuiz, DynamicQuizQuestion,
  AartiQuestionType, QUESTION_TYPE_LABELS, QuizQuestion
} from '@/types/index';
import { getSocket } from '@/lib/socket';

const QUESTION_COUNTS = [5, 10, 15, 20];
const DIFFICULTIES = [
  { key: 'mixed', label: 'Mixed' },
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

const CATEGORIES = [
  { id: 'Ganapati Basics', label: 'Ganapati Basics' },
  { id: 'Ganesh Chaturthi Traditions', label: 'Festival Traditions' },
  { id: 'Maharashtra Culture', label: 'Culture & Heritage' },
  { id: 'Modak & Festival Food', label: 'Modak & Festive Food' },
  { id: 'Ganapati History', label: 'Mythology & History' },
  { id: 'Festival Knowledge', label: 'Festival Knowledge' },
];

const EMPTY_FORM = {
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  category: 'Ganapati Basics',
  difficulty: 'easy' as 'easy' | 'medium' | 'hard',
  timerSeconds: 25,
};

const getQuestionTypeIcon = (type: AartiQuestionType) => {
  switch (type) {
    case 'mcq': return <CheckCircle2 className="w-4 h-4 text-primary" />;
    case 'true_false': return <Scale className="w-4 h-4 text-primary" />;
    case 'fill_blank_options': return <Edit3 className="w-4 h-4 text-primary" />;
    case 'arrange_aarti': return <Layers className="w-4 h-4 text-primary" />;
    case 'incorrect_word': return <Search className="w-4 h-4 text-primary" />;
    case 'incorrect_sentence': return <AlertCircle className="w-4 h-4 text-primary" />;
    case 'missing_line': return <BookOpen className="w-4 h-4 text-primary" />;
    case 'match_lines': return <Link2 className="w-4 h-4 text-primary" />;
    default: return <HelpCircle className="w-4 h-4 text-primary" />;
  }
};

const DEFAULT_AARTIS: AartiItem[] = [
  { _id: '1', title: 'सुखकर्ता दुखहर्ता', deity: 'श्री गणपती', lineCount: 16, sectionCount: 4, preview: ['सुखकर्ता दुःखहर्ता वार्ता विघ्नाची', 'नुरवी पुरवी प्रेम कृपा जयाची'] },
  { _id: '2', title: 'लवथवती विक्राळा', deity: 'श्री शंकर', lineCount: 16, sectionCount: 4, preview: ['लवथवती विक्राळा ब्रह्मांडी माळा', 'वीषे कंठ काळा त्रिनेत्री ज्वाळा'] },
  { _id: '3', title: 'दुर्गे दुर्घट भारी', deity: 'श्री दुर्गा देवी', lineCount: 16, sectionCount: 4, preview: ['दुर्गे दुर्घट भारी तुजविण संसारी', 'अनाथनाथे अंबे करुणा विस्तारी'] },
  { _id: '4', title: 'श्री विठोबाची आरती', deity: 'श्री विठ्ठल', lineCount: 20, sectionCount: 5, preview: ['येई हो विठ्ठले माझे माऊली ये', 'निढळावरी कर ठेवुनी वाट मी पाहे'] },
  { _id: '5', title: 'श्री पांडुरंगाची आरती', deity: 'श्री पांडुरंग', lineCount: 16, sectionCount: 4, preview: ['आनंदाचे डोही आनंद तरंग', 'आनंदचि अंग आनंदाचे'] },
  { _id: '6', title: 'ज्ञानराजा आरती', deity: 'संत ज्ञानेश्वर', lineCount: 16, sectionCount: 4, preview: ['आरती ज्ञानराजा महाकैवल्यतेजा', 'सेविती साधुसंत हणुमंत महाध्वजा'] },
  { _id: '7', title: 'आरती तुकारामा', deity: 'संत तुकाराम', lineCount: 16, sectionCount: 4, preview: ['आरती तुकारामा स्वामी सदगुरुधामा', 'सच्चिदानंद रूपा जय यतिवररामा'] },
  { _id: '8', title: 'घालीन लोटांगण', deity: 'सर्व देवता / नमन', lineCount: 16, sectionCount: 4, preview: ['घालीन लोटांगण वंदीन चरण', 'डोळ्यांनी पाहीन रूप तुझे'] },
  { _id: '9', title: 'प्रार्थना', deity: 'प्रार्थना व क्षमायाचना', lineCount: 12, sectionCount: 3, preview: ['आता विश्वात्मके देवे येणे वाग्यज्ञे तोषावे', 'तोषोनि मज द्यावे पसायदान हे'] },
  { _id: '10', title: 'मंत्र पुष्पाञ्जलि', deity: 'वेदोक्त मंत्र', lineCount: 16, sectionCount: 4, preview: ['ॐ यज्ञेन यज्ञमयजन्त देवास्तानि धर्माणि प्रथमान्यासन्', 'ते ह नाकं महिमानः सचन्त यत्र पूर्वे साध्याः सन्ति देवाः'] },
  { _id: '11', title: 'श्रीगणपती स्तोत्र', deity: 'संकटनाशन स्तोत्र', lineCount: 16, sectionCount: 4, preview: ['प्रणम्य शिरसा देवं गौरीपुत्रं विनायकम्', 'भक्तावासं स्मरेन्नित्यमायुःकामार्थसिद्धये'] },
];

export default function UnifiedQuizManagerPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'generator' | 'history' | 'bank'>('generator');

  // ─── Quiz History & Done Quizzes States ───────────────────────────────────────
  const [quizList, setQuizList] = useState<DynamicQuiz[]>([]);
  const [loadingQuizList, setLoadingQuizList] = useState(false);
  const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);

  const loadQuizList = useCallback(async () => {
    try {
      setLoadingQuizList(true);
      const res = await quizzesApi.getAll();
      setQuizList(res.data.quizzes || []);
    } catch {
      // ignore
    } finally {
      setLoadingQuizList(false);
    }
  }, []);

  // ─── AI Aarti Generator States ────────────────────────────────────────────────
  const [aartis, setAartis] = useState<AartiItem[]>([]);
  const [loadingAartis, setLoadingAartis] = useState(true);
  const [selectedAartis, setSelectedAartis] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isCustomCount, setIsCustomCount] = useState(false);
  const [customCountValue, setCustomCountValue] = useState('10');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mixed']);

  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [generatorError, setGeneratorError] = useState('');

  const [generatedQuiz, setGeneratedQuiz] = useState<DynamicQuiz | null>(null);
  const [questions, setQuestions] = useState<DynamicQuizQuestion[]>([]);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<DynamicQuizQuestion | null>(null);
  const [editForm, setEditForm] = useState<{ question: string; options: string[] }>({
    question: '',
    options: [],
  });

  // ─── Custom Question Bank States ──────────────────────────────────────────────
  const [bankQuestions, setBankQuestions] = useState<QuizQuestion[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [editBankId, setEditBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({ ...EMPTY_FORM });
  const [savingBank, setSavingBank] = useState(false);
  const [deletingBankId, setDeletingBankId] = useState<string | null>(null);
  const [bankFilter, setBankFilter] = useState('All');
  const [bankError, setBankError] = useState('');

  // Load verified Aartis and past Quizzes from MongoDB
  useEffect(() => {
    loadQuizList();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'history' || tab === 'done' || tab === 'list') {
        setActiveTab('history');
      }
    }

    quizzesApi
      .getAartis()
      .then((res) => {
        const list = res.data?.aartis && res.data.aartis.length > 0 ? res.data.aartis : DEFAULT_AARTIS;
        setAartis(list);
        setSelectedAartis(list.map((a: AartiItem) => a.title));
      })
      .catch(() => {
        // Resilient fallback to verified Aartis corpus so host is never blocked
        setAartis(DEFAULT_AARTIS);
        setSelectedAartis(DEFAULT_AARTIS.map((a) => a.title));
      })
      .finally(() => setLoadingAartis(false));
  }, [loadQuizList]);

  // Listen to real-time socket progress for generation
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;

    socket.on('quiz:generation_started', () => {
      setGenerating(true);
      setGenerationProgress(10);
      setGenerationMessage('Verifying Aarti references…');
    });

    socket.on('quiz:generation_progress', ({ progress, message }: { progress: number; message: string }) => {
      setGenerationProgress(progress);
      setGenerationMessage(message);
    });

    socket.on('quiz:generation_completed', ({ quiz, questions }: any) => {
      if (quiz) setGeneratedQuiz(quiz);
      if (questions) setQuestions(questions);
      setGenerating(false);
      setGenerationProgress(100);
    });

    socket.on('quiz:generation_failed', ({ error: err }: { error: string }) => {
      setGenerating(false);
      setGeneratorError(err || 'Quiz generation failed.');
    });

    return () => {
      socket.off('quiz:generation_started');
      socket.off('quiz:generation_progress');
      socket.off('quiz:generation_completed');
      socket.off('quiz:generation_failed');
    };
  }, [token]);

  // Load custom question bank when tab switched
  const loadBank = async () => {
    setLoadingBank(true);
    try {
      const res = await quizApi.adminGetQuestions();
      setBankQuestions(res.data.questions || []);
    } catch {
      setBankQuestions([]);
    } finally {
      setLoadingBank(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bank') {
      loadBank();
    }
  }, [activeTab]);

  // Toggle Aarti Selection
  const toggleAarti = (title: string) => {
    setSelectedAartis((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  // Toggle Question Type Selection
  const toggleType = (typeKey: string) => {
    if (typeKey === 'mixed') {
      setSelectedTypes(['mixed']);
      return;
    }
    let updated = selectedTypes.filter((t) => t !== 'mixed');
    if (updated.includes(typeKey)) {
      updated = updated.filter((t) => t !== typeKey);
    } else {
      updated.push(typeKey);
    }
    if (updated.length === 0) updated = ['mixed'];
    setSelectedTypes(updated);
  };

  // Submit Generation
  const handleGenerate = async () => {
    setGeneratorError('');
    const finalCount = isCustomCount ? parseInt(customCountValue, 10) || 10 : questionCount;

    if (selectedAartis.length === 0) {
      setGeneratorError('Please select at least one Aarti.');
      return;
    }

    setGenerating(true);
    setGenerationProgress(15);
    setGenerationMessage('Generating questions from authentic hymns…');

    try {
      const res = await quizzesApi.generate({
        totalQuestions: finalCount,
        difficulty,
        selectedTypes,
        sourceAartis: selectedAartis,
      });

      setGeneratedQuiz(res.data.quiz);
      setQuestions(res.data.questions);
      setGenerationProgress(100);
    } catch (err: any) {
      setGeneratorError(err.response?.data?.error || err.message || 'Error generating quiz.');
    } finally {
      setGenerating(false);
    }
  };

  // Regenerate Single Question
  const handleRegenerateSingle = async (questionId: string) => {
    if (!generatedQuiz) return;
    setRegeneratingId(questionId);
    try {
      const res = await quizzesApi.regenerateQuestion(generatedQuiz._id, questionId);
      const updated = res.data.question;
      setQuestions((prev) => prev.map((q) => (q._id === questionId ? updated : q)));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not regenerate this question.');
    } finally {
      setRegeneratingId(null);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!generatedQuiz) return;
    if (!confirm('Are you sure you want to remove this question from the quiz?')) return;

    try {
      await quizzesApi.deleteQuestion(generatedQuiz._id, questionId);
      setQuestions((prev) => prev.filter((q) => q._id !== questionId));
    } catch {
      alert('Error removing question.');
    }
  };

  // Move Question Order
  const handleMoveQuestion = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= questions.length) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setQuestions(reordered);
  };

  // Open Edit Modal
  const handleOpenEdit = (q: DynamicQuizQuestion) => {
    setEditingQuestion(q);
    setEditForm({
      question: q.question,
      options: q.options ? [...q.options] : [],
    });
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!generatedQuiz || !editingQuestion) return;
    try {
      const res = await quizzesApi.updateQuestion(generatedQuiz._id, editingQuestion._id, editForm);
      setQuestions((prev) =>
        prev.map((q) => (q._id === editingQuestion._id ? res.data.question : q))
      );
      setEditingQuestion(null);
    } catch {
      alert('Error updating question.');
    }
  };

  // Start Live Quiz
  const handleStartLiveQuiz = async () => {
    if (!generatedQuiz) return;
    try {
      await quizzesApi.start(generatedQuiz._id);
      router.push(`/admin/quiz/control/${generatedQuiz._id}`);
    } catch {
      router.push(`/admin/quiz/control/${generatedQuiz._id}`);
    }
  };

  // Bank handlers
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.question.trim()) { setBankError('Question is required'); return; }
    if (bankForm.options.some((o) => !o.trim())) { setBankError('All 4 options are required'); return; }
    setSavingBank(true);
    setBankError('');
    try {
      if (editBankId) {
        await quizApi.adminUpdateQuestion(editBankId, bankForm);
      } else {
        await quizApi.adminAddQuestion(bankForm);
      }
      setShowBankForm(false);
      setEditBankId(null);
      setBankForm({ ...EMPTY_FORM });
      await loadBank();
    } catch (err: any) {
      setBankError(err.response?.data?.error || 'Failed to save question');
    } finally {
      setSavingBank(false);
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    setDeletingBankId(id);
    try {
      await quizApi.adminDeleteQuestion(id);
      setBankQuestions((prev) => prev.filter((q) => q._id !== id));
    } finally {
      setDeletingBankId(null);
    }
  };

  const filteredBank = bankFilter === 'All'
    ? bankQuestions
    : bankQuestions.filter((q) => q.category === bankFilter);

  return (
    <div className="space-y-8 page-transition max-w-5xl mx-auto pb-16">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pastel-lavender/60 text-bappa-text font-bold text-xs uppercase tracking-wider mb-2">
            ✨ Quiz Control Center
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-bappa-text tracking-tight">Quiz Manager</h1>
          <p className="text-bappa-muted text-sm mt-1">
            Generate dynamic AI Aarti quizzes or manage festival trivia questions.
          </p>
        </div>

        {/* Unified Tabs */}
        <div className="flex flex-wrap items-center bg-white p-1.5 rounded-2xl border border-pastel-border/80 shadow-pastel-sm gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'generator'
                ? 'bg-pastel-blue text-bappa-text shadow-xs'
                : 'text-bappa-muted hover:text-bappa-text'
            }`}
          >
            <Sparkles className="w-4 h-4 text-primary" /> Create Quiz
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              loadQuizList();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-pastel-blue text-bappa-text shadow-xs'
                : 'text-bappa-muted hover:text-bappa-text'
            }`}
          >
            <Layers className="w-4 h-4 text-primary" /> Quizzes Done & Live
            {quizList.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/80 text-bappa-text text-[10px] font-black rounded-full shadow-xs">
                {quizList.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'bank'
                ? 'bg-pastel-blue text-bappa-text shadow-xs'
                : 'text-bappa-muted hover:text-bappa-text'
            }`}
          >
            <BookOpen className="w-4 h-4 text-primary" /> Trivia Question Bank
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════════
          TAB 1: AI AARTI QUIZ GENERATOR
         ══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'generator' && (
        <div className="space-y-8">
          {generatorError && (
            <div className="bg-pastel-pink/40 border border-pastel-pink text-error rounded-2xl p-4 flex items-center gap-3 text-sm font-bold">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{generatorError}</span>
            </div>
          )}

          {/* Quick link to Quizzes Done & Live */}
          {quizList.length > 0 && !generatedQuiz && (
            <div className="bg-gradient-to-r from-pastel-blue/50 via-pastel-lavender/40 to-pastel-mint/40 border border-pastel-border/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-pastel-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-primary shadow-xs flex-shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-bappa-text text-sm">
                    {quizList.filter((q) => q.status === 'completed').length} Completed Quizzes & {quizList.filter((q) => q.status !== 'completed').length} Live/Ready
                  </div>
                  <div className="text-xs text-bappa-muted font-bold">
                    View list of completed quizzes, re-open host control rooms, or copy player invite links.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('history');
                  loadQuizList();
                }}
                className="btn-outline py-2 px-4 text-xs font-black flex items-center gap-1.5 whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>View Quizzes Done & Live</span>
                <ChevronRight className="w-3.5 h-3.5 text-primary" />
              </button>
            </div>
          )}

          {/* Setup Form (when not yet generated) */}
          {!generatedQuiz && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-8 shadow-pastel-sm border border-pastel-border/80">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pastel-lavender/60 text-bappa-text rounded-full text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Aarti Quiz Generator
                </div>
                <h2 className="text-2xl font-black text-bappa-text">Configure Live Aarti Quiz</h2>
                <p className="text-bappa-muted text-sm mt-0.5">
                  Synthesize verified quiz questions dynamically from authentic hymns in MongoDB.
                </p>
              </div>

              {/* 1. Number of Questions */}
              <div>
                <label className="block text-sm font-black text-bappa-text mb-3">
                  1. Number of Questions:
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {QUESTION_COUNTS.map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => {
                        setQuestionCount(cnt);
                        setIsCustomCount(false);
                      }}
                      className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${
                        !isCustomCount && questionCount === cnt
                          ? 'bg-pastel-blue text-bappa-text shadow-xs ring-2 ring-pastel-blue'
                          : 'bg-pastel-surface border border-pastel-border text-bappa-text hover:border-pastel-blue'
                      }`}
                    >
                      {cnt} Questions
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setIsCustomCount(true)}
                    className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${
                      isCustomCount
                        ? 'bg-pastel-blue text-bappa-text shadow-xs ring-2 ring-pastel-blue'
                        : 'bg-pastel-surface border border-pastel-border text-bappa-text hover:border-pastel-blue'
                    }`}
                  >
                    Custom
                  </button>

                  {isCustomCount && (
                    <input
                      type="number"
                      min={3}
                      max={30}
                      value={customCountValue}
                      onChange={(e) => setCustomCountValue(e.target.value)}
                      className="bg-pastel-surface border border-pastel-border rounded-2xl px-3 py-2 text-center font-bold text-bappa-text w-24 outline-none focus:border-primary"
                      placeholder="Count"
                    />
                  )}
                </div>
              </div>

              {/* 2. Difficulty Level */}
              <div>
                <label className="block text-sm font-black text-bappa-text mb-3">
                  2. Difficulty Level:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDifficulty(d.key as any)}
                      className={`p-3.5 rounded-2xl font-bold text-sm border-2 text-center transition-all ${
                        difficulty === d.key
                          ? 'border-pastel-blue bg-pastel-blue/60 text-bappa-text shadow-xs'
                          : 'border-pastel-border bg-pastel-surface/60 text-bappa-text hover:border-pastel-blue'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Question Types */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-black text-bappa-text">
                    3. Question Types:
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedTypes(['mixed'])}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Reset to Mixed
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Mixed Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedTypes(['mixed'])}
                    className={`p-3.5 rounded-2xl text-left border-2 transition-all ${
                      selectedTypes.includes('mixed')
                        ? 'border-pastel-blue bg-pastel-blue/60 shadow-xs'
                        : 'border-pastel-border bg-pastel-surface/60 hover:border-pastel-blue'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-bappa-text text-sm">
                      <Sparkles className="w-4 h-4 text-primary" /> Mixed Types
                    </div>
                    <div className="text-xs text-bappa-muted mt-1">
                      Balanced mix of MCQs, fill blanks, verse order, and error spotting
                    </div>
                  </button>

                  {/* Individual Question Types */}
                  {(Object.keys(QUESTION_TYPE_LABELS) as AartiQuestionType[]).map((key) => {
                    const info = QUESTION_TYPE_LABELS[key];
                    const isSelected = !selectedTypes.includes('mixed') && selectedTypes.includes(key);

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleType(key)}
                        className={`p-3.5 rounded-2xl text-left border-2 transition-all ${
                          isSelected
                            ? 'border-pastel-blue bg-pastel-blue/60 shadow-xs'
                            : 'border-pastel-border bg-pastel-surface/60 hover:border-pastel-blue'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-bappa-text text-sm">
                            {getQuestionTypeIcon(key)} {info.label}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="text-xs text-bappa-muted mt-1">{info.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Aarti Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-black text-bappa-text">
                    4. Select Source Aartis:
                  </label>
                  <div className="flex gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setSelectedAartis(aartis.map((a) => a.title))}
                      className="text-primary hover:underline"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedAartis([])}
                      className="text-bappa-muted hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {loadingAartis ? (
                  <div className="text-center py-6 text-bappa-muted text-sm flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading hymns from database…
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {aartis.map((a) => {
                      const isChecked = selectedAartis.includes(a.title);
                      return (
                        <div
                          key={a._id}
                          onClick={() => toggleAarti(a.title)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            isChecked
                              ? 'border-pastel-mint bg-pastel-mint/60 shadow-xs'
                              : 'border-pastel-border bg-pastel-surface/60 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-black text-bappa-text text-base">{a.title}</div>
                              <div className="text-xs text-primary font-bold mt-0.5">{a.deity}</div>
                              {a.author && (
                                <div className="text-xs text-bappa-muted mt-0.5">Author: {a.author}</div>
                              )}
                            </div>
                            <div
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center ${
                                isChecked ? 'bg-primary border-primary text-white' : 'border-pastel-border bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-bappa-muted border-t border-pastel-border/60 pt-2 font-mono">
                            {a.lineCount} verified lines
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Real-time Progress Bar */}
              {generating && (
                <div className="p-5 bg-pastel-lavender/50 rounded-2xl border border-pastel-border space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-bappa-text">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" /> {generationMessage}
                    </span>
                    <span>{generationProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-pastel-surface rounded-full overflow-hidden border border-pastel-border/60">
                    <motion.div
                      className="h-full bg-gradient-to-r from-pastel-blue to-primary rounded-full transition-all"
                      animate={{ width: `${generationProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || selectedAartis.length === 0}
                className="btn-primary w-full py-4 flex items-center justify-center gap-3 text-lg font-black shadow-pastel-sm"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Generating Quiz…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" /> Generate Quiz
                  </>
                )}
              </button>
            </div>
          )}

          {/* Generated Quiz Review & Launch View */}
          {generatedQuiz && (
            <div className="space-y-6">
              {/* Header Action Bar */}
              <div className="card bg-surface border-2 border-primary/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 overflow-hidden max-w-full">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-saffron text-sm font-black tracking-wider px-3 py-1 font-mono">
                      Room Code: {generatedQuiz.roomId}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedQuiz.roomId);
                        alert(`Room Code ${generatedQuiz.roomId} copied to clipboard!`);
                      }}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      (Copy Code)
                    </button>
                    <span className="badge-gold text-xs font-bold">{questions.length} Questions</span>
                    <span className="badge-success text-xs font-bold">Ready</span>
                  </div>
                  <h2 className="text-2xl font-black text-bappa-text mt-1.5 truncate">
                    {generatedQuiz.title
                      ?.replace(/^Aarti Knowledge Quiz\s*\([^)]*\)/i, 'Ganapati Aarti Quiz')
                      .replace(/\([^)]*\)/g, '')
                      .trim() || 'Ganapati Aarti Quiz'}
                  </h2>
                  <div className="text-xs text-bappa-muted mt-1 flex items-center gap-2">
                    <span className="font-semibold text-primary">{generatedQuiz.sourceAartis.length} Aartis Selected</span>
                    <span>•</span>
                    <span>Sacred Marathi Verses</span>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 flex-shrink-0 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => setGeneratedQuiz(null)}
                    className="btn-outline btn-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <RotateCcw className="w-4 h-4" /> Create New
                  </button>

                  <button
                    type="button"
                    onClick={handleStartLiveQuiz}
                    className="btn-primary btn-sm shadow-saffron flex items-center justify-center gap-2 font-black px-5 whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-white" /> Start Live Quiz
                  </button>
                </div>
              </div>

              {/* Questions Preview List */}
              <div className="space-y-4">
                <h3 className="font-black text-bappa-text text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-success" /> Verified Questions Preview ({questions.length})
                </h3>

                {questions.map((q, idx) => {
                  const typeInfo = QUESTION_TYPE_LABELS[q.type] || {
                    label: q.type,
                    desc: '',
                  };
                  const isRegenerating = regeneratingId === q._id;

                  return (
                    <motion.div
                      key={q._id}
                      layout
                      className="card border-2 border-bappa-border hover:border-primary/50 transition-all p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-7 h-7 rounded-lg bg-primary text-white font-black text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="badge-gold text-xs font-bold">
                            {typeInfo.label}
                          </span>
                          <span className="badge-saffron text-xs font-bold">{q.sourceAarti}</span>
                          <span className="text-xs text-bappa-muted font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {q.timeLimit}s
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, idx - 1)}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg border border-bappa-border hover:bg-surface-secondary disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, idx + 1)}
                            disabled={idx === questions.length - 1}
                            className="p-1.5 rounded-lg border border-bappa-border hover:bg-surface-secondary disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(q)}
                            className="p-1.5 rounded-lg border border-bappa-border hover:bg-surface-secondary text-primary"
                            title="Edit Question"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerateSingle(q._id)}
                            disabled={isRegenerating}
                            className="p-1.5 rounded-lg border border-bappa-border hover:bg-surface-secondary text-gold-dark"
                            title="Regenerate This Question"
                          >
                            {isRegenerating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q._id)}
                            className="p-1.5 rounded-lg border border-bappa-border hover:bg-error-light text-error"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Marathi Question Content */}
                      <div className="text-base sm:text-lg font-bold text-bappa-text whitespace-pre-line">
                        {q.question}
                      </div>

                      {/* Arrange Words */}
                      {q.type === 'arrange_aarti' && q.items && (
                        <div className="p-3 bg-surface-secondary rounded-xl text-sm">
                          <div className="text-xs text-bappa-muted font-bold mb-1">Jumbled words shown to player:</div>
                          <div className="flex flex-wrap gap-2">
                            {q.items.map((it, i) => (
                              <span key={i} className="px-2.5 py-1 bg-surface rounded-lg border font-bold text-xs">
                                {it}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Incorrect word sentence */}
                      {q.type === 'incorrect_word' && q.sentence && (
                        <div className="p-3 bg-surface-secondary rounded-xl text-sm font-bold">
                          Sentence: <span className="text-primary">"{q.sentence}"</span>
                        </div>
                      )}

                      {/* Options */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, i) => (
                            <div
                              key={i}
                              className={`p-2.5 rounded-xl border text-xs font-semibold ${
                                opt === q.correctAnswer
                                  ? 'border-success bg-success-light text-success font-bold'
                                  : 'border-bappa-border bg-surface text-bappa-muted'
                              }`}
                            >
                              <span className="font-bold mr-1.5">{String.fromCharCode(65 + i)}.</span>
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Verified Answer Ribbon for Host */}
                      <div className="pt-2 border-t border-bappa-border/40 flex flex-wrap items-center justify-between text-xs font-bold gap-2">
                        <div className="text-success flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            Correct Answer:{' '}
                            {q.type === 'arrange_aarti'
                              ? q.correctOrder?.join(' ')
                              : q.type === 'incorrect_word'
                              ? `${q.incorrectWord} (Correct: ${q.correctWord})`
                              : String(q.correctAnswer)}
                          </span>
                        </div>
                        {q.sourceLine && (
                          <div className="text-bappa-muted">
                            Authentic Line: <em>"{q.sourceLine}"</em>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          TAB 2: QUIZZES DONE & ACTIVE LIVE SESSIONS
         ══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-pastel-border/80 shadow-pastel-sm">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-pastel-mint/80 text-emerald-900 rounded-full text-xs font-black mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Host Quiz History
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-bappa-text tracking-tight">List of Quizzes Done & Live</h2>
              <p className="text-bappa-muted text-xs sm:text-sm font-medium mt-1">
                Review completed Aarti quiz games, jump to host control rooms, or copy player invite links.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => loadQuizList()}
                className="btn-outline py-2.5 px-4 text-xs font-bold flex items-center gap-1.5"
                title="Refresh Quiz List"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingQuizList ? 'animate-spin text-primary' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('generator')}
                className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-1.5 shadow-pastel-sm"
              >
                <PlusCircle className="w-4 h-4" /> Create Quiz
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-pastel-border/80 shadow-pastel-sm">
              <div className="text-xs font-black text-bappa-muted uppercase tracking-wider">Total Quizzes</div>
              <div className="text-3xl font-black text-bappa-text mt-1">{quizList.length}</div>
              <div className="text-xs text-bappa-muted font-medium mt-1">Generated and hosted</div>
            </div>
            <div className="bg-pastel-mint/50 p-5 rounded-3xl border border-pastel-mint shadow-pastel-sm">
              <div className="text-xs font-black text-emerald-900 uppercase tracking-wider">Quizzes Completed</div>
              <div className="text-3xl font-black text-emerald-800 mt-1">
                {quizList.filter((q) => q.status === 'completed').length}
              </div>
              <div className="text-xs text-emerald-700 font-medium mt-1">Concluded with final scores</div>
            </div>
            <div className="bg-pastel-yellow/50 p-5 rounded-3xl border border-pastel-yellow shadow-pastel-sm">
              <div className="text-xs font-black text-amber-900 uppercase tracking-wider">Live & Ready</div>
              <div className="text-3xl font-black text-amber-800 mt-1">
                {quizList.filter((q) => q.status !== 'completed').length}
              </div>
              <div className="text-xs text-amber-700 font-medium mt-1">Active or waiting rooms</div>
            </div>
          </div>

          {/* Quizzes List */}
          {loadingQuizList ? (
            <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-pastel-border/80 shadow-pastel-sm">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-sm font-bold text-bappa-muted">Loading quizzes list…</p>
            </div>
          ) : quizList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center space-y-4 border border-pastel-border/80 shadow-pastel-sm">
              <div className="w-14 h-14 bg-pastel-lavender rounded-2xl flex items-center justify-center mx-auto text-primary shadow-xs">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-bappa-text">No Quizzes Created Yet</h3>
              <p className="text-sm text-bappa-muted max-w-md mx-auto">
                Generate your first dynamic AI Aarti quiz room to host multiplayer quiz games.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('generator')}
                className="btn-primary py-2.5 px-6 text-xs inline-flex items-center gap-2 shadow-pastel-sm"
              >
                <PlusCircle className="w-4 h-4" /> Create Your First Quiz
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {quizList.map((item, idx) => {
                const isCompleted = item.status === 'completed';
                const cleanItemTitle =
                  item.title
                    ?.replace(/^Aarti Knowledge Quiz\s*\([^)]*\)/i, 'Ganapati Aarti Quiz')
                    .replace(/\([^)]*\)/g, '')
                    .trim() || 'Ganapati Aarti Quiz';

                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="bg-white rounded-3xl p-5 sm:p-6 border border-pastel-border/80 shadow-pastel-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-pastel-blue transition-all"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      {/* Room Code Badge */}
                      <div className="flex flex-col items-center justify-center w-24 sm:w-28 py-2.5 px-2 rounded-2xl bg-pastel-surface border border-pastel-border text-center flex-shrink-0">
                        <span className="text-[10px] font-black text-bappa-muted uppercase tracking-wider">Room Code</span>
                        <span className="text-lg sm:text-xl font-black font-mono text-primary tracking-wider">
                          {item.roomId}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.roomId);
                            setCopiedQuizId(item._id);
                            setTimeout(() => setCopiedQuizId(null), 2000);
                          }}
                          className="text-[10px] font-bold text-bappa-muted hover:text-primary flex items-center gap-1 mt-1 transition-colors"
                        >
                          {copiedQuizId === item._id ? (
                            <span className="text-emerald-600 flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Copied
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5">
                              <Copy className="w-3 h-3" /> Copy
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Main Details */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-pastel-mint text-emerald-900 border border-pastel-mint'
                                : item.status === 'active'
                                ? 'bg-pastel-yellow text-amber-900 border border-pastel-yellow animate-pulse'
                                : 'bg-pastel-lavender text-bappa-text border border-pastel-lavender'
                            }`}
                          >
                            {isCompleted ? '✓ Completed' : item.status === 'active' ? '● Live' : 'Ready'}
                          </span>
                          <span className="text-xs bg-pastel-surface px-2.5 py-0.5 rounded-full font-bold text-bappa-text border border-pastel-border/60">
                            {item.difficulty?.toUpperCase()} • {item.totalQuestions} Questions
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-bappa-text truncate">{cleanItemTitle}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-bappa-muted font-medium">
                          {item.sourceAartis && item.sourceAartis.length > 0 && (
                            <span>{item.sourceAartis.length} Sacred Aartis</span>
                          )}
                          <span>•</span>
                          <span>
                            {item.completedAt
                              ? `Ended: ${new Date(item.completedAt).toLocaleDateString()} ${new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : `Created: ${new Date(item.createdAt).toLocaleDateString()} ${new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-pastel-border/60">
                      <button
                        type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/quiz/${item.roomId}`;
                          navigator.clipboard.writeText(link);
                          setCopiedQuizId(`link-${item._id}`);
                          setTimeout(() => setCopiedQuizId(null), 2000);
                        }}
                        className="btn-outline py-2 px-3 text-xs font-bold flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {copiedQuizId === `link-${item._id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Player Link</span>
                          </>
                        )}
                      </button>

                      <Link
                        href={`/admin/quiz/control/${item._id}`}
                        className={`py-2 px-4 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] ${
                          isCompleted
                            ? 'bg-pastel-surface hover:bg-pastel-surface/80 text-bappa-text border border-pastel-border'
                            : 'btn-primary'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 text-primary" />
                        <span>{isCompleted ? 'View Host Room' : 'Open Control Room'}</span>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          TAB 3: CUSTOM QUESTION BANK
         ══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-bappa-text">Custom Question Bank</h2>
              <p className="text-bappa-muted text-sm mt-0.5">{bankQuestions.length} manual trivia questions available</p>
            </div>
            <button
              onClick={() => { setShowBankForm(!showBankForm); setEditBankId(null); setBankForm({ ...EMPTY_FORM }); }}
              className="btn-primary"
            >
              <PlusCircle className="w-4 h-4" /> Add Custom Question
            </button>
          </div>

          {/* Add/Edit Form */}
          {showBankForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card border-2 border-primary/20"
            >
              <h3 className="font-bold text-bappa-text mb-4">{editBankId ? 'Edit Question' : 'Add New Question'}</h3>
              <form onSubmit={handleSaveBank} className="space-y-4">
                <div>
                  <label className="label">Question *</label>
                  <textarea
                    value={bankForm.question}
                    onChange={(e) => setBankForm((f) => ({ ...f, question: e.target.value }))}
                    className="input-field resize-none"
                    rows={2}
                    placeholder="Enter your question here…"
                    required
                  />
                </div>

                <div>
                  <label className="label">Options * <span className="text-bappa-muted font-normal text-xs">(Click circle to select correct answer)</span></label>
                  <div className="space-y-2">
                    {bankForm.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setBankForm((f) => ({ ...f, correctAnswer: i }))}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            bankForm.correctAnswer === i ? 'border-success bg-success text-white' : 'border-bappa-border'
                          }`}
                        >
                          {bankForm.correctAnswer === i && <CheckCircle className="w-3 h-3" />}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const opts = [...bankForm.options];
                            opts[i] = e.target.value;
                            setBankForm((f) => ({ ...f, options: opts }));
                          }}
                          className="input-field flex-1"
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Category</label>
                    <select
                      value={bankForm.category}
                      onChange={(e) => setBankForm((f) => ({ ...f, category: e.target.value }))}
                      className="input-field"
                    >
                      {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Difficulty</label>
                    <select
                      value={bankForm.difficulty}
                      onChange={(e) => setBankForm((f) => ({ ...f, difficulty: e.target.value as any }))}
                      className="input-field"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Timer (seconds)</label>
                    <input
                      type="number"
                      value={bankForm.timerSeconds}
                      onChange={(e) => setBankForm((f) => ({ ...f, timerSeconds: parseInt(e.target.value) }))}
                      className="input-field"
                      min={10}
                      max={120}
                    />
                  </div>
                </div>

                {bankError && <div className="text-error text-sm font-medium">{bankError}</div>}

                <div className="flex gap-3">
                  <button type="submit" className="btn-primary" disabled={savingBank}>
                    {savingBank ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : (editBankId ? 'Update Question' : 'Save Question')}
                  </button>
                  <button type="button" onClick={() => { setShowBankForm(false); setEditBankId(null); }} className="btn-outline">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setBankFilter('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                bankFilter === 'All' ? 'bg-primary text-white border-primary' : 'bg-surface border-bappa-border text-bappa-muted hover:border-primary hover:text-primary'
              }`}
            >
              All Questions
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setBankFilter(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  bankFilter === c.id ? 'bg-primary text-white border-primary' : 'bg-surface border-bappa-border text-bappa-muted hover:border-primary hover:text-primary'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Questions list */}
          {loadingBank ? (
            <div className="card text-center py-8 text-bappa-muted">Loading questions…</div>
          ) : filteredBank.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <p className="text-bappa-muted">No custom questions found.</p>
              <button onClick={() => setShowBankForm(true)} className="btn-primary btn-sm mt-4">Add Your First Question</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBank.map((q, i) => (
                <motion.div
                  key={q._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`badge text-xs ${
                          q.difficulty === 'hard' ? 'badge-maroon' :
                          q.difficulty === 'medium' ? 'badge-gold' : 'badge-success'
                        }`}>{q.difficulty}</span>
                        <span className="badge-saffron text-xs">{q.category}</span>
                        <span className="text-xs text-bappa-muted">{q.timerSeconds}s timer</span>
                      </div>
                      <p className="font-medium text-bappa-text">{q.question}</p>
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        {q.options?.map((opt, i) => (
                          <div key={i} className={`text-xs px-2 py-1 rounded-lg ${i === q.correctAnswer ? 'bg-success-light text-success font-semibold' : 'text-bappa-muted'}`}>
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditBankId(q._id);
                          setBankForm({
                            question: q.question,
                            options: [...q.options],
                            correctAnswer: q.correctAnswer || 0,
                            category: q.category,
                            difficulty: q.difficulty,
                            timerSeconds: q.timerSeconds,
                          });
                          setShowBankForm(true);
                        }}
                        className="btn-ghost p-2 text-primary hover:bg-primary-light"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBank(q._id)}
                        disabled={deletingBankId === q._id}
                        className="btn-ghost p-2 text-error hover:bg-error-light"
                      >
                        {deletingBankId === q._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Question Edit Modal for Dynamic Quiz ───────────────────────────────── */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-lg w-full space-y-4 shadow-card-lg">
            <h3 className="text-lg font-black text-bappa-text">Edit Question</h3>
            <div>
              <label className="label">Question Text:</label>
              <textarea
                rows={3}
                value={editForm.question}
                onChange={(e) => setEditForm((f) => ({ ...f, question: e.target.value }))}
                className="input-field"
              />
            </div>

            {editForm.options.length > 0 && (
              <div className="space-y-2">
                <label className="label">Options:</label>
                {editForm.options.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...editForm.options];
                      updated[idx] = e.target.value;
                      setEditForm((f) => ({ ...f, options: updated }));
                    }}
                    className="input-field text-sm"
                  />
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-3">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="btn-primary btn-sm shadow-saffron"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
