'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Trophy, Star, BookOpen, Grid3X3, ArrowLeft, Medal, Award, Flame } from 'lucide-react';
import { leaderboardApi } from '@/lib/api';
import { LeaderboardEntry } from '@/types/index';
import { useAuth } from '@/lib/auth';

const TABS = [
  { key: 'overall', label: 'Overall', icon: <Trophy className="w-4 h-4" /> },
  { key: 'quiz', label: 'Quiz', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'housie', label: 'Housie', icon: <Grid3X3 className="w-4 h-4" /> },
];

const RANK_DISPLAY = (rank: number) => {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-black text-xs shadow-sm">#1</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-black text-xs shadow-sm">#2</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-black text-xs shadow-sm">#3</span>;
  return <span className="text-bappa-muted text-sm font-semibold">#{rank}</span>;
};

export default function LeaderboardPage() {
  const { user, isHost } = useAuth();
  const [tab, setTab] = useState('overall');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    leaderboardApi.get(tab)
      .then((res) => {
        // Exclude host from list if present
        const list = (res.data.leaderboard || []).filter((e: any) => e.role !== 'host' && e.username !== 'bappahost');
        setData(list);
        setPlayerRank(res.data.playerRank);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-surface border-b border-bappa-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={isHost ? '/admin' : user ? '/dashboard' : '/'} className="btn-ghost p-2">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-bappa-text">Festival Leaderboard</h1>
              <p className="text-xs text-bappa-muted">Ganesh Chaturthi 2024 Rankings</p>
            </div>
          </div>
          {!isHost && playerRank > 0 && (
            <div className="badge-saffron">Your rank: #{playerRank}</div>
          )}
          {isHost && (
            <div className="badge-maroon text-xs">Host View (Excluded from rankings)</div>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  tab === t.key
                    ? 'bg-primary text-white shadow-saffron'
                    : 'text-bappa-muted hover:bg-surface-secondary'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Top 3 Podium */}
        {data.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-8">
            {/* 2nd */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-surface border-4 border-bappa-border text-2xl font-black flex items-center justify-center mx-auto mb-2">
                {data[1]?.name?.charAt(0)}
              </div>
              <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-1">Rank #2</div>
              <div className="font-semibold text-bappa-text text-sm truncate max-w-[80px]">{data[1]?.name?.split(' ')[0]}</div>
              <div className="text-xs text-bappa-muted">{(data[1]?.totalPoints || data[1]?.totalScore || 0).toLocaleString()} pts</div>
            </motion.div>
            {/* 1st */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-gold-light border-4 border-gold text-3xl font-black flex items-center justify-center mx-auto mb-2 shadow-gold">
                {data[0]?.name?.charAt(0)}
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-black mb-1 shadow-sm"><Trophy className="w-3.5 h-3.5 text-amber-500" /> Rank #1</div>
              <div className="font-bold text-bappa-text truncate max-w-[90px]">{data[0]?.name?.split(' ')[0]}</div>
              <div className="text-xs text-bappa-muted">{(data[0]?.totalPoints || data[0]?.totalScore || 0).toLocaleString()} pts</div>
            </motion.div>
            {/* 3rd */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-full bg-surface border-4 border-bappa-border text-xl font-black flex items-center justify-center mx-auto mb-2">
                {data[2]?.name?.charAt(0)}
              </div>
              <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold mb-1">Rank #3</div>
              <div className="font-semibold text-bappa-text text-sm truncate max-w-[70px]">{data[2]?.name?.split(' ')[0]}</div>
              <div className="text-xs text-bappa-muted">{(data[2]?.totalPoints || data[2]?.totalScore || 0).toLocaleString()} pts</div>
            </motion.div>
          </div>
        )}

        {/* Full table */}
        <div className="card">
          {loading ? (
            <div className="text-center py-12 text-bappa-muted">Loading rankings…</div>
          ) : data.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-7 h-7 text-primary" />
              </div>
              <p className="text-bappa-muted">No players yet. Be the first to play!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-bappa-muted text-sm border-b border-bappa-border">
                    <th className="pb-3 font-semibold w-12">Rank</th>
                    <th className="pb-3 font-semibold">Player</th>
                    <th className="pb-3 font-semibold text-right">Points</th>
                    <th className="pb-3 font-semibold text-right hidden sm:table-cell">Wins</th>
                    <th className="pb-3 font-semibold text-right hidden md:table-cell">Games</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((entry, i) => {
                    const isMe = user && (entry._id === user.id || entry.username === user.username);
                    return (
                      <motion.tr
                        key={entry._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`border-b border-bappa-border last:border-0 ${isMe ? 'bg-primary-light' : ''}`}
                      >
                        <td className="py-3 text-center font-bold text-lg">
                          {RANK_DISPLAY(i + 1)}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center flex-shrink-0 ${
                              i === 0 ? 'bg-gold-light text-gold-dark' :
                              i === 1 ? 'bg-bappa-border text-bappa-muted' :
                              i === 2 ? 'bg-primary-light text-primary' :
                              'bg-surface-secondary text-bappa-muted'
                            }`}>
                              {entry.name?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-bappa-text text-sm">{entry.name}{isMe && <span className="ml-1 text-xs text-primary">(You)</span>}</div>
                              <div className="text-xs text-bappa-muted">@{entry.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <div className="font-bold text-gold-dark">{(entry.totalPoints || entry.totalScore || 0).toLocaleString()}</div>
                        </td>
                        <td className="py-3 text-right text-bappa-muted text-sm hidden sm:table-cell">
                          {entry.totalWins || 0}
                        </td>
                        <td className="py-3 text-right text-bappa-muted text-sm hidden md:table-cell">
                          {entry.totalGamesPlayed || entry.gamesPlayed || 0}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Your rank callout - only for players, excluded for host */}
        {!isHost && user && playerRank > 0 && (
          <div className="card mt-4 bg-primary-light border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-primary" />
              <span className="font-semibold text-bappa-text">Your rank: <strong className="text-primary">#{playerRank}</strong></span>
            </div>
            <Link href="/dashboard/quiz" className="btn-primary btn-sm">Play to climb!</Link>
          </div>
        )}
      </div>
    </div>
  );
}
