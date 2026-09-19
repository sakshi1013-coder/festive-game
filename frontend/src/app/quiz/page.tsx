'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ShieldCheck, ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function JoinQuizLandingPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomCode.trim().toUpperCase();
    if (!clean) {
      setError('Please enter a valid 6-character room code.');
      return;
    }
    router.push(`/quiz/${clean}`);
  };

  return (
    <div className="max-w-md mx-auto py-10 sm:py-16 px-4 space-y-6 page-transition text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-pastel-lavender text-primary flex items-center justify-center shadow-xs border border-pastel-lavender-dark">
        <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
      </div>

      <div className="space-y-2">
        <span className="badge-lavender text-xs uppercase tracking-wider font-black">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Live Aarti Quiz Room
        </span>
        <h1 className="text-3xl font-black text-bappa-text">Join Live Quiz</h1>
        <p className="text-xs sm:text-sm text-bappa-secondary max-w-sm mx-auto">
          Enter the 6-character room code provided by your host to jump into the synchronized multiplayer quiz.
        </p>
      </div>

      <form onSubmit={handleJoin} className="card shadow-card-lg border border-bappa-border p-6 sm:p-8 space-y-6 rounded-4xl bg-surface">
        <div>
          <label className="block text-xs font-black text-bappa-muted uppercase tracking-wider mb-2.5">
            Enter 6-Character Room Code
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              setError('');
            }}
            maxLength={6}
            placeholder="e.g. K9AYNY"
            className="w-full text-center text-3xl font-black tracking-widest uppercase py-3.5 px-4 rounded-2xl border-2 border-pastel-blue focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 bg-pastel-blue/25 font-mono text-[#204068] placeholder:text-bappa-muted/40 transition-all"
          />
          {error && <p className="text-xs font-bold text-error mt-2">{error}</p>}
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-4 text-base font-black shadow-pastel flex items-center justify-center gap-2"
        >
          <span>Enter Quiz Arena</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="pt-2 border-t border-bappa-border flex items-center justify-center gap-2 text-xs text-bappa-muted">
          <ShieldCheck className="w-4 h-4 text-success flex-shrink-0" />
          <span>Real-time multiplayer scoring & leaderboard</span>
        </div>
      </form>

      <div className="pt-2">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
