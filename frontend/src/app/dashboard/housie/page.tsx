'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Users, Clock, ChevronRight, Loader2, Grid3X3, Ticket, ArrowLeft } from 'lucide-react';
import { housieApi } from '@/lib/api';
import { HousieGame, STATUS_COLORS } from '@/types/index';

export default function JoinHousiePage() {
  const [roomCode, setRoomCode] = useState('');
  const [games, setGames] = useState<HousieGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    housieApi.getAvailable()
      .then((res) => setGames(res.data.games))
      .catch(() => {});
  }, []);

  const handleJoin = async (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c) { setError('Enter a room code'); return; }
    setJoining(true);
    setError('');
    try {
      const res = await housieApi.join(c);
      const gameId = res.data.game._id;
      router.push(`/housie/${gameId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join game');
    } finally {
      setJoining(false);
    }
  };

  const activeGames = games.filter(
    (g) => g.status !== 'completed' && (g.status as string) !== 'ended' && g.status !== 'cancelled'
  );
  const hasLiveTables = activeGames.some((g) => g.status === 'started');

  return (
    <div className="page-transition space-y-8 max-w-5xl mx-auto">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-black text-bappa-muted hover:text-bappa-text transition-colors px-3 py-1.5 rounded-xl bg-white border border-pastel-border/80 shadow-2xs hover:shadow-xs mb-3"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="block">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pastel-blue/60 text-bappa-text font-bold text-xs uppercase tracking-wider mb-2">
            🎟️ Festival Housie Lounge
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-bappa-text tracking-tight">Join Housie Game</h1>
        <p className="text-bappa-muted text-sm sm:text-base mt-1">Enter a 6-digit room code or join an active game table</p>
      </div>

      {/* Join by code */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pastel-border/80 shadow-pastel-sm max-w-lg overflow-hidden">
        <h2 className="font-bold text-bappa-text mb-4 flex items-center gap-2.5 text-lg">
          <div className="w-8 h-8 rounded-xl bg-pastel-blue/70 flex items-center justify-center text-primary font-bold">
            <Search className="w-4 h-4 text-primary" />
          </div>
          Enter Room Code
        </h2>
        <div className="space-y-3">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="BAPPA1"
            maxLength={6}
            className="w-full bg-pastel-surface border-2 border-pastel-border focus:border-primary focus:bg-white rounded-2xl px-4 py-3 text-center text-2xl font-black tracking-[0.25em] uppercase text-bappa-text placeholder:text-bappa-muted/50 transition-all outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleJoin(roomCode)}
          />
          <button
            onClick={() => handleJoin(roomCode)}
            disabled={joining || !roomCode.trim()}
            className="btn-primary w-full text-base py-3.5 px-6 shadow-pastel-sm flex items-center justify-center gap-2 rounded-2xl font-black transition-all"
          >
            {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Game'}
          </button>
        </div>
        {error && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-pastel-pink/40 border border-pastel-pink text-error text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Available games */}
      <div>
        <h2 className="text-xl font-black text-bappa-text mb-4 flex items-center gap-2">
          <span>Active Housie Tables</span>
          {hasLiveTables && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-pastel-mint text-emerald-900 font-bold animate-pulse">
              Live
            </span>
          )}
        </h2>
        {activeGames.length === 0 ? (
          <div className="bg-white/80 rounded-3xl border border-pastel-border/80 text-center py-12 px-4 shadow-pastel-sm">
            <div className="w-16 h-16 bg-pastel-yellow/60 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-pastel-sm">
              <Ticket className="w-8 h-8 text-bappa-text/80" />
            </div>
            <p className="text-bappa-text font-bold text-lg">No active games right now</p>
            <p className="text-bappa-muted text-sm mt-1">Ask the host for their 6-character room code or wait for a round to start.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeGames.map((game) => (
              <motion.div
                key={game._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-5 border border-pastel-border/80 shadow-pastel-sm hover:shadow-pastel hover:-translate-y-1 transition-all cursor-pointer group"
                onClick={() => handleJoin(game.roomCode)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 bg-pastel-blue/60 group-hover:bg-pastel-blue rounded-2xl flex items-center justify-center transition-colors">
                    <Grid3X3 className="w-5 h-5 text-bappa-text" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    game.status === 'started'
                      ? 'bg-pastel-mint text-emerald-900'
                      : 'bg-pastel-blue/70 text-blue-900'
                  }`}>
                    {game.status === 'started' ? 'Live' : 'Lobby'}
                  </span>
                </div>
                <h3 className="font-bold text-bappa-text text-base mb-1">{game.name}</h3>
                <div className="flex items-center gap-3 text-sm text-bappa-muted mt-2">
                  <div className="flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5" />
                    {(game as any).playerCount || 0}/{game.maxPlayers}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-lg bg-pastel-surface border border-pastel-border font-mono font-black tracking-widest text-primary text-xs">
                    {game.roomCode}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-pastel-border/60">
                  <div className="text-xs text-bappa-muted font-medium">
                    {game.activePatterns.length} patterns active
                  </div>
                  <div className="w-7 h-7 rounded-full bg-pastel-surface flex items-center justify-center group-hover:bg-pastel-pink/60 transition-colors">
                    <ChevronRight className="w-4 h-4 text-bappa-text" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
