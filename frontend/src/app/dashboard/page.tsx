'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Trophy,
  Gamepad2,
  TrendingUp,
  Star,
  Play,
  Grid3X3,
  BookOpen,
  Clock,
  Ticket,
  Flame,
  Target,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { leaderboardApi } from '@/lib/api';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leaderboardApi.getMe()
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const winRate = user && user.totalGamesPlayed
    ? Math.round(((user.totalWins || 0) / user.totalGamesPlayed) * 100)
    : 0;

  const STAT_CARDS = [
    {
      label: 'Games Played',
      value: stats?.user?.totalGamesPlayed ?? user?.totalGamesPlayed ?? 0,
      icon: <Gamepad2 className="w-5 h-5" />,
      color: 'text-primary bg-primary-light',
    },
    {
      label: 'Total Wins',
      value: stats?.user?.totalWins ?? user?.totalWins ?? 0,
      icon: <Trophy className="w-5 h-5" />,
      color: 'text-gold-dark bg-gold-light',
    },
    {
      label: 'Festival Points',
      value: (stats?.user?.totalPoints ?? user?.totalPoints ?? 0).toLocaleString(),
      icon: <Star className="w-5 h-5" />,
      color: 'text-maroon bg-maroon-light',
    },
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-success bg-success-light',
    },
    {
      label: 'Leaderboard Rank',
      value: stats?.rank ? `#${stats.rank}` : '–',
      icon: <Trophy className="w-5 h-5" />,
      color: 'text-primary bg-primary-light',
    },
    {
      label: 'Quiz Games',
      value: stats?.quizGames?.length ?? 0,
      icon: <BookOpen className="w-5 h-5" />,
      color: 'text-maroon bg-maroon-light',
    },
  ];

  return (
    <div className="space-y-8 page-transition">
      {/* Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-black text-bappa-text"
        >
          Namaste, {user?.name?.split(' ')[0]}!
        </motion.h1>
        <p className="text-bappa-muted mt-1 text-sm sm:text-base">
          Welcome to your festival dashboard. Ready to play?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Live Aarti Quiz */}
        <Link
          href="/quiz"
          className="card-hover group border-2 border-primary/25 bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-5 rounded-2xl flex items-center gap-4 transition-all"
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-bappa-text text-base sm:text-lg flex items-center gap-2">
              <span className="truncate">Live Aarti Quiz</span>
              <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex-shrink-0">
                Live
              </span>
            </div>
            <div className="text-bappa-muted text-xs line-clamp-1 mt-0.5">
              Enter room code to join live game
            </div>
          </div>
          <Play className="w-4 h-4 text-primary ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* Ganapati Housie */}
        <Link
          href="/dashboard/housie"
          className="card-hover group p-5 rounded-2xl flex items-center gap-4 transition-all"
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-maroon-light text-maroon flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Ticket className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-bappa-text text-base sm:text-lg truncate">
              Ganapati Housie
            </div>
            <div className="text-bappa-muted text-xs line-clamp-1 mt-0.5">
              Live multiplayer Tambola rooms
            </div>
          </div>
          <Grid3X3 className="w-4 h-4 text-maroon ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div>
        <h2 className="section-title mb-4">Your Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {STAT_CARDS.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="stat-card"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="stat-value mt-2">{loading ? '…' : stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Quiz Games */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-bappa-text flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Recent Quizzes
            </h3>
            <Link href="/dashboard/history" className="text-xs text-primary font-semibold hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="text-bappa-muted text-sm text-center py-6">Loading…</div>
          ) : stats?.quizGames?.length > 0 ? (
            <div className="space-y-3">
              {stats.quizGames.slice(0, 5).map((game: any) => (
                <div key={game._id} className="flex items-center gap-3 py-2 border-b border-bappa-border last:border-0">
                  <div className="w-9 h-9 bg-primary-light rounded-xl flex items-center justify-center text-primary font-bold text-sm">
                    {game.score}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-bappa-text">{game.category}</div>
                    <div className="text-xs text-bappa-muted">
                      {game.score}/{game.totalQuestions * 10} pts • {game.answers?.filter((a: any) => a.correct).length}/{game.totalQuestions} correct
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-bappa-muted">
                    <Clock className="w-3 h-3" />
                    {new Date(game.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-primary/30 mx-auto mb-2" />
              <p className="text-bappa-muted text-sm">No quizzes played yet.</p>
              <Link href="/quiz" className="btn-primary btn-sm mt-3 inline-flex">
                Join a Live Quiz
              </Link>
            </div>
          )}
        </div>

        {/* Recent Wins */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-bappa-text flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold-dark" /> Recent Wins
            </h3>
            <Link href="/dashboard/wins" className="text-xs text-primary font-semibold hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="text-bappa-muted text-sm text-center py-6">Loading…</div>
          ) : stats?.wins?.length > 0 ? (
            <div className="space-y-3">
              {stats.wins.slice(0, 5).map((win: any) => (
                <div key={win._id} className="flex items-center gap-3 py-2 border-b border-bappa-border last:border-0">
                  <div className="w-9 h-9 bg-gold-light rounded-xl flex items-center justify-center text-gold-dark">
                    <Trophy className="w-4 h-4 text-gold-dark" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-bappa-text">
                      {win.pattern.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </div>
                    <div className="text-xs text-bappa-muted">
                      {win.gameId?.name || 'Housie Game'}
                    </div>
                  </div>
                  <span className="badge-gold text-xs">+50 pts</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-10 h-10 text-gold-dark/30 mx-auto mb-2" />
              <p className="text-bappa-muted text-sm">No wins yet. Keep playing!</p>
              <Link href="/dashboard/housie" className="btn-maroon btn-sm mt-3 inline-flex">
                Join Housie Game
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard teaser */}
      <div className="card bg-gradient-to-r from-maroon-light to-surface-secondary border-maroon/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-bappa-text mb-1">Festival Leaderboard</h3>
            <p className="text-bappa-muted text-sm">
              {stats?.rank ? `You are ranked #${stats.rank} globally.` : 'Play games to get ranked!'}
            </p>
          </div>
          <Link href="/leaderboard" className="btn-maroon btn-sm flex-shrink-0">
            View Rankings
          </Link>
        </div>
      </div>
    </div>
  );
}
