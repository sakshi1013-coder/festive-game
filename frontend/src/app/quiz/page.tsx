'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ShieldCheck, Flame, ArrowLeft } from 'lucide-react';
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
    <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 space-y-6 sm:space-y-8 page-transition text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-primary-light text-primary flex items-center justify-center shadow-inner border border-primary/20">
        <Flame className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Live Aarti Quiz Room
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-bappa-text">Join Live Quiz</h1>
        <p className="text-xs sm:text-sm text-bappa-muted max-w-md mx-auto">
          Enter the 6-character room code provided by your host to join the multiplayer trivia match.
        </p>
      </div>

      <form onSubmit={handleJoin} className="card shadow-card-lg border-2 border-primary/20 p-5 sm:p-8 space-y-6">
        <div>
          <label className="block text-xs font-black text-bappa-muted uppercase mb-2">
            Room Code
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              setError('');
            }}
            maxLength={6}
            placeholder="e.g. NLFMKY"
            className="w-full text-center text-2xl sm:text-3xl font-black tracking-widest uppercase py-3.5 px-4 rounded-2xl border-2 border-primary/30 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 bg-sand-light/50 font-mono text-primary placeholder:text-bappa-muted/40"
          />
          {error && <p className="text-xs font-bold text-error mt-2">{error}</p>}
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-3.5 sm:py-4 text-sm font-black flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99]"
        >
          <span>Enter Quiz Room</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="pt-2 border-t border-bappa-border flex items-center justify-center gap-2 text-xs text-bappa-muted">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Derived 100% from authentic Marathi Aarti verses</span>
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
