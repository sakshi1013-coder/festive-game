'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Copy, Check, Sparkles, ArrowLeft } from 'lucide-react';
import { housieApi } from '@/lib/api';
import { PATTERN_LABELS } from '@/types/index';

const ALL_PATTERNS = ['early-five', 'top-line', 'middle-line', 'bottom-line', 'four-corners', 'full-house'];

export default function CreateHousiePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    description: '',
    maxPlayers: 20,
    autoCallInterval: 10,
    activePatterns: ['early-five', 'top-line', 'middle-line', 'bottom-line', 'full-house'],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const togglePattern = (p: string) => {
    setForm((f) => ({
      ...f,
      activePatterns: f.activePatterns.includes(p)
        ? f.activePatterns.filter((x) => x !== p)
        : [...f.activePatterns, p],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Game name is required'); return; }
    if (form.activePatterns.length === 0) { setError('Select at least one winning pattern'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await housieApi.create(form);
      setCreated(res.data.game);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(created.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (created) {
    return (
      <div className="max-w-lg mx-auto page-transition">
        <div className="card text-center shadow-card-lg">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-black text-bappa-text mb-2">Game Created!</h2>
          <p className="text-bappa-muted mb-6">Share this room code with your players.</p>

          <div className="bg-primary-light border-2 border-primary/20 rounded-2xl p-6 mb-6">
            <div className="text-xs text-primary font-semibold uppercase tracking-wider mb-2">Room Code</div>
            <div className="text-5xl font-black text-primary tracking-[0.2em] mb-4">{created.roomCode}</div>
            <button onClick={copyCode} className="btn-outline btn-sm">
              {copied ? <><Check className="w-4 h-4 text-success" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Code</>}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-left">
            <div className="bg-surface-secondary rounded-xl p-4">
              <div className="text-xs text-bappa-muted">Game Name</div>
              <div className="font-bold text-bappa-text">{created.name}</div>
            </div>
            <div className="bg-surface-secondary rounded-xl p-4">
              <div className="text-xs text-bappa-muted">Max Players</div>
              <div className="font-bold text-bappa-text">{created.maxPlayers}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setCreated(null)} className="btn-outline flex-1">
              Create Another
            </button>
            <a href={`/admin/housie/${created._id}`} className="btn-maroon flex-1">
              Open Control Room
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto page-transition space-y-6">
      <div>
        <Link
          href="/admin/housie"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-bappa-muted hover:text-primary mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Housie Games
        </Link>
        <h1 className="text-3xl font-black text-bappa-text">Create Housie Game</h1>
        <p className="text-bappa-muted mt-1">Set up a new live Tambola game for your players</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="label">Game Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="input-field"
            placeholder="Ganesh Chaturthi Housie 2024"
            required
          />
        </div>

        <div>
          <label className="label">Description (optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className="input-field resize-none"
            rows={2}
            placeholder="A fun Tambola game to celebrate Bappa!"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Max Players</label>
            <input
              type="number"
              value={form.maxPlayers}
              onChange={(e) => update('maxPlayers', parseInt(e.target.value))}
              className="input-field"
              min={2}
              max={100}
            />
          </div>
          <div>
            <label className="label">Auto-Call Interval (seconds)</label>
            <input
              type="number"
              value={form.autoCallInterval}
              onChange={(e) => update('autoCallInterval', parseInt(e.target.value))}
              className="input-field"
              min={3}
              max={60}
            />
          </div>
        </div>

        <div>
          <label className="label mb-3">Active Winning Patterns *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_PATTERNS.map((p) => {
              const active = form.activePatterns.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePattern(p)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    active
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-bappa-border bg-surface text-bappa-muted hover:border-bappa-text'
                  }`}
                >
                  {PATTERN_LABELS[p]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-surface-secondary rounded-xl p-4 text-sm text-bappa-muted">
          <strong className="text-bappa-text">Free Play Mode</strong> — No real money involved.
          This is a fun festival game for entertainment only.
        </div>

        {error && (
          <div className="bg-error-light border border-error/20 text-error rounded-xl px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Game & Get Room Code'}
        </button>
      </form>
    </div>
  );
}
