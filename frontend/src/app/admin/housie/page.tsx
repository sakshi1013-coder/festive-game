'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { housieApi } from '@/lib/api';
import { HousieGame, STATUS_COLORS } from '@/types/index';
import { PlusCircle, Users, Zap, Gamepad2, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminHousieList() {
  const [games, setGames] = useState<HousieGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    housieApi.adminGetGames()
      .then((res) => setGames(res.data.games || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-transition space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-bappa-text">Housie Games</h1>
          <p className="text-bappa-muted mt-1">All created games</p>
        </div>
        <Link href="/admin/housie/create" className="btn-primary">
          <PlusCircle className="w-4 h-4" /> Create Game
        </Link>
      </div>

      {loading ? (
        <div className="card text-center py-8 text-bappa-muted">Loading…</div>
      ) : games.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-8 h-8 text-primary" />
          </div>
          <p className="text-bappa-muted">No games created yet.</p>
          <Link href="/admin/housie/create" className="btn-primary btn-sm mt-4 inline-flex">Create First Game</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game, i) => (
            <motion.div
              key={game._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center flex-shrink-0">
                <Ticket className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-bold text-bappa-text">{game.name}</div>
                <div className="flex items-center gap-3 text-sm text-bappa-muted mt-0.5">
                  <span className="font-mono font-bold text-primary tracking-widest">{game.roomCode}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {game.maxPlayers} max</span>
                  <span>{game.calledNumbers.length}/90 called</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${STATUS_COLORS[game.status]}`}>{game.status}</span>
                <Link href={`/admin/housie/${game._id}`} className="btn-maroon btn-sm">
                  <Zap className="w-4 h-4" /> Control Room
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
