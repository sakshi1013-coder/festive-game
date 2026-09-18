import mongoose, { Schema, Document, model, models } from 'mongoose';

// ─── User ────────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'player' | 'host' | 'admin';
  avatar?: string;
  totalWins: number;
  totalLosses: number;
  totalGamesPlayed: number;
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['player', 'host', 'admin'], default: 'player' },
    avatar: String,
    totalWins: { type: Number, default: 0 },
    totalLosses: { type: Number, default: 0 },
    totalGamesPlayed: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);
UserSchema.index({ totalPoints: -1 });

export const User = models.User || model<IUser>('User', UserSchema);

// ─── Aarti (Verified Corpus) ───────────────────────────────────────────
export interface IAartiSection {
  sectionType: 'verse' | 'chorus';
  verseNumber: number;
  lines: string[];
}

export interface IAarti extends Document {
  title: string;
  deity: string;
  author?: string;
  sections: IAartiSection[];
  allLines: string[];
  createdAt: Date;
}

const AartiSchema = new Schema<IAarti>(
  {
    title: { type: String, required: true, unique: true },
    deity: { type: String, required: true },
    author: String,
    sections: [
      {
        sectionType: { type: String, enum: ['verse', 'chorus'], required: true },
        verseNumber: Number,
        lines: [String],
      },
    ],
    allLines: { type: [String], required: true },
  },
  { timestamps: true }
);

export const Aarti = models.Aarti || model<IAarti>('Aarti', AartiSchema);

// ─── Quiz (Dynamic Room-based Quiz) ───────────────────────────────────────────
export interface IQuiz extends Document {
  roomId: string;
  title: string;
  totalQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  selectedTypes: string[];
  sourceAartis: string[];
  status: 'draft' | 'ready' | 'active' | 'completed';
  createdBy: mongoose.Types.ObjectId;
  currentQuestionIndex: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    roomId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    totalQuestions: { type: Number, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'mixed'], default: 'mixed' },
    selectedTypes: { type: [String], required: true },
    sourceAartis: { type: [String], required: true },
    status: {
      type: String,
      enum: ['draft', 'ready', 'active', 'completed'],
      default: 'draft',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    currentQuestionIndex: { type: Number, default: 0 },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);
QuizSchema.index({ status: 1 });

export const Quiz = models.Quiz || model<IQuiz>('Quiz', QuizSchema);

// ─── QuizQuestion ─────────────────────────────────────────────────────────────
export type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'fill_blank_options'
  | 'arrange_aarti'
  | 'incorrect_word'
  | 'incorrect_sentence'
  | 'missing_line'
  | 'match_lines';

export interface IQuizQuestion extends Document {
  quizId?: mongoose.Types.ObjectId;
  type: QuestionType;
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
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  timerSeconds?: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz' },
    type: {
      type: String,
      enum: [
        'mcq',
        'true_false',
        'fill_blank_options',
        'arrange_aarti',
        'incorrect_word',
        'incorrect_sentence',
        'missing_line',
        'match_lines',
      ],
      default: 'mcq',
    },
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    items: { type: [String], default: [] },
    correctAnswer: { type: Schema.Types.Mixed },
    correctOrder: { type: [String], default: [] },
    incorrectWord: String,
    correctWord: String,
    sentence: String,
    words: { type: [String], default: [] },
    pairs: [
      {
        left: String,
        right: String,
      },
    ],
    explanation: String,
    sourceAarti: String,
    sourceLine: String,
    points: { type: Number, default: 10 },
    timeLimit: { type: Number, default: 25 },
    verified: { type: Boolean, default: true },
    category: String,
    difficulty: { type: String, default: 'easy' },
    timerSeconds: { type: Number, default: 25 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
QuizQuestionSchema.index({ quizId: 1 });
QuizQuestionSchema.index({ type: 1 });
QuizQuestionSchema.index({ category: 1, difficulty: 1 });

export const QuizQuestion =
  models.QuizQuestion || model<IQuizQuestion>('QuizQuestion', QuizQuestionSchema);

// ─── QuizGame ─────────────────────────────────────────────────────────────────
export interface IQuizGame extends Document {
  playerId: mongoose.Types.ObjectId;
  questions: mongoose.Types.ObjectId[];
  answers: { questionId: string; selectedOption: number; correct: boolean; timeTaken: number }[];
  score: number;
  totalQuestions: number;
  category: string;
  completedAt?: Date;
  createdAt: Date;
}

const QuizGameSchema = new Schema<IQuizGame>(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questions: [{ type: Schema.Types.ObjectId, ref: 'QuizQuestion' }],
    answers: [
      {
        questionId: String,
        selectedOption: Number,
        correct: Boolean,
        timeTaken: Number,
      },
    ],
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, required: true },
    category: { type: String, required: true },
    completedAt: Date,
  },
  { timestamps: true }
);
QuizGameSchema.index({ playerId: 1 });
QuizGameSchema.index({ score: -1 });

