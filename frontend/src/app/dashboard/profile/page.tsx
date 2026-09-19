'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Trophy, Star, Clock, Target, BookOpen,
  Award, Grid3X3, Flame, LogOut, CheckCircle2, ChevronRight,
  Sparkles, History as HistoryIcon, ShieldCheck, Ticket
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { leaderboardApi, quizApi } from '@/lib/api';
import { PATTERN_LABELS } from '@/types/index';

type TabType = 'wins' | 'history' | 'account';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('wins');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    wins: any[];
    quizGames: any[];
    housieTickets: any[];
    rank: number;
  }>({
    wins: [],
    quizGames: [],
    housieTickets: [],
    rank: 0,
  });

  useEffect(() => {
    // Check if query param specified a tab
    if (typeof window !== 'undefined') {
      const paramTab = new URLSearchParams(window.location.search).get('tab');
      if (paramTab === 'wins' || paramTab === 'history' || paramTab === 'account') {
        setActiveTab(paramTab);
      }
    }

    // Load player stats, wins, and history
    Promise.all([
      leaderboardApi.getMe().catch(() => ({ data: {} })),
      quizApi.getHistory().catch(() => ({ data: { games: [] } })),
    ])
      .then(([meRes, histRes]) => {
        const meData = meRes.data || {};
        const quizHistory = histRes.data?.games || meData.quizGames || [];
        setStats({
          wins: meData.wins || [],
          quizGames: quizHistory,
          housieTickets: meData.housieTickets || [],
          rank: meData.rank || 0,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  return (
    <div className="page-transition max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Identity Card */}
      <div className="card relative overflow-hidden bg-gradient-to-br from-surface via-surface to-primary-light/20 border-2 border-primary/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-saffron-gradient text-white text-3xl font-black flex items-center justify-center shadow-saffron flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-bappa-text truncate">{user.name}</h1>
              <span className="badge-saffron uppercase tracking-wider text-xs font-bold">
                {user.role}
              </span>
              {stats.rank > 0 && (
                <span className="badge-gold text-xs font-bold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Rank #{stats.rank}
                </span>
              )}
            </div>
            <div className="text-bappa-muted text-sm mt-0.5">@{user.username} • {user.email}</div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-center">
            <Link
              href="/quiz"
              className="btn-primary btn-sm flex-1 sm:flex-none flex items-center justify-center gap-1.5 whitespace-nowrap shadow-saffron"
            >
              <Flame className="w-4 h-4" /> Live Quiz
            </Link>
            <Link
              href="/dashboard/housie"
              className="btn-outline btn-sm flex-1 sm:flex-none flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Grid3X3 className="w-4 h-4 text-maroon" /> Housie
            </Link>
          </div>
        </div>

        {/* Quick Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-bappa-border/60">
          <div className="p-3 bg-surface rounded-xl border border-bappa-border/50">
            <div className="flex items-center gap-1.5 text-xs text-bappa-muted font-medium mb-1">
              <Star className="w-4 h-4 text-primary" /> Festival Points
            </div>
            <div className="text-xl font-black text-primary">
              {(user.totalPoints || 0).toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-bappa-border/50">
            <div className="flex items-center gap-1.5 text-xs text-bappa-muted font-medium mb-1">
              <Trophy className="w-4 h-4 text-gold-dark" /> Total Wins
            </div>
            <div className="text-xl font-black text-gold-dark">
              {stats.wins.length || user.totalWins || 0}
            </div>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-bappa-border/50">
            <div className="flex items-center gap-1.5 text-xs text-bappa-muted font-medium mb-1">
              <BookOpen className="w-4 h-4 text-primary" /> Quizzes Played
            </div>
            <div className="text-xl font-black text-bappa-text">
              {stats.quizGames.length}
            </div>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-bappa-border/50">
            <div className="flex items-center gap-1.5 text-xs text-bappa-muted font-medium mb-1">
              <Ticket className="w-4 h-4 text-maroon" /> Housie Games
            </div>
            <div className="text-xl font-black text-bappa-text">
              {stats.housieTickets.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-bappa-border pb-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('wins')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'wins'
              ? 'bg-primary text-white shadow-saffron'
              : 'text-bappa-muted hover:text-bappa-text hover:bg-surface'
          }`}
        >
          <Trophy className="w-4 h-4" />
          My Wins ({stats.wins.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-primary text-white shadow-saffron'
              : 'text-bappa-muted hover:text-bappa-text hover:bg-surface'
          }`}
        >
          <HistoryIcon className="w-4 h-4" />
          Game History ({stats.quizGames.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'account'
              ? 'bg-primary text-white shadow-saffron'
              : 'text-bappa-muted hover:text-bappa-text hover:bg-surface'
          }`}
        >
          <User className="w-4 h-4" />
          Account Details
        </button>
      </div>

      {/* Tab 1: My Wins */}
      {activeTab === 'wins' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Approved Winning Claims</h2>
            <span className="text-xs text-bappa-muted font-medium">Verified by Host & System</span>
          </div>

          {loading ? (
            <div className="card text-center py-12 text-bappa-muted animate-pulse">
              Loading your wins…
            </div>
          ) : stats.wins.length === 0 ? (
            <div className="card text-center py-16">
              <div className="w-16 h-16 bg-gold-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-gold-dark" />
              </div>
              <h3 className="text-xl font-bold text-bappa-text mb-2">No wins recorded yet</h3>
              <p className="text-bappa-muted max-w-sm mx-auto mb-6 text-sm">
                Join an active Ganapati Housie room, mark your numbers, and claim winning patterns like Early 5, Lines, and Full House!
              </p>
              <Link href="/dashboard/housie" className="btn-primary inline-flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" /> Join a Housie Room
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.wins.map((win: any) => {
                const label = PATTERN_LABELS[win.pattern] || win.pattern;
                return (
                  <motion.div
                    key={win._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card flex items-center gap-4 hover:border-gold/50 transition-colors shadow-xs"
                  >
                    <div className="w-12 h-12 bg-gold-light rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Trophy className="w-6 h-6 text-gold-dark" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-bappa-text text-base truncate">
                        {label}
                      </div>
                      <div className="text-xs text-bappa-muted flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-bappa-text/80">
                          {win.gameId?.name || 'Ganapati Housie'}
                        </span>
                        {win.gameId?.roomCode && (
                          <span className="font-mono text-primary font-bold">
                            #{win.gameId.roomCode}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="badge-gold font-bold text-xs">+50 pts</span>
                      <div className="text-xs text-bappa-muted mt-1 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {win.approvedAt
                          ? new Date(win.approvedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Game History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Past Game Sessions</h2>
            <span className="text-xs text-bappa-muted font-medium">Real-time multiplayer logs</span>
          </div>

          {loading ? (
            <div className="card text-center py-12 text-bappa-muted animate-pulse">
              Loading your history…
            </div>
          ) : stats.quizGames.length === 0 ? (
            <div className="card text-center py-16">
              <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-bappa-text mb-2">No quiz sessions yet</h3>
              <p className="text-bappa-muted max-w-sm mx-auto mb-6 text-sm">
                Enter a 6-character room code from your host to test your Aarti knowledge and climb the leaderboard.
              </p>
              <Link href="/quiz" className="btn-primary inline-flex items-center gap-2">
                <Flame className="w-4 h-4" /> Join Live Aarti Quiz
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.quizGames.map((game: any) => {
                const correctCount = game.answers?.filter((a: any) => a.correct).length || 0;
                const totalQ = game.totalQuestions || (game.answers?.length || 10);
                const score = game.score || 0;

                return (
                  <motion.div
                    key={game._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card flex items-center gap-4 hover:border-primary/30 transition-colors shadow-xs"
                  >
                    <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center flex-shrink-0 text-primary font-black text-base">
                      {score}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-bappa-text text-base truncate">
                        {game.category || 'Ganapati Aarti Quiz'}
                      </div>
                      <div className="text-xs text-bappa-muted flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-success">
                          {correctCount} / {totalQ} correct
                        </span>
                        <span>•</span>
                        <span>Multiplayer Live Session</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="badge-saffron font-bold text-xs">{score} Pts</span>
                      <div className="text-xs text-bappa-muted mt-1 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {game.createdAt
                          ? new Date(game.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Account Details */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-bold text-bappa-text text-lg mb-4">Account Information</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 py-3 border-b border-bappa-border">
                <Mail className="w-5 h-5 text-bappa-muted" />
                <div>
                  <div className="text-xs text-bappa-muted">Email Address</div>
                  <div className="font-medium text-bappa-text">{user.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 py-3 border-b border-bappa-border">
                <User className="w-5 h-5 text-bappa-muted" />
                <div>
                  <div className="text-xs text-bappa-muted">Username</div>
                  <div className="font-medium text-bappa-text">@{user.username}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 py-3 border-b border-bappa-border sm:border-b-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-bappa-muted">Account Role</div>
                  <div className="font-bold text-primary uppercase">{user.role}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 py-3">
                <Star className="w-5 h-5 text-gold-dark" />
                <div>
                  <div className="text-xs text-bappa-muted">Lifetime Points</div>
                  <div className="font-bold text-gold-dark">{(user.totalPoints || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-error-light/40 border border-error/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-bappa-text">Sign Out</h4>
              <p className="text-xs text-bappa-muted mt-0.5">End your current session on this device</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="btn-outline text-error border-error/50 hover:bg-error hover:text-white flex items-center gap-2 flex-shrink-0"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
