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
  if (rank === 1) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-2xl bg-pastel-yellow text-amber-900 font-black text-xs shadow-xs">#1</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-2xl bg-pastel-blue text-bappa-text font-black text-xs shadow-xs">#2</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-2xl bg-pastel-pink text-rose-900 font-black text-xs shadow-xs">#3</span>;
  return <span className="text-bappa-muted text-sm font-bold">#{rank}</span>;
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
    <div className="min-h-screen bg-background pb-16">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-pastel-border/80 shadow-pastel-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={isHost ? '/admin' : user ? '/dashboard' : '/'} className="w-9 h-9 rounded-2xl bg-pastel-surface hover:bg-pastel-blue/40 border border-pastel-border flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4 text-bappa-text" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-bappa-text tracking-tight">Festival Leaderboard</h1>
              <p className="text-xs text-bappa-muted font-medium">Ganesh Chaturthi Championship Lounge</p>
            </div>
          </div>
          {!isHost && playerRank > 0 && (
            <div className="px-3 py-1 rounded-full bg-pastel-yellow text-amber-900 font-black text-xs shadow-xs">
              Your Rank: #{playerRank}
            </div>
          )}
          {isHost && (
            <div className="px-3 py-1 rounded-full bg-pastel-lavender text-bappa-text font-bold text-xs">
              Host View (Live Overseer)
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                  tab === t.key
                    ? 'bg-pastel-blue text-bappa-text shadow-xs ring-2 ring-pastel-blue'
                    : 'bg-pastel-surface text-bappa-muted hover:text-bappa-text'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Top 3 Podium (1st: Yellow, 2nd: Blue, 3rd: Pink) */}
        {data.length >= 3 && (
          <div className="flex items-end justify-center gap-3 sm:gap-6 mb-10 pt-4">
            {/* 2nd - Pastel Blue */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center flex-1 max-w-[140px]"
            >
              <div className="bg-white rounded-3xl p-4 border border-pastel-border/80 shadow-pastel-sm hover:shadow-pastel transition-all">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-pastel-blue/80 border-2 border-pastel-blue text-bappa-text text-2xl font-black flex items-center justify-center mx-auto mb-2 shadow-xs">
                  {data[1]?.name?.charAt(0)}
                </div>
                <div className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-pastel-blue text-bappa-text text-[11px] font-black mb-1">
                  Rank #2
                </div>
                <div className="font-bold text-bappa-text text-xs sm:text-sm truncate">{data[1]?.name?.split(' ')[0]}</div>
                <div className="text-[11px] font-black text-primary mt-0.5">{(data[1]?.totalPoints || data[1]?.totalScore || 0).toLocaleString()} pts</div>
              </div>
              <div className="h-14 sm:h-18 bg-pastel-blue/40 rounded-t-2xl mt-2 flex items-center justify-center font-black text-bappa-text/50 text-xs">
                2nd
              </div>
            </motion.div>

            {/* 1st - Pastel Yellow */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center flex-1 max-w-[160px] -mt-6"
            >
              <div className="bg-white rounded-3xl p-5 border-2 border-pastel-yellow shadow-pastel hover:shadow-pastel-md transition-all ring-4 ring-pastel-yellow/30">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-pastel-yellow text-amber-900 text-3xl font-black flex items-center justify-center mx-auto mb-2 shadow-pastel-sm">
                  {data[0]?.name?.charAt(0)}
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-pastel-yellow text-amber-950 text-xs font-black mb-1 shadow-xs">
                  <Trophy className="w-3.5 h-3.5 text-amber-700" /> Champion
                </div>
                <div className="font-black text-bappa-text text-sm sm:text-base truncate">{data[0]?.name?.split(' ')[0]}</div>
                <div className="text-xs font-black text-primary mt-0.5">{(data[0]?.totalPoints || data[0]?.totalScore || 0).toLocaleString()} pts</div>
              </div>
              <div className="h-20 sm:h-24 bg-pastel-yellow/60 rounded-t-2xl mt-2 flex items-center justify-center font-black text-amber-900/60 text-sm">
                1st 👑
              </div>
            </motion.div>

            {/* 3rd - Pastel Pink */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center flex-1 max-w-[140px]"
            >
              <div className="bg-white rounded-3xl p-4 border border-pastel-border/80 shadow-pastel-sm hover:shadow-pastel transition-all">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-pastel-pink/80 border-2 border-pastel-pink text-rose-900 text-xl font-black flex items-center justify-center mx-auto mb-2 shadow-xs">
                  {data[2]?.name?.charAt(0)}
                </div>
                <div className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-pastel-pink text-rose-900 text-[11px] font-black mb-1">
                  Rank #3
                </div>
                <div className="font-bold text-bappa-text text-xs sm:text-sm truncate">{data[2]?.name?.split(' ')[0]}</div>
                <div className="text-[11px] font-black text-primary mt-0.5">{(data[2]?.totalPoints || data[2]?.totalScore || 0).toLocaleString()} pts</div>
              </div>
              <div className="h-10 sm:h-12 bg-pastel-pink/40 rounded-t-2xl mt-2 flex items-center justify-center font-black text-rose-900/50 text-xs">
                3rd
              </div>
            </motion.div>
          </div>
        )}

        {/* Full table */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-pastel-border/80 shadow-pastel-sm">
          {loading ? (
            <div className="text-center py-12 text-bappa-muted font-bold">Loading rankings…</div>
          ) : data.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-pastel-yellow/60 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-pastel-sm">
                <Trophy className="w-8 h-8 text-amber-800" />
              </div>
              <p className="text-bappa-text font-bold">No tournament records yet. Be the first to play!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-bappa-muted text-xs uppercase tracking-wider border-b border-pastel-border/60">
                    <th className="pb-3 font-bold w-14">Rank</th>
                    <th className="pb-3 font-bold">Player</th>
                    <th className="pb-3 font-bold text-right">Points</th>
                    <th className="pb-3 font-bold text-right hidden sm:table-cell">Wins</th>
                    <th className="pb-3 font-bold text-right hidden md:table-cell">Games</th>
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
                        className={`border-b border-pastel-border/40 last:border-0 ${isMe ? 'bg-pastel-blue/30' : 'hover:bg-pastel-surface/60'}`}
                      >
                        <td className="py-3.5 text-center">
                          {RANK_DISPLAY(i + 1)}
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-2xl font-black text-sm flex items-center justify-center flex-shrink-0 ${
                              i === 0 ? 'bg-pastel-yellow text-amber-950' :
                              i === 1 ? 'bg-pastel-blue text-bappa-text' :
                              i === 2 ? 'bg-pastel-pink text-rose-900' :
                              'bg-pastel-surface text-bappa-text'
                            }`}>
                              {entry.name?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-bappa-text text-sm">{entry.name}{isMe && <span className="ml-1.5 text-xs text-primary font-black">(You)</span>}</div>
                              <div className="text-xs text-bappa-muted font-medium">@{entry.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="font-black text-bappa-text text-base">{(entry.totalPoints || entry.totalScore || 0).toLocaleString()}</div>
                        </td>
                        <td className="py-3.5 text-right text-bappa-muted text-sm font-semibold hidden sm:table-cell">
                          {entry.totalWins || 0}
                        </td>
                        <td className="py-3.5 text-right text-bappa-muted text-sm font-semibold hidden md:table-cell">
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
          <div className="mt-5 bg-white rounded-3xl p-5 border border-pastel-border/80 shadow-pastel-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pastel-yellow/70 flex items-center justify-center text-amber-800 shadow-xs">
                <Star className="w-5 h-5" />
              </div>
              <span className="font-bold text-bappa-text">Your Standing: <strong className="text-primary font-black">#{playerRank}</strong></span>
            </div>
            <Link href="/quiz" className="btn-primary btn-sm py-2 px-5 shadow-pastel-sm">Play to Climb!</Link>
          </div>
        )}
      </div>
    </div>
  );
}