export const QuizGame = models.QuizGame || model<IQuizGame>('QuizGame', QuizGameSchema);

// ─── HousieGame ───────────────────────────────────────────────────────────────
export interface IHousieGame extends Document {
  name: string;
  description?: string;
  roomCode: string;
  hostId: mongoose.Types.ObjectId;
  status: 'draft' | 'open' | 'started' | 'paused' | 'completed' | 'cancelled';
  maxPlayers: number;
  calledNumbers: number[];
  currentNumber?: number;
  activePatterns: string[];
  patternWinners: Record<string, string[]>; // pattern -> [playerId]
  autoCallInterval: number; // seconds
  winners: {
    playerId: mongoose.Types.ObjectId;
    pattern: string;
    claimId: mongoose.Types.ObjectId;
    approvedAt: Date;
  }[];
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HousieGameSchema = new Schema<IHousieGame>(
  {
    name: { type: String, required: true },
    description: String,
    roomCode: { type: String, required: true, unique: true, uppercase: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['draft', 'open', 'started', 'paused', 'completed', 'cancelled'],
      default: 'draft',
    },
    maxPlayers: { type: Number, default: 20, min: 2, max: 100 },
    calledNumbers: { type: [Number], default: [] },
    currentNumber: Number,
    activePatterns: {
      type: [String],
      default: ['early-five', 'top-line', 'middle-line', 'bottom-line', 'full-house'],
    },
    patternWinners: { type: Map, of: [String], default: {} },
    autoCallInterval: { type: Number, default: 10 },
    winners: [
      {
        playerId: { type: Schema.Types.ObjectId, ref: 'User' },
        pattern: String,
        claimId: { type: Schema.Types.ObjectId, ref: 'WinnerClaim' },
        approvedAt: Date,
      },
    ],
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);
HousieGameSchema.index({ status: 1 });
HousieGameSchema.index({ hostId: 1 });

export const HousieGame = models.HousieGame || model<IHousieGame>('HousieGame', HousieGameSchema);

// ─── HousieTicket ─────────────────────────────────────────────────────────────
export interface IHousieTicket extends Document {
  gameId: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  playerName: string;
  username: string;
  ticketGrid: (number | null)[][]; // 3 rows × 9 cols, null = blank
  markedNumbers: number[];
  ticketStatus: 'active' | 'completed';
  createdAt: Date;
}

const HousieTicketSchema = new Schema<IHousieTicket>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'HousieGame', required: true },
    playerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    playerName: { type: String, required: true },
    username: { type: String, required: true },
    ticketGrid: { type: [[Schema.Types.Mixed]], required: true },
    markedNumbers: { type: [Number], default: [] },
    ticketStatus: { type: String, enum: ['active', 'completed'], default: 'active' },
  },
  { timestamps: true }
);
HousieTicketSchema.index({ gameId: 1 });
HousieTicketSchema.index({ gameId: 1, playerId: 1 }, { unique: true });

export const HousieTicket =
  models.HousieTicket || model<IHousieTicket>('HousieTicket', HousieTicketSchema);

// ─── WinnerClaim ──────────────────────────────────────────────────────────────
export interface IWinnerClaim extends Document {
  gameId: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  pattern: string;
  status: 'pending' | 'approved' | 'rejected';
  claimTime: Date;
  calledNumbersAtClaim: number[];
  serverValidationResult: boolean;
  hostDecisionNote?: string;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
}

const WinnerClaimSchema = new Schema<IWinnerClaim>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'HousieGame', required: true },
    playerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: 'HousieTicket', required: true },
    pattern: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    claimTime: { type: Date, default: Date.now },
    calledNumbersAtClaim: { type: [Number], required: true },
    serverValidationResult: { type: Boolean, required: true },
    hostDecisionNote: String,
    approvedAt: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
WinnerClaimSchema.index({ gameId: 1 });
WinnerClaimSchema.index({ gameId: 1, playerId: 1, pattern: 1 });
WinnerClaimSchema.index({ status: 1 });

export const WinnerClaim =
  models.WinnerClaim || model<IWinnerClaim>('WinnerClaim', WinnerClaimSchema);
