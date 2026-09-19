'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Square, Zap, RefreshCw, Users, AlertCircle,
  Trophy, CheckCircle, XCircle, Eye, Filter, Wifi, WifiOff, Clock,
  Gamepad2, Ticket
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { housieApi } from '@/lib/api';
import { HousieGame, HousieTicket, WinnerClaim, TicketWithProgress, PATTERN_LABELS, STATUS_COLORS } from '@/types/index';
import type { Socket } from 'socket.io-client';

type Filter = 'all' | 'online' | 'early-five' | 'top-line' | 'middle-line' | 'bottom-line' | 'full-house' | 'claims';

export default function ControlRoom() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user, token } = useAuth();

  // Game state
  const [game, setGame] = useState<HousieGame | null>(null);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [lastNumber, setLastNumber] = useState<number | null>(null);
  const [tickets, setTickets] = useState<TicketWithProgress[]>([]);
  const [claims, setClaims] = useState<WinnerClaim[]>([]);
  const [playerProgress, setPlayerProgress] = useState<Record<string, any>>({});
  const [onlinePlayers, setOnlinePlayers] = useState<Set<string>>(new Set());

  // UI state
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [autoCall, setAutoCall] = useState(false);
  const [autoInterval, setAutoInterval] = useState(10);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketWithProgress | null>(null);
  const [newNumberAnim, setNewNumberAnim] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pendingClaims, setPendingClaims] = useState<WinnerClaim[]>([]);

  const socketRef = useRef<Socket | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!gameId) return;
    try {
      const [gameRes, ticketsRes, claimsRes] = await Promise.all([
        housieApi.getGame(gameId),
        housieApi.adminGetTickets(gameId),
        housieApi.adminGetClaims(gameId),
      ]);
      const g = gameRes.data.game;
      setGame(g);
      setCalledNumbers(g.calledNumbers || []);
      if (g.calledNumbers?.length) setLastNumber(g.calledNumbers[g.calledNumbers.length - 1]);
      setTickets(ticketsRes.data.tickets || []);
      const allClaims = claimsRes.data.claims || [];
      setClaims(allClaims);
      setPendingClaims(allClaims.filter((c: WinnerClaim) => c.status === 'pending'));
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Socket
  useEffect(() => {
    if (!token || !gameId || !user) return;
    const socket = getSocket(token);
    socketRef.current = socket;

    const joinRoom = () => {
      socket.emit('join-game', { gameId });
    };

    if (socket.connected) {
      setConnected(true);
      joinRoom();
    }

    socket.on('connect', () => {
      setConnected(true);
      joinRoom();
      loadData();
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('game-state', (data: any) => {
      if (data.game) {
        setGame(data.game);
        setCalledNumbers(data.game.calledNumbers || []);
        if (data.game.calledNumbers?.length) {
          setLastNumber(data.game.calledNumbers[data.game.calledNumbers.length - 1]);
        }
      }
      if (data.tickets) {
        setTickets(data.tickets);
      }
      if (data.onlinePlayers) {
        setOnlinePlayers(new Set(data.onlinePlayers));
      }
    });

    socket.on('number-called', (data: any) => {
      setCalledNumbers(data.calledNumbers);
      setLastNumber(data.number);
      setNewNumberAnim(true);
      setTimeout(() => setNewNumberAnim(false), 600);

      // Update per-player progress from server data
      if (data.playerProgress) {
        const prog: Record<string, any> = {};
        data.playerProgress.forEach((p: any) => {
          prog[p.playerId] = p.progress;
        });
        setPlayerProgress(prog);
      }
    });

    socket.on('auto-call-toggled', (data: any) => {
      setAutoCall(Boolean(data.enabled));
    });

    socket.on('winner-claim-pending', (data: any) => {
      setPendingClaims((prev) => [data.claim, ...prev]);
      setClaims((prev) => [data.claim, ...prev]);
    });

    socket.on('winner-approved', (data: any) => {
      setPendingClaims((prev) => prev.filter((c) => c._id !== data.claimId));
      setClaims((prev) => prev.map((c) => c._id === data.claimId ? { ...c, status: 'approved' } : c));
    });

    socket.on('winner-rejected', (data: any) => {
      setPendingClaims((prev) => prev.filter((c) => c._id !== data.claimId));
      setClaims((prev) => prev.map((c) => c._id === data.claimId ? { ...c, status: 'rejected' } : c));
    });

    socket.on('player-joined', (data: any) => {
      setOnlinePlayers((prev) => new Set([...prev, data.userId]));
      loadData();
    });

    socket.on('player-left', (data: any) => {
      setOnlinePlayers((prev) => { const s = new Set(prev); s.delete(data.userId); return s; });
    });

    socket.on('player-ticket-updated', (data: any) => {
      setTickets((prev) =>
        prev.map((t) =>
          t._id === data.ticketId
            ? { ...t, markedNumbers: data.markedNumbers }
            : t
        )
      );
    });

    socket.on('game-started', (data: any) => setGame(data.game));
    socket.on('game-paused', () => setGame((g) => g ? { ...g, status: 'paused' } : g));
    socket.on('game-resumed', () => setGame((g) => g ? { ...g, status: 'started' } : g));
    socket.on('game-ended', (data: any) => setGame(data.game));

    return () => {
      socket.off('game-state');
      socket.off('number-called');
      socket.off('auto-call-toggled');
      socket.off('winner-claim-pending');
      socket.off('winner-approved');
      socket.off('winner-rejected');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('player-ticket-updated');
      socket.off('game-started');
      socket.off('game-paused');
      socket.off('game-resumed');
      socket.off('game-ended');
    };
  }, [token, gameId, user, loadData]);

  // Periodic background sync in case of network blip
  useEffect(() => {
    if (!gameId) return;
    const interval = setInterval(() => {
      housieApi.getGame(gameId).then((res) => {
        const g = res.data.game;
        if (g && g.calledNumbers && g.calledNumbers.length !== calledNumbers.length) {
          setGame(g);
          setCalledNumbers(g.calledNumbers || []);
          if (g.calledNumbers.length) {
            setLastNumber(g.calledNumbers[g.calledNumbers.length - 1]);
          }
        }
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [gameId, calledNumbers.length]);

  const callNumber = useCallback(async () => {
    if (calling) return;
    setCalling(true);
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call-number', { gameId });
      } else {
        const res = await housieApi.adminCallNumber(gameId);
        if (res.data?.game) {
          const g = res.data.game;
          setGame(g);
          setCalledNumbers(g.calledNumbers || []);
          if (g.calledNumbers?.length) {
            setLastNumber(g.calledNumbers[g.calledNumbers.length - 1]);
          }
        }
      }
    } catch (err) {
      console.error('Call number error:', err);
    } finally {
      setTimeout(() => setCalling(false), 800);
    }
  }, [gameId, calling]);

  const startGame = () => socketRef.current?.emit('start-game', { gameId });
  const pauseGame = () => socketRef.current?.emit('pause-game', { gameId });
  const resumeGame = () => socketRef.current?.emit('resume-game', { gameId });

  const endGame = () => {
    if (!confirm('Are you sure you want to end this game? This cannot be undone.')) return;
    socketRef.current?.emit('end-game', { gameId });
  };

  const toggleAutoCall = () => {
    const next = !autoCall;
    setAutoCall(next);
    socketRef.current?.emit('toggle-auto-call', { gameId, enabled: next, interval: autoInterval });
  };

  const approveClaim = (claimId: string) => {
    socketRef.current?.emit('approve-claim', { claimId });
  };

  const rejectClaim = (claimId: string) => {
    socketRef.current?.emit('reject-claim', { claimId });
  };

  const calledSet = new Set(calledNumbers);
  const remainingCount = 90 - calledNumbers.length;

  const filteredTickets = tickets.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'online') return onlinePlayers.has(typeof t.playerId === 'string' ? t.playerId : (t.playerId as any)._id);
    if (filter === 'claims') return t.claims?.some((c) => c.status === 'pending');
    const prog = playerProgress[typeof t.playerId === 'string' ? t.playerId : (t.playerId as any)._id] || t.progress;
    return prog?.completedPatterns?.includes(filter);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-pastel-lavender/60 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-pastel-sm">
            <Gamepad2 className="w-8 h-8 text-primary" />
          </div>
          <p className="text-bappa-text font-bold text-lg">Loading Control Room…</p>
          <p className="text-bappa-muted text-xs mt-1">Connecting to live game table</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-pastel-border/80 shadow-pastel-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-bappa-text tracking-tight">{game?.name}</h1>
              <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-pastel-mint text-bappa-text">
                {game?.status}
              </span>
              <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full ${connected ? 'bg-pastel-mint/80 text-emerald-800' : 'bg-pastel-pink/80 text-rose-800'}`}>
                {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {connected ? 'Live Sync' : 'Reconnecting'}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-bappa-muted">
              <span>Room Code: <strong className="font-mono text-primary text-base font-black tracking-widest px-2 py-0.5 rounded-lg bg-pastel-blue/40">{game?.roomCode}</strong></span>
              <span className="flex items-center gap-1 font-semibold"><Users className="w-4 h-4 text-primary" /> {tickets.length} players</span>
              <span className="font-semibold text-bappa-text">{calledNumbers.length}/90 called</span>
              {pendingClaims.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-pastel-yellow text-amber-900 font-bold text-xs animate-pulse">
                  ⚡ {pendingClaims.length} claims pending
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {game?.status === 'open' && (
              <button onClick={startGame} className="btn-primary shadow-pastel-sm gap-2">
                <Play className="w-4 h-4" /> Start Round
              </button>
            )}
            {game?.status === 'started' && (
              <button onClick={pauseGame} className="btn-outline gap-2">
                <Pause className="w-4 h-4" /> Pause
              </button>
            )}
            {game?.status === 'paused' && (
              <button onClick={resumeGame} className="btn-primary shadow-pastel-sm gap-2">
                <Play className="w-4 h-4" /> Resume
              </button>
            )}
            {['started', 'paused', 'open'].includes(game?.status || '') && (
              <button onClick={endGame} className="px-4 py-2.5 rounded-2xl text-xs font-bold text-rose-600 bg-pastel-pink/30 hover:bg-pastel-pink/70 border border-pastel-pink transition-all flex items-center gap-1.5">
                <Square className="w-3.5 h-3.5" /> End Round
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Pending Claims Alert ─────────────────────────────────── */}
      <AnimatePresence>
        {pendingClaims.map((claim) => (
          <motion.div
            key={claim._id}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-pastel-yellow/70 border-2 border-pastel-yellow rounded-3xl p-5 shadow-pastel-sm"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-amber-800 shadow-pastel-sm flex-shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-black text-bappa-text text-base">
                    {(claim as any).playerName || 'A player'} claims <span className="underline decoration-amber-400 font-extrabold">{PATTERN_LABELS[claim.pattern]}</span>!
                  </div>
                  <div className="text-xs text-bappa-muted font-bold flex items-center gap-1.5 mt-0.5">
                    Validation: {claim.serverValidationResult ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Legitimate Claim (Numbers Match)</span>
                    ) : (
                      <span className="text-rose-700 font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Numbers Missing</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approveClaim(claim._id)} className="btn-mint btn-sm gap-1.5 font-bold shadow-pastel-sm">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => rejectClaim(claim._id)} className="btn-pink btn-sm gap-1.5 font-bold shadow-pastel-sm">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ─── Number Caller ─────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Current number */}
          <div className="bg-white rounded-3xl p-6 border border-pastel-border/80 shadow-pastel-sm text-center">
            <div className="text-xs text-bappa-muted font-bold uppercase tracking-wider mb-4">Latest Called Ball</div>
            {lastNumber ? (
              <motion.div
                key={lastNumber}
                animate={newNumberAnim ? { scale: [0.5, 1.15, 1] } : {}}
                transition={{ duration: 0.5 }}
                className="w-28 h-28 rounded-3xl bg-gradient-to-br from-pastel-pink via-pastel-lavender to-pastel-blue text-bappa-text text-5xl font-black flex items-center justify-center mx-auto shadow-pastel mb-3 border-4 border-white"
              >
                {lastNumber}
              </motion.div>
            ) : (
              <div className="w-28 h-28 rounded-3xl bg-pastel-surface border border-pastel-border text-bappa-muted text-3xl font-bold flex items-center justify-center mx-auto mb-3">
                –
              </div>
            )}

            {calledNumbers.length >= 2 && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-xs text-bappa-muted font-semibold">Previous:</span>
                {[...calledNumbers].reverse().slice(1, 4).map((n) => (
                  <span key={n} className="w-8 h-8 rounded-xl bg-pastel-blue/60 text-bappa-text font-bold text-sm flex items-center justify-center shadow-xs">
                    {n}
                  </span>
                ))}
              </div>
            )}

            <div className="text-xs text-bappa-muted font-semibold mb-4">
              {remainingCount} numbers remaining in pouch
            </div>

            {/* Call button */}
            <button
              onClick={callNumber}
              disabled={calling || autoCall || !['started', 'open'].includes(game?.status || '') || calledNumbers.length >= 90}
              className="btn-primary w-full mb-3 text-base py-3 shadow-pastel-sm font-black disabled:opacity-50"
            >
              {calling ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Calling…</>
              ) : (
                <><Zap className="w-4 h-4" /> Pick Next Number</>
              )}
            </button>

            {/* Auto call */}
            <div className="flex items-center justify-between p-3.5 bg-pastel-surface rounded-2xl border border-pastel-border/60">
              <div>
                <div className="text-xs font-bold text-bappa-text flex items-center gap-1.5">
                  <span>Auto Caller</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${autoCall ? 'bg-pastel-mint text-emerald-900' : 'bg-slate-200 text-slate-600'}`}>
                    {autoCall ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="text-[11px] text-bappa-muted font-medium mt-0.5">Picks ball every {autoInterval} seconds</div>
              </div>
              <button
                onClick={toggleAutoCall}
                type="button"
                className={`relative w-14 h-7 rounded-full p-1 transition-all duration-200 cursor-pointer ${
                  autoCall
                    ? 'bg-emerald-500 shadow-pastel-sm'
                    : 'bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label="Toggle Auto Call"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    autoCall ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {autoCall && (
              <div className="flex items-center gap-2 mt-3 justify-center">
                <label className="text-xs text-bappa-muted font-semibold">Interval (s):</label>
                <input
                  type="number"
                  value={autoInterval}
                  onChange={(e) => setAutoInterval(parseInt(e.target.value))}
                  min={3} max={60}
                  className="bg-pastel-surface border border-pastel-border rounded-xl py-1 px-2 text-xs font-bold text-center w-16 outline-none"
                  onBlur={() => {
                    if (autoCall) {
                      socketRef.current?.emit('toggle-auto-call', { gameId, enabled: true, interval: autoInterval });
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Number Board */}
          <div className="bg-white rounded-3xl p-5 border border-pastel-border/80 shadow-pastel-sm">
            <div className="font-bold text-bappa-text mb-3 text-sm flex items-center justify-between">
              <span>Number Board (1–90)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-pastel-mint text-bappa-text font-bold">
                {calledNumbers.length} / 90
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
              {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => {
                const isCalled = calledSet.has(n);
                const isCurrent = n === lastNumber;
                return (
                  <div
                    key={n}
                    className={`aspect-square rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-pastel-yellow text-bappa-text font-black scale-110 shadow-pastel-sm ring-2 ring-pastel-peach z-10'
                        : isCalled
                        ? 'bg-pastel-mint text-bappa-text font-black border border-pastel-mint/80'
                        : 'bg-pastel-surface/60 border border-pastel-border/60 text-bappa-muted/70'
                    }`}
                  >
                    {n}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Approved Winners */}
          {claims.filter((c) => c.status === 'approved').length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-pastel-border/80 shadow-pastel-sm">
              <div className="font-bold text-bappa-text mb-3 text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-700" /> Confirmed Winners
              </div>
              <div className="space-y-2">
                {claims.filter((c) => c.status === 'approved').map((c) => (
                  <div key={c._id} className="flex items-center justify-between p-2.5 rounded-2xl bg-pastel-yellow/30 border border-pastel-yellow">
                    <span className="text-xs font-black text-amber-900">{PATTERN_LABELS[c.pattern]}</span>
                    <span className="text-xs text-bappa-text font-bold">{(c as any).playerName || 'Player'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Player Tickets ────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-bappa-text text-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Live Tickets ({filteredTickets.length})
            </h2>
            <button onClick={loadData} className="px-3 py-1.5 rounded-xl bg-pastel-surface border border-pastel-border text-xs font-bold text-bappa-text hover:bg-pastel-blue/40 transition-colors flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Sync
            </button>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All Players' },
              { key: 'online', label: 'Online' },
              { key: 'claims', label: 'Pending Claims' },
              { key: 'early-five', label: 'Early 5' },
              { key: 'top-line', label: 'Top Line' },
              { key: 'middle-line', label: 'Middle Line' },
              { key: 'bottom-line', label: 'Bottom Line' },
              { key: 'full-house', label: 'Full House' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as Filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  filter === f.key
                    ? 'bg-pastel-blue text-bappa-text border-pastel-blue shadow-xs'
                    : 'bg-white border-pastel-border text-bappa-muted hover:border-pastel-blue hover:text-bappa-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tickets grid */}
          {filteredTickets.length === 0 ? (
            <div className="bg-white rounded-3xl border border-pastel-border/80 text-center py-12 px-4 shadow-pastel-sm">
              <div className="w-14 h-14 bg-pastel-blue/50 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-pastel-sm">
                <Ticket className="w-7 h-7 text-primary" />
              </div>
              <p className="text-bappa-text font-bold">
                {tickets.length === 0 ? 'No players have joined this round yet.' : 'No players match this filter.'}
              </p>
            </div>
          ) : (
            <div className="grid xl:grid-cols-2 gap-4">
              {filteredTickets.map((t) => {
                const playerId = typeof t.playerId === 'string' ? t.playerId : (t.playerId as any)._id;
                const isOnline = onlinePlayers.has(playerId);
                const progress = playerProgress[playerId] || t.progress;
                const markedCount = progress?.markedCount ?? 0;
                const progressPct = progress?.progressPercent ?? 0;
                const completedPats = progress?.completedPatterns || [];
                const hasPendingClaim = t.claims?.some((c) => c.status === 'pending');

                return (
                  <div
                    key={t._id}
                    className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-pastel-sm transition-all duration-200 cursor-pointer ${
                      hasPendingClaim
                        ? 'border-pastel-yellow bg-pastel-yellow/20 ring-2 ring-pastel-yellow'
                        : 'border-pastel-border/80 hover:shadow-pastel hover:-translate-y-0.5'
                    }`}
                    onClick={() => setSelectedTicket(selectedTicket?._id === t._id ? null : t)}
                  >
                    {/* Player header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-xl bg-pastel-lavender/70 text-bappa-text font-black text-xs flex items-center justify-center">
                            {t.playerName?.charAt(0).toUpperCase()}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-bappa-muted/50'}`} />
                        </div>
                        <div>
                          <div className="font-bold text-bappa-text text-sm">{t.playerName}</div>
                          <div className="text-[11px] text-bappa-muted">@{t.username}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-bappa-text">{markedCount}/15 marked</div>
                        <div className="text-[11px] font-bold text-primary">{progressPct}%</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-pastel-surface rounded-full mb-3 overflow-hidden border border-pastel-border/60">
                      <div
                        className="h-full bg-gradient-to-r from-pastel-blue to-pastel-mint rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Mini ticket */}
                    <div className="grid grid-cols-9 gap-1 mb-3 bg-pastel-surface/40 p-1.5 rounded-2xl border border-pastel-border/60">
                      {t.ticketGrid.map((row, ri) =>
                        row.map((cell, ci) => {
                          if (cell === null) return <div key={`${ri}-${ci}`} className="aspect-square bg-white/40 rounded-lg" />;
                          const isMarkedByPlayer = (t.markedNumbers || []).includes(cell);
                          const isCalled = calledSet.has(cell);
                          return (
                            <div
                              key={`${ri}-${ci}`}
                              className={`aspect-square rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all relative ${
                                isMarkedByPlayer
                                  ? 'bg-pastel-blue text-bappa-text font-black shadow-xs'
                                  : isCalled
                                  ? 'bg-pastel-mint/80 text-bappa-text border border-pastel-mint'
                                  : 'bg-white border border-pastel-border text-bappa-text'
                              }`}
                              title={
                                isMarkedByPlayer
                                  ? `${cell} - Marked by player`
                                  : isCalled
                                  ? `${cell} - Called`
                                  : `${cell} - Not called`
                              }
                            >
                              {cell}
                              {isMarkedByPlayer && (
                                <span className="absolute top-0.5 right-0.5 text-[7px] font-black text-primary">✓</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Patterns */}
                    <div className="flex flex-wrap gap-1.5">
                      {completedPats.map((p: string) => (
                        <span key={p} className="px-2 py-0.5 rounded-full bg-pastel-mint text-bappa-text font-bold text-[10px]">
                          {PATTERN_LABELS[p] || p}
                        </span>
                      ))}
                      {hasPendingClaim && (
                        <span className="px-2 py-0.5 rounded-full bg-pastel-yellow text-amber-900 font-black text-[10px]">
                          Claim Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Claim history */}
          {claims.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-pastel-border/80 shadow-pastel-sm">
              <h3 className="font-bold text-bappa-text mb-3 text-sm">Round Claims Log</h3>
              <div className="space-y-2">
                {claims.map((c) => (
                  <div key={c._id} className="flex items-center justify-between py-2 border-b border-pastel-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        c.status === 'approved' ? 'bg-emerald-500' :
                        c.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-400'
                      }`} />
                      <div>
                        <span className="text-xs font-bold text-bappa-text">{(c as any).playerName || 'Player'}</span>
                        <span className="text-xs text-bappa-muted ml-2">{PATTERN_LABELS[c.pattern]}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.status === 'approved' ? 'bg-pastel-mint text-emerald-900' :
                        c.status === 'rejected' ? 'bg-pastel-pink text-rose-900' : 'bg-pastel-yellow text-amber-900'
                      }`}>{c.status}</span>
                      {c.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => approveClaim(c._id)} className="btn-mint btn-sm py-1 px-2 text-xs">
                            <CheckCircle className="w-3 h-3" />
                          </button>
                          <button onClick={() => rejectClaim(c._id)} className="btn-pink btn-sm py-1 px-2 text-xs">
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
