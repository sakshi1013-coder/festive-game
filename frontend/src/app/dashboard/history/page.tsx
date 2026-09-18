'use client';

import { useEffect, useState } from 'react';
import { leaderboardApi, quizApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { BookOpen, Grid3X3, Clock, History } from 'lucide-react';

export default function GameHistoryPage() {
  const { user } = useAuth();
  const [quizGames, setQuizGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      quizApi.getHistory(),
    ]).then(([qRes]) => {
      setQuizGames(qRes.data.games || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-transition space-y-6">
      <div>
        <h1 className="text-3xl font-black text-bappa-text">Game History</h1>
        <p className="text-bappa-muted mt-1">Your recent game activity</p>
      </div>

      {loading ? (
        <div className="card text-center py-8 text-bappa-muted">Loading…</div>
      ) : quizGames.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-primary" />
          </div>
          <p className="text-bappa-muted">No games played yet. Start playing!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizGames.map((game: any) => (
            <div key={game._id} className="card flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-bappa-text">Quiz — {game.category}</div>
                <div className="text-sm text-bappa-muted">
                  {game.answers?.filter((a: any) => a.correct).length}/{game.totalQuestions} correct
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary">{game.score} pts</div>
                <div className="text-xs text-bappa-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(game.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
