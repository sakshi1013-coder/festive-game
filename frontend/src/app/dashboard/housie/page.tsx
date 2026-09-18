'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Users, Clock, ChevronRight, Loader2, Grid3X3, Ticket } from 'lucide-react';
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

  return (
    <div className="page-transition space-y-8">
      <div>
        <h1 className="text-3xl font-black text-bappa-text">Join Housie</h1>
        <p className="text-bappa-muted mt-1">Enter a room code or join an available game</p>
      </div>

      {/* Join by code */}
      <div className="card max-w-lg">
        <h2 className="font-bold text-bappa-text mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Enter Room Code
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="BAPPA1"
            maxLength={6}
            className="input-field flex-1 text-center text-xl font-bold tracking-[0.3em] uppercase"
            onKeyDown={(e) => e.key === 'Enter' && handleJoin(roomCode)}
          />
          <button
            onClick={() => handleJoin(roomCode)}
            disabled={joining}
            className="btn-primary flex-shrink-0"
          >
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
          </button>
        </div>
        {error && (
          <div className="mt-3 text-error text-sm font-medium">{error}</div>
        )}
      </div>

      {/* Available games */}
      <div>
        <h2 className="section-title mb-4">Available Games</h2>
        {games.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-14 h-14 bg-maroon-light rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Ticket className="w-7 h-7 text-maroon" />
            </div>
            <p className="text-bappa-muted">No games available right now.</p>
            <p className="text-bappa-muted text-sm mt-1">Wait for the Host to create a game.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <motion.div
                key={game._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-hover"
                onClick={() => handleJoin(game.roomCode)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-maroon-light rounded-xl flex items-center justify-center">
                    <Grid3X3 className="w-5 h-5 text-maroon" />
                  </div>
                  <span className={`badge text-xs ${STATUS_COLORS[game.status]}`}>
                    {game.status}
                  </span>
                </div>
                <h3 className="font-bold text-bappa-text mb-1">{game.name}</h3>
                <div className="flex items-center gap-4 text-sm text-bappa-muted mt-2">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {(game as any).playerCount || 0}/{game.maxPlayers}
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold tracking-widest text-primary text-sm">
                    {game.roomCode}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-bappa-muted">
                    {game.activePatterns.length} patterns active
                  </div>
                  <ChevronRight className="w-4 h-4 text-bappa-muted" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
