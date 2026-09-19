import axios from 'axios';

export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://festive-game.onrender.com';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
}

export const api = axios.create({
  baseURL: getApiUrl(),
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage on every request and ensure production URL on hosted deployments
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (!config.baseURL || config.baseURL.includes('localhost')) {
        config.baseURL = 'https://festive-game.onrender.com';
      }
    }
    const token = localStorage.getItem('bappaverse_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bappaverse_token');
        localStorage.removeItem('bappaverse_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; username: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/api/auth/login', data),
  getPlayers: () => api.get('/api/auth/players'),
};

// ─── Housie ───────────────────────────────────────────────────────────────────
export const housieApi = {
  getAvailable: () => api.get('/api/housie/available'),
  join: (roomCode: string) => api.post('/api/housie/join', { roomCode }),
  getGame: (gameId: string) => api.get(`/api/housie/${gameId}`),
  getMyTicket: (gameId: string) => api.get(`/api/housie/${gameId}/ticket`),
  claimWin: (gameId: string, pattern: string) =>
    api.post(`/api/housie/${gameId}/claim`, { pattern }),

  // Admin
  create: (data: object) => api.post('/api/housie/create', data),
  adminGetTickets: (gameId: string) => api.get(`/api/housie/admin/${gameId}/tickets`),
  adminGetClaims: (gameId: string) => api.get(`/api/housie/admin/${gameId}/claims`),
  adminCallNumber: (gameId: string, manualNumber?: number) =>
    api.post(`/api/housie/admin/${gameId}/call`, { manualNumber }),
  adminPause: (gameId: string) => api.post(`/api/housie/admin/${gameId}/pause`),
  adminResume: (gameId: string) => api.post(`/api/housie/admin/${gameId}/resume`),
  adminEnd: (gameId: string) => api.post(`/api/housie/admin/${gameId}/end`),
  adminApproveClaim: (claimId: string) =>
    api.post(`/api/housie/admin/claims/${claimId}/approve`),
  adminRejectClaim: (claimId: string, note?: string) =>
    api.post(`/api/housie/admin/claims/${claimId}/reject`, { note }),
  adminGetGames: () => api.get('/api/housie/admin/games'),
};

// ─── Quiz ─────────────────────────────────────────────────────────────────────
export const quizApi = {
  start: (category: string, count = 10) =>
    api.post('/api/quiz/start', { category, count }),
  submit: (data: { questionIds: string[]; answers: object[]; category: string }) =>
    api.post('/api/quiz/submit', data),
  getHistory: () => api.get('/api/quiz/history'),
  adminGetQuestions: () => api.get('/api/quiz/admin/questions'),
  adminAddQuestion: (data: object) => api.post('/api/quiz/admin/questions', data),
  adminUpdateQuestion: (id: string, data: object) =>
    api.put(`/api/quiz/admin/questions/${id}`, data),
  adminDeleteQuestion: (id: string) => api.delete(`/api/quiz/admin/questions/${id}`),
};

// ─── Dynamic AI Aarti Quizzes ────────────────────────────────────────────────
export const quizzesApi = {
  getAartis: () => api.get('/api/quizzes/aartis'),
  generate: (data: {
    roomId?: string;
    title?: string;
    totalQuestions: number;
    difficulty: string;
    selectedTypes: string[];
    sourceAartis: string[];
  }) => api.post('/api/quizzes/generate', data),
  getAll: () => api.get('/api/quizzes'),
  get: (quizId: string) => api.get(`/api/quizzes/${quizId}`),
  start: (quizId: string) => api.post(`/api/quizzes/${quizId}/start`),
  end: (quizId: string) => api.post(`/api/quizzes/${quizId}/end`),
  submit: (quizId: string, data: { questionId: string; answer: any; timeTaken?: number }) =>
    api.post(`/api/quizzes/${quizId}/submit`, data),
  regenerateQuestion: (quizId: string, questionId: string, type?: string) =>
    api.post(`/api/quizzes/${quizId}/regenerate-question`, { questionId, type }),
  updateQuestion: (quizId: string, questionId: string, data: object) =>
    api.patch(`/api/quizzes/${quizId}/questions/${questionId}`, data),
  deleteQuestion: (quizId: string, questionId: string) =>
    api.delete(`/api/quizzes/${quizId}/questions/${questionId}`),
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export const leaderboardApi = {
  get: (tab: string, limit = 20) => api.get(`/api/leaderboard?tab=${tab}&limit=${limit}`),
  getMe: () => api.get('/api/leaderboard/me'),
};

