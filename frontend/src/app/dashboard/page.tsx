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
      icon: <Gamepad2 className="w-5 h-5 text-bappa-text" />,
      color: 'bg-pastel-blue/60',
    },
    {
      label: 'Total Wins',
      value: stats?.user?.totalWins ?? user?.totalWins ?? 0,
      icon: <Trophy className="w-5 h-5 text-bappa-text" />,
      color: 'bg-pastel-yellow/70',
    },
    {
      label: 'Festival Points',
      value: (stats?.user?.totalPoints ?? user?.totalPoints ?? 0).toLocaleString(),
      icon: <Star className="w-5 h-5 text-bappa-text" />,
      color: 'bg-pastel-lavender/60',
    },
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      icon: <TrendingUp className="w-5 h-5 text-bappa-text" />,
      color: 'bg-pastel-mint/70',
    },
    {
      label: 'Leaderboard Rank',
      value: stats?.rank ? `#${stats.rank}` : '–',
      icon: <Trophy className="w-5 h-5 text-bappa-text" />,
      color: 'bg-pastel-peach/70',
    },
    {
      label: 'Quiz Games',
      value: stats?.quizGames?.length ?? 0,
      icon: <BookOpen className="w-5 h-5 text-bappa-text" />,
      color: 'bg-pastel-pink/60',
    },
  ];

  return (
    <div className="space-y-8 page-transition max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pastel-yellow/60 text-bappa-text font-bold text-xs uppercase tracking-wider mb-2">
          🌸 Welcome Back
        </div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-4xl font-black text-bappa-text tracking-tight"
        >
          Namaste, {user?.name?.split(' ')[0]}!
        </motion.h1>
        <p className="text-bappa-muted mt-1 text-sm sm:text-base">
          Ready for festive multiplayer fun? Pick a game room below:
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Live Aarti Quiz */}
        <Link
          href="/quiz"
          className="group bg-gradient-to-br from-pastel-pink/40 to-pastel-lavender/40 hover:to-pastel-lavender/70 border border-pastel-border/80 p-6 rounded-3xl flex items-center gap-4 transition-all shadow-pastel-sm hover:shadow-pastel hover:-translate-y-1"
        >
          <div className="w-14 h-14 rounded-2xl bg-white text-bappa-text flex items-center justify-center flex-shrink-0 shadow-pastel-sm group-hover:scale-105 transition-transform">
            <Flame className="w-7 h-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-black text-bappa-text text-lg flex items-center gap-2">
              <span className="truncate">Live Aarti Quiz</span>
              <span className="text-[10px] bg-pastel-pink text-rose-900 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider flex-shrink-0">
                Live
              </span>
            </div>
            <div className="text-bappa-muted text-xs sm:text-sm mt-0.5">
              Enter room code to join live quiz round
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-xs group-hover:bg-pastel-blue transition-colors">
            <Play className="w-4 h-4 text-bappa-text ml-0.5" />
          </div>
        </Link>

        {/* Ganapati Housie */}
        <Link
          href="/dashboard/housie"
          className="group bg-gradient-to-br from-pastel-blue/40 to-pastel-mint/40 hover:to-pastel-mint/70 border border-pastel-border/80 p-6 rounded-3xl flex items-center gap-4 transition-all shadow-pastel-sm hover:shadow-pastel hover:-translate-y-1"
        >
          <div className="w-14 h-14 rounded-2xl bg-white text-bappa-text flex items-center justify-center flex-shrink-0 shadow-pastel-sm group-hover:scale-105 transition-transform">
            <Ticket className="w-7 h-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-black text-bappa-text text-lg flex items-center gap-2">
              <span className="truncate">Ganapati Housie</span>
              <span className="text-[10px] bg-pastel-mint text-emerald-900 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider flex-shrink-0">
                Multiplayer
              </span>
            </div>
            <div className="text-bappa-muted text-xs sm:text-sm mt-0.5">
              Interactive Tambola tables with 90 numbers
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-xs group-hover:bg-pastel-yellow transition-colors">
            <Grid3X3 className="w-4 h-4 text-bappa-text" />
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div>
        <h2 className="text-xl font-black text-bappa-text mb-4">Your Festival Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {STAT_CARDS.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-3xl p-5 border border-pastel-border/80 shadow-pastel-sm"
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${stat.color} shadow-xs`}>
                {stat.icon}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-bappa-text mt-3">{loading ? '…' : stat.value}</div>
              <div className="text-xs font-bold text-bappa-muted mt-0.5 uppercase tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Quiz Games */}
        <div className="bg-white rounded-3xl p-6 border border-pastel-border/80 shadow-pastel-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-bappa-text flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Recent Quizzes
            </h3>
            <Link href="/dashboard/history" className="text-xs text-primary font-bold hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="text-bappa-muted text-sm text-center py-6">Loading…</div>
          ) : stats?.quizGames?.length > 0 ? (
            <div className="space-y-3">
              {stats.quizGames.slice(0, 5).map((game: any) => (
                <div key={game._id} className="flex items-center gap-3 py-2.5 border-b border-pastel-border/50 last:border-0">
                  <div className="w-10 h-10 bg-pastel-blue/60 rounded-2xl flex items-center justify-center text-bappa-text font-black text-sm">
                    {game.score}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-bappa-text">{game.category}</div>
                    <div className="text-xs text-bappa-muted">
                      {game.score}/{game.totalQuestions * 10} pts • {game.answers?.filter((a: any) => a.correct).length}/{game.totalQuestions} correct
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-bappa-muted font-medium">
                    <Clock className="w-3 h-3" />
                    {new Date(game.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-pastel-lavender/60 flex items-center justify-center mx-auto mb-2">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <p className="text-bappa-muted text-sm">No quizzes played yet.</p>
              <Link href="/quiz" className="btn-primary btn-sm mt-3 inline-flex">
                Join a Live Quiz
              </Link>
            </div>
          )}
        </div>

        {/* Recent Wins */}
        <div className="bg-white rounded-3xl p-6 border border-pastel-border/80 shadow-pastel-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-bappa-text flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-700" /> Recent Wins
            </h3>
            <Link href="/dashboard/wins" className="text-xs text-primary font-bold hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="text-bappa-muted text-sm text-center py-6">Loading…</div>
          ) : stats?.wins?.length > 0 ? (
            <div className="space-y-3">
              {stats.wins.slice(0, 5).map((win: any) => (
                <div key={win._id} className="flex items-center gap-3 py-2.5 border-b border-pastel-border/50 last:border-0">
                  <div className="w-10 h-10 bg-pastel-yellow/70 rounded-2xl flex items-center justify-center text-amber-900">
                    <Trophy className="w-5 h-5 text-amber-800" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-bappa-text">
                      {win.pattern.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </div>
                    <div className="text-xs text-bappa-muted">
                      {win.gameId?.name || 'Housie Game'}
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-pastel-yellow text-amber-900 font-bold text-xs">+50 pts</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-pastel-yellow/60 flex items-center justify-center mx-auto mb-2">
                <Target className="w-6 h-6 text-amber-800" />
              </div>
              <p className="text-bappa-muted text-sm">No wins yet. Keep playing!</p>
              <Link href="/dashboard/housie" className="btn-primary btn-sm mt-3 inline-flex">
                Join Housie Game
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard teaser */}
      <div className="bg-gradient-to-r from-pastel-yellow/50 via-white to-pastel-blue/50 border border-pastel-border/80 rounded-3xl p-6 sm:p-7 shadow-pastel-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-bappa-text text-lg mb-1">Festival Leaderboard</h3>
            <p className="text-bappa-muted text-sm">
              {stats?.rank ? `You are ranked #${stats.rank} globally.` : 'Play live rounds to climb the leaderboard!'}
            </p>
          </div>
          <Link href="/leaderboard" className="btn-primary flex-shrink-0 text-sm py-2.5 px-6 shadow-pastel-sm">
            View Rankings
          </Link>
        </div>
      </div>
    </div>
  );
}
