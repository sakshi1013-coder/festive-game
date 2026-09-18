'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Trophy,
  Ticket,
  Calendar,
  Shield,
  Gamepad2,
  Mail,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { authApi } from '@/lib/api';

interface PlayerItem {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: 'player' | 'host' | 'admin';
  totalWins: number;
  totalLosses: number;
  totalGamesPlayed: number;
  totalPoints: number;
  createdAt: string;
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'player' | 'host'>('all');

  useEffect(() => {
    authApi
      .getPlayers()
      .then((res) => setPlayers(res.data.players || []))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = players.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.username?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'all'
        ? true
        : roleFilter === 'host'
        ? p.role === 'host' || p.role === 'admin'
        : p.role === 'player';

    return matchesSearch && matchesRole;
  });

  const totalPoints = players.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
  const totalWins = players.reduce((sum, p) => sum + (p.totalWins || 0), 0);
  const totalGames = players.reduce((sum, p) => sum + (p.totalGamesPlayed || 0), 0);

  return (
    <div className="space-y-8 page-transition max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-maroon-light text-maroon rounded-full text-xs font-bold mb-2">
            <Users className="w-3.5 h-3.5" /> Community Directory
          </div>
          <h1 className="text-3xl font-black text-bappa-text">Players Directory</h1>
          <p className="text-bappa-muted mt-1 text-sm">
            Monitor registered players, festival participation, points, and Housie wins.
          </p>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div className="stat-value mt-2">{loading ? '…' : players.length}</div>
          <div className="stat-label">Total Users</div>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-gold-light text-gold-dark flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="stat-value mt-2">{loading ? '…' : totalPoints.toLocaleString()}</div>
          <div className="stat-label">Total Quiz Points</div>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-maroon-light text-maroon flex items-center justify-center">
            <Ticket className="w-5 h-5" />
          </div>
          <div className="stat-value mt-2">{loading ? '…' : totalWins}</div>
          <div className="stat-label">Housie Claims Won</div>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div className="stat-value mt-2">{loading ? '…' : totalGames}</div>
          <div className="stat-label">Total Games Played</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-bappa-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, or email…"
            className="input-field pl-10 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-surface-secondary p-1 rounded-xl border border-bappa-border">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              roleFilter === 'all'
                ? 'bg-primary text-white shadow-saffron'
                : 'text-bappa-muted hover:text-bappa-text'
            }`}
          >
            All ({players.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('player')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              roleFilter === 'player'
                ? 'bg-primary text-white shadow-saffron'
                : 'text-bappa-muted hover:text-bappa-text'
            }`}
          >
            Players ({players.filter((p) => p.role === 'player').length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('host')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              roleFilter === 'host'
                ? 'bg-primary text-white shadow-saffron'
                : 'text-bappa-muted hover:text-bappa-text'
            }`}
          >
            Hosts ({players.filter((p) => p.role === 'host' || p.role === 'admin').length})
          </button>
        </div>
      </div>

      {/* Players Content */}
      {loading ? (
        <div className="card text-center py-16 text-bappa-muted flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span>Loading players directory…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-black text-bappa-text text-lg">No players found</h3>
          <p className="text-sm text-bappa-muted mt-1">Try refining your search query or filter.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden shadow-card-lg border border-bappa-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-secondary/60 border-b border-bappa-border text-xs font-black text-bappa-muted uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Player</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 text-center">Quiz Points</th>
                  <th className="py-3.5 px-4 text-center">Housie Wins</th>
                  <th className="py-3.5 px-4 text-center">Games Played</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bappa-border/40 text-sm font-medium">
                {filtered.map((p, idx) => {
                  const initial = (p.name || p.username || 'P').charAt(0).toUpperCase();
                  const isHostUser = p.role === 'host' || p.role === 'admin';
                  const joinedDate = p.createdAt
                    ? new Date(p.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <motion.tr
                      key={p._id || idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-primary-light/10 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm ${
                              isHostUser
                                ? 'bg-maroon-light text-maroon border border-maroon/20'
                                : 'bg-primary-light text-primary border border-primary/20'
                            }`}
                          >
                            {initial}
                          </div>
                          <div className="overflow-hidden">
                            <div className="font-bold text-bappa-text truncate flex items-center gap-1.5">
                              <span>{p.name}</span>
                              <span className="text-xs text-bappa-muted font-normal font-mono">
                                (@{p.username})
                              </span>
                            </div>
                            <div className="text-xs text-bappa-muted flex items-center gap-1 mt-0.5 truncate">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{p.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`badge text-xs font-bold ${
                            isHostUser ? 'badge-maroon' : 'badge-saffron'
                          }`}
                        >
                          {isHostUser ? 'Host / Admin' : 'Player'}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-primary flex items-center justify-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-gold-dark" />
                          {p.totalPoints || 0}
                        </span>
                      </td>

                      {/* Wins */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-emerald-700 flex items-center justify-center gap-1">
                          <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                          {p.totalWins || 0}
                        </span>
                      </td>

                      {/* Games Played */}
                      <td className="py-3.5 px-4 text-center text-bappa-text font-semibold">
                        {p.totalGamesPlayed || 0}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 sm:px-6 text-right text-xs text-bappa-muted font-mono">
                        {joinedDate}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
