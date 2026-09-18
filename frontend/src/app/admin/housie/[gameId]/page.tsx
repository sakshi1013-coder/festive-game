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
          <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Gamepad2 className="w-7 h-7 text-primary" />
          </div>
          <p className="text-bappa-muted font-medium">Loading Control Room…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition space-y-6">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-bappa-text">{game?.name}</h1>
              <span className={`badge ${STATUS_COLORS[game?.status || 'open']}`}>{game?.status}</span>
              <div className={`flex items-center gap-1 text-xs font-medium ${connected ? 'text-success' : 'text-error'}`}>
                {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {connected ? 'Live' : 'Offline'}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-bappa-muted">
              <span>Code: <strong className="font-mono text-primary text-base tracking-widest">{game?.roomCode}</strong></span>
              <span><Users className="w-3.5 h-3.5 inline" /> {tickets.length} players</span>
              <span>{calledNumbers.length}/90 called</span>
              {pendingClaims.length > 0 && (
                <span className="badge-error">{pendingClaims.length} pending claims</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {game?.status === 'open' && (
              <button onClick={startGame} className="btn-primary">
                <Play className="w-4 h-4" /> Start Game
              </button>
            )}
            {game?.status === 'started' && (
              <button onClick={pauseGame} className="btn-outline">
                <Pause className="w-4 h-4" /> Pause
              </button>
            )}
            {game?.status === 'paused' && (
              <button onClick={resumeGame} className="btn-primary">
                <Play className="w-4 h-4" /> Resume
              </button>
            )}
            {['started', 'paused', 'open'].includes(game?.status || '') && (
              <button onClick={endGame} className="btn-outline text-error border-error hover:bg-error hover:text-white">
                <Square className="w-4 h-4" /> End Game
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
            className="card border-2 border-gold bg-gold-light"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-gold-dark flex-shrink-0" />
                <div>
                  <div className="font-bold text-bappa-text">
                    {(claim as any).playerName || 'A player'} claims <span className="text-gold-dark">{PATTERN_LABELS[claim.pattern]}</span>!
                  </div>
                  <div className="text-xs text-bappa-muted font-medium flex items-center gap-1.5 mt-0.5">
                    Server validation: {claim.serverValidationResult ? (
                      <span className="text-success font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Valid</span>
                    ) : (
                      <span className="text-error font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Invalid</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approveClaim(claim._id)} className="btn-primary btn-sm gap-1">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => rejectClaim(claim._id)} className="btn-outline btn-sm gap-1 text-error border-error">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ─── Number Caller ─────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Current number */}
          <div className="card text-center">
            <div className="text-xs text-bappa-muted font-semibold uppercase tracking-wider mb-4">Current Number</div>
            {lastNumber ? (
              <motion.div
                key={lastNumber}
                animate={newNumberAnim ? { scale: [0.5, 1.15, 1] } : {}}
                transition={{ duration: 0.5 }}
                className="w-28 h-28 rounded-full bg-maroon text-white text-5xl font-black flex items-center justify-center mx-auto shadow-lg mb-3"
              >
                {lastNumber}
              </motion.div>
            ) : (
              <div className="w-28 h-28 rounded-full bg-bappa-border text-bappa-muted text-3xl font-bold flex items-center justify-center mx-auto mb-3">
                –
              </div>
            )}

            {calledNumbers.length >= 2 && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-xs text-bappa-muted">Previous:</span>
                {[...calledNumbers].reverse().slice(1, 4).map((n) => (
                  <span key={n} className="w-8 h-8 rounded-lg bg-primary-light text-primary font-bold text-sm flex items-center justify-center">
                    {n}
                  </span>
                ))}
              </div>
            )}

            <div className="text-sm text-bappa-muted mb-4">
              {remainingCount} numbers remaining
            </div>

            {/* Call button */}
            <button
              onClick={callNumber}
              disabled={calling || autoCall || !['started', 'open'].includes(game?.status || '') || calledNumbers.length >= 90}
              className="btn-maroon w-full mb-3 disabled:opacity-50"
            >
              {calling ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Calling…</>
              ) : (
                <><Zap className="w-4 h-4" /> Call Next Number</>
              )}
            </button>

            {/* Auto call */}
            <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-xl">
              <div>
                <div className="text-sm font-semibold text-bappa-text">Auto Call</div>
                <div className="text-xs text-bappa-muted">Every {autoInterval}s</div>
              </div>
              <button
                onClick={toggleAutoCall}
                className={`relative w-12 h-6 rounded-full transition-colors ${autoCall ? 'bg-primary' : 'bg-bappa-border'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoCall ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            {autoCall && (
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-bappa-muted">Interval (s):</label>
                <input
                  type="number"
                  value={autoInterval}
                  onChange={(e) => setAutoInterval(parseInt(e.target.value))}
                  min={3} max={60}
                  className="input-field py-1 px-2 text-sm w-16"
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
          <div className="card">
            <div className="font-bold text-bappa-text mb-3 text-sm">Number Board</div>
            <div className="number-board">
              {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => {
                const isCalled = calledSet.has(n);
                const isCurrent = n === lastNumber;
                return (
                  <div
                    key={n}
                    className={`number-ball text-xs ${
                      isCurrent ? 'number-ball-current' :
                      isCalled ? 'number-ball-called' :
                      'number-ball-uncalled'
                    }`}
                    title={isCalled ? `${n} - Called` : `${n} - Available`}
                  >
                    {n}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Approved Winners */}
          {claims.filter((c) => c.status === 'approved').length > 0 && (
            <div className="card">
              <div className="font-bold text-bappa-text mb-3 text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gold-dark" /> Winners
              </div>
              <div className="space-y-2">
                {claims.filter((c) => c.status === 'approved').map((c) => (
                  <div key={c._id} className="flex items-center gap-2 text-sm">
                    <span className="badge-gold text-xs">{PATTERN_LABELS[c.pattern]}</span>
                    <span className="text-bappa-muted text-xs">{(c as any).playerName || 'Player'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Player Tickets ────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-bappa-text flex items-center gap-2">
              <Users className="w-5 h-5 text-maroon" />
              Player Tickets ({filteredTickets.length})
            </h2>
            <button onClick={loadData} className="btn-ghost btn-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All' },
              { key: 'online', label: 'Online' },
              { key: 'claims', label: 'Claims' },
              { key: 'early-five', label: 'E5' },
              { key: 'top-line', label: 'Top' },
              { key: 'middle-line', label: 'Mid' },
              { key: 'bottom-line', label: 'Bot' },
              { key: 'full-house', label: 'FH' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as Filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filter === f.key
                    ? 'bg-maroon text-white border-maroon'
                    : 'bg-surface border-bappa-border text-bappa-muted hover:border-maroon hover:text-maroon'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tickets grid */}
          {filteredTickets.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Ticket className="w-7 h-7 text-primary" />
              </div>
              <p className="text-bappa-muted">
                {tickets.length === 0 ? 'No players have joined yet.' : 'No players match this filter.'}
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
                    className={`card cursor-pointer hover:shadow-card-hover transition-all duration-200 ${hasPendingClaim ? 'border-gold bg-gold-light/30' : ''}`}
                    onClick={() => setSelectedTicket(selectedTicket?._id === t._id ? null : t)}
                  >
                    {/* Player header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-primary-light text-primary font-bold text-xs flex items-center justify-center">
                            {t.playerName?.charAt(0).toUpperCase()}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-success' : 'bg-bappa-muted'}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-bappa-text text-sm">{t.playerName}</div>
                          <div className="text-xs text-bappa-muted">@{t.username}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-bappa-text">{markedCount}/15</div>
                        <div className="text-xs text-bappa-muted">{progressPct}%</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-bappa-border rounded-full mb-3 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Mini ticket */}
                    <div className="ticket-grid mb-3">
                      {t.ticketGrid.map((row, ri) =>
                        row.map((cell, ci) => {
                          if (cell === null) return <div key={`${ri}-${ci}`} className="aspect-square bg-surface-secondary rounded-lg" />;
                          const isMarkedByPlayer = (t.markedNumbers || []).includes(cell);
                          const isCalled = calledSet.has(cell);
                          return (
                            <div
                              key={`${ri}-${ci}`}
                              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all relative ${
                                isMarkedByPlayer
                                  ? 'bg-primary text-white shadow-saffron'
                                  : isCalled
                                  ? 'bg-primary-light text-primary border-2 border-primary'
                                  : 'bg-surface border border-bappa-border text-bappa-text'
                              }`}
                              title={
                                isMarkedByPlayer
                                  ? `${cell} - Marked by player`
                                  : isCalled
                                  ? `${cell} - Called (waiting for player to mark)`
                                  : `${cell} - Not called`
                              }
                            >
                              {cell}
                              {isMarkedByPlayer && (
                                <span className="absolute top-0 right-0.5 text-[8px] font-black leading-none text-white/90">✓</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Patterns */}
                    <div className="flex flex-wrap gap-1">
                      {completedPats.map((p: string) => (
                        <span key={p} className="badge-success text-xs py-0.5">{PATTERN_LABELS[p] || p}</span>
                      ))}
                      {hasPendingClaim && (
                        <span className="badge-gold text-xs py-0.5">Claim Pending</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Claim history */}
          {claims.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-bappa-text mb-4">All Claims</h3>
              <div className="space-y-2">
                {claims.map((c) => (
                  <div key={c._id} className={`flex items-center justify-between py-2 border-b border-bappa-border last:border-0`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        c.status === 'approved' ? 'bg-success' :
                        c.status === 'rejected' ? 'bg-error' : 'bg-gold'
                      }`} />
                      <div>
                        <span className="text-sm font-semibold text-bappa-text">{(c as any).playerName || 'Player'}</span>
                        <span className="text-xs text-bappa-muted ml-2">{PATTERN_LABELS[c.pattern]}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-xs ${
                        c.status === 'approved' ? 'badge-success' :
                        c.status === 'rejected' ? 'badge-error' : 'badge-gold'
                      }`}>{c.status}</span>
                      {c.status === 'pending' && (
                        <>
                          <button onClick={() => approveClaim(c._id)} className="btn-primary btn-sm py-1">
                            <CheckCircle className="w-3 h-3" />
                          </button>
                          <button onClick={() => rejectClaim(c._id)} className="btn-outline btn-sm py-1 text-error border-error">
                            <XCircle className="w-3 h-3" />
                          </button>
                        </>
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
