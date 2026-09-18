'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { housieApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { Trophy, Clock, Target } from 'lucide-react';
import { useState } from 'react';
import { leaderboardApi } from '@/lib/api';

export default function MyWinsPage() {
  const { user } = useAuth();
  const [wins, setWins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { PATTERN_LABELS } = require('@/types/index');

  useEffect(() => {
    leaderboardApi.getMe()
      .then((res) => setWins(res.data.wins || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-transition space-y-6">
      <div>
        <h1 className="text-3xl font-black text-bappa-text">My Wins</h1>
        <p className="text-bappa-muted mt-1">All your approved winning claims</p>
      </div>

      {loading ? (
        <div className="card text-center py-8 text-bappa-muted">Loading…</div>
      ) : wins.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-bappa-text mb-2">No wins yet</h2>
          <p className="text-bappa-muted mb-6">Join a Housie game and claim your first win!</p>
          <Link href="/dashboard/housie" className="btn-maroon">Join Housie</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {wins.map((win: any) => (
            <div key={win._id} className="card flex items-center gap-4">
              <div className="w-12 h-12 bg-gold-light rounded-2xl flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-gold-dark" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-bappa-text">{PATTERN_LABELS[win.pattern] || win.pattern}</div>
                <div className="text-sm text-bappa-muted">{win.gameId?.name || 'Housie Game'}</div>
              </div>
              <div className="text-right">
                <div className="badge-gold">+50 pts</div>
                <div className="text-xs text-bappa-muted mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {win.approvedAt ? new Date(win.approvedAt).toLocaleDateString('en-IN') : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
