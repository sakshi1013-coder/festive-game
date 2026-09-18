// ─── Core types shared between frontend components ─────────────────────────

export interface User {
  _id: string;
  id?: string;
  name: string;
  username: string;
  email: string;
  role: 'player' | 'host' | 'admin';
  avatar?: string;
  totalWins: number;
  totalLosses: number;
  totalGamesPlayed: number;
  totalPoints: number;
  createdAt: string;
}

export interface HousieGame {
  _id: string;
  name: string;
  description?: string;
  roomCode: string;
  hostId: string | User;
  status: 'draft' | 'open' | 'started' | 'paused' | 'completed' | 'cancelled';
  maxPlayers: number;
  calledNumbers: number[];
  currentNumber?: number;
  activePatterns: string[];
  autoCallInterval: number;
  winners: WinEntry[];
  playerCount?: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface WinEntry {
  playerId: string;
  pattern: string;
  claimId: string;
  approvedAt: string;
}

export interface HousieTicket {
  _id: string;
  gameId: string;
  playerId: string | User;
  playerName: string;
  username: string;
  ticketGrid: (number | null)[][];
  markedNumbers: number[];
  ticketStatus: 'active' | 'completed';
  createdAt: string;
}

export interface WinnerClaim {
  _id: string;
  gameId: string;
  playerId: string | User;
  ticketId: string | HousieTicket;
  pattern: string;
  status: 'pending' | 'approved' | 'rejected';
  claimTime: string;
  calledNumbersAtClaim: number[];
  serverValidationResult: boolean;
  hostDecisionNote?: string;
  approvedAt?: string;
  approvedBy?: string;
  playerName?: string;
  ticket?: HousieTicket;
}

export interface QuizQuestion {
  _id: string;
  question: string;
  options: string[];
  correctAnswer?: number; // Only present in admin
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timerSeconds: number;
}

export interface QuizGame {
  _id: string;
  playerId: string;
  questions: string[];
  answers: {
    questionId: string;
    selectedOption: number;
    correct: boolean;
    timeTaken: number;
  }[];
  score: number;
  totalQuestions: number;
  category: string;
  completedAt?: string;
  createdAt: string;
}

export interface PatternResult {
  pattern: string;
  completed: boolean;
  matchedNumbers: number[];
}

export interface PlayerProgress {
  markedCount: number;
  totalNumbers: number;
  progressPercent: number;
  patterns: Record<string, PatternResult>;
  completedPatterns: string[];
}

export interface TicketWithProgress extends HousieTicket {
  progress: PlayerProgress;
  claims: WinnerClaim[];
}

export interface LeaderboardEntry {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
  totalWins: number;
  totalPoints: number;
  totalGamesPlayed: number;
  totalLosses?: number;
  totalScore?: number;
  gamesPlayed?: number;
}

export const PATTERN_LABELS: Record<string, string> = {
  'early-five': 'Early Five',
  'top-line': 'Top Line',
  'middle-line': 'Middle Line',
  'bottom-line': 'Bottom Line',
  'four-corners': 'Four Corners',
  'full-house': 'Full House',
};

export const QUIZ_CATEGORIES = [
  { value: 'random', label: 'All Questions (Mixed)', icon: 'Sparkles' },
  { value: 'Ganapati Basics', label: 'Ganapati Basics', icon: 'Flame' },
  { value: 'Ganesh Chaturthi Traditions', label: 'Festival Traditions', icon: 'BookOpen' },
  { value: 'Maharashtra Culture', label: 'Culture & Heritage', icon: 'Award' },
  { value: 'Modak & Festival Food', label: 'Modak & Festive Food', icon: 'Star' },
  { value: 'Ganapati History', label: 'Mythology & History', icon: 'History' },
  { value: 'Festival Knowledge', label: 'Festival Knowledge', icon: 'Trophy' },
];

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-bappa-border text-bappa-muted',
  open: 'bg-success-light text-success',
  ready: 'bg-gold-light text-gold-dark',
  started: 'bg-primary-light text-primary',
  active: 'bg-primary-light text-primary',
  paused: 'bg-gold-light text-gold-dark',
  completed: 'bg-maroon-light text-maroon',
  cancelled: 'bg-error-light text-error',
};

// ─── Dynamic AI Aarti Quiz Types ───────────────────────────────────────────────
export type AartiQuestionType =
  | 'mcq'
  | 'true_false'
  | 'fill_blank_options'
  | 'arrange_aarti'
  | 'incorrect_word'
  | 'incorrect_sentence'
  | 'missing_line'
  | 'match_lines';

export interface AartiItem {
  _id: string;
  title: string;
  deity: string;
  author?: string;
  lineCount: number;
  sectionCount: number;
  preview: string[];
}

export interface DynamicQuiz {
  _id: string;
  roomId: string;
  title: string;
  totalQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  selectedTypes: string[];
  sourceAartis: string[];
  status: 'draft' | 'ready' | 'active' | 'completed';
  createdBy: string | User;
  currentQuestionIndex: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface DynamicQuizQuestion {
  _id: string;
  quizId: string;
  type: AartiQuestionType;
  question: string;
  options?: string[];
  items?: string[];
  correctAnswer?: string | number;
  correctOrder?: string[];
  incorrectWord?: string;
  correctWord?: string;
  sentence?: string;
  words?: string[];
  pairs?: { left: string; right: string }[];
  explanation?: string;
  sourceAarti?: string;
  sourceLine?: string;
  points: number;
  timeLimit: number;
  verified: boolean;
  difficulty?: string;
  createdAt: string;
}

export const QUESTION_TYPE_LABELS: Record<AartiQuestionType, { label: string; desc: string }> = {
  mcq: { label: 'Multiple Choice (MCQ)', desc: 'Choose the correct answer from four options' },
  true_false: { label: 'True or False', desc: 'Determine whether the verse statement is correct' },
  fill_blank_options: { label: 'Fill in the Blanks', desc: 'Select the missing word from the options' },
  arrange_aarti: { label: 'Arrange Aarti Line', desc: 'Reorder jumbled words into the sacred verse order' },
  incorrect_word: { label: 'Find Incorrect Word', desc: 'Identify the altered word in the verse' },
  incorrect_sentence: { label: 'Find Incorrect Line', desc: 'Pick the modified incorrect line among authentic verses' },
  missing_line: { label: 'Missing Verse Line', desc: 'Identify the next line in the stanza' },
  match_lines: { label: 'Match Aarti Lines', desc: 'Pair the first half of the verse with its second half' },
};

