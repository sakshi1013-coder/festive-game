'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlusCircle, Gamepad2, Users, Trophy, ChevronRight, Activity, Sparkles, BookOpen, Ticket } from 'lucide-react';
import { housieApi } from '@/lib/api';
import { HousieGame, STATUS_COLORS } from '@/types/index';

export default function AdminDashboard() {
  const [games, setGames] = useState<HousieGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    housieApi.adminGetGames()
      .then((res) => setGames(res.data.games || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeGames = games.filter((g) => ['open', 'started'].includes(g.status));
  const totalGames = games.length;

  return (
    <div className="space-y-8 page-transition">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-bappa-text">Host Dashboard</h1>
          <p className="text-bappa-muted mt-1">Manage your Ganapati festival games</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Games', value: totalGames, icon: <Gamepad2 className="w-5 h-5" />, color: 'text-primary bg-primary-light' },
          { label: 'Active Now', value: activeGames.length, icon: <Activity className="w-5 h-5" />, color: 'text-success bg-success-light' },
          { label: 'Players (est.)', value: totalGames * 5, icon: <Users className="w-5 h-5" />, color: 'text-maroon bg-maroon-light' },
          { label: 'Games Won', value: games.reduce((s, g) => s + g.winners.length, 0), icon: <Trophy className="w-5 h-5" />, color: 'text-gold-dark bg-gold-light' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div className="stat-value mt-2">{loading ? '…' : s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/admin/quiz" className="card-hover border-2 border-primary/40 bg-gradient-to-br from-primary-light to-gold-light">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-saffron">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-black text-bappa-text text-base">Quiz Manager</div>
              <div className="text-xs text-bappa-muted font-medium mt-0.5">Generate and host dynamic AI Aarti quizzes</div>
            </div>
            <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" />
          </div>
        </Link>
        <Link href="/admin/housie" className="card-hover">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center flex-shrink-0">
              <Gamepad2 className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-bappa-text">Housie / Tambola Games</div>
              <div className="text-sm text-bappa-muted">Manage, create, and call numbers in live games</div>
            </div>
            <ChevronRight className="w-5 h-5 text-bappa-muted flex-shrink-0" />
          </div>
        </Link>
      </div>

      {/* Active Games */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Active Games</h2>
          <Link href="/admin/housie" className="text-sm text-primary font-semibold hover:underline">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="card text-center py-8 text-bappa-muted">Loading games…</div>
        ) : activeGames.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Gamepad2 className="w-7 h-7 text-primary" />
            </div>
            <p className="text-bappa-muted">No active games.</p>
            <Link href="/admin/housie/create" className="btn-primary btn-sm mt-4 inline-flex">
              Create Your First Game
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activeGames.map((game) => (
              <motion.div
                key={game._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Ticket className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-bold text-bappa-text">{game.name}</div>
                  <div className="flex items-center gap-3 text-sm text-bappa-muted mt-0.5">
                    <span className="font-mono font-bold text-primary">{game.roomCode}</span>
                    <span>{game.calledNumbers.length}/90 called</span>
                    <span>{game.winners.length} winners</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge text-xs ${STATUS_COLORS[game.status]}`}>{game.status}</span>
                  <Link href={`/admin/housie/${game._id}`} className="btn-maroon btn-sm">
                    Control Room
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* All Games */}
      {games.length > 0 && (
        <div>
          <h2 className="section-title mb-4">All Games</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bappa-border text-bappa-muted text-left">
                  <th className="pb-3 font-semibold">Game</th>
                  <th className="pb-3 font-semibold">Code</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Called</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game._id} className="border-b border-bappa-border last:border-0">
                    <td className="py-3 font-medium text-bappa-text">{game.name}</td>
                    <td className="py-3 font-mono font-bold text-primary">{game.roomCode}</td>
                    <td className="py-3">
                      <span className={`badge text-xs ${STATUS_COLORS[game.status]}`}>{game.status}</span>
                    </td>
                    <td className="py-3 text-bappa-muted">{game.calledNumbers.length}/90</td>
                    <td className="py-3">
                      <Link href={`/admin/housie/${game._id}`} className="text-primary font-semibold text-xs hover:underline">
                        Control Room →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
