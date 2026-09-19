'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Wifi, WifiOff, Trophy, AlertCircle, CheckCircle, Clock, Volume2, VolumeX, Sparkles, Hand, Ticket } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { housieApi } from '@/lib/api';
import { HousieGame, HousieTicket, PATTERN_LABELS } from '@/types/index';
import type { Socket } from 'socket.io-client';

// Simple synthesized audio effects (zero external assets needed)
function playSound(type: 'mark' | 'warn' | 'win', soundEnabled: boolean) {
  if (!soundEnabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'mark') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'warn') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + i * 0.09 + 0.35);
      });
    }
  } catch {
    // AudioContext blocked or unsupported
  }
}

export default function HousieGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user, token } = useAuth();
  const [game, setGame] = useState<HousieGame | null>(null);
  const [ticket, setTicket] = useState<HousieTicket | null>(null);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [lastNumber, setLastNumber] = useState<number | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [winners, setWinners] = useState<{ name: string; pattern: string }[]>([]);
  const [claimStatus, setClaimStatus] = useState<Record<string, 'idle' | 'pending' | 'approved' | 'rejected'>>({});
  const [completedPatterns, setCompletedPatterns] = useState<string[]>([]);
  const [newNumberAnim, setNewNumberAnim] = useState(false);
  
  // Interactive daubing states
  const [markedNumbers, setMarkedNumbers] = useState<Set<number>>(new Set());
  const [shakingNumber, setShakingNumber] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const feedbackTimer = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = useCallback((text: string, type: 'success' | 'warn' | 'info' = 'info') => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ text, type });
    feedbackTimer.current = setTimeout(() => setFeedback(null), 3500);
  }, []);

  // Load initial game state
  useEffect(() => {
    if (!gameId) return;
    housieApi
      .getGame(gameId)
      .then(async (gameRes) => {
        const g = gameRes.data.game;
        setGame(g);
        setCalledNumbers(g.calledNumbers || []);
        if (g.calledNumbers?.length > 0) {
          setLastNumber(g.calledNumbers[g.calledNumbers.length - 1]);
        }
        setPlayerCount(gameRes.data.playerCount || 0);

        try {
          const ticketRes = await housieApi.getMyTicket(gameId);
          if (ticketRes.data?.ticket) {
            setTicket(ticketRes.data.ticket);
            if (ticketRes.data.ticket.markedNumbers?.length) {
              setMarkedNumbers(new Set(ticketRes.data.ticket.markedNumbers));
            }
          }
        } catch {
          if (g.roomCode) {
            try {
              const joinRes = await housieApi.join(g.roomCode);
              if (joinRes.data?.ticket) {
                setTicket(joinRes.data.ticket);
              }
            } catch {
              // Handled by socket fallback
            }
          }
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load game');
      })
      .finally(() => setLoading(false));
  }, [gameId]);

  // Socket connection
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
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('game-state', (data: any) => {
      if (data.game) setGame(data.game);
      if (data.ticket) {
        setTicket(data.ticket);
        if (data.ticket.markedNumbers?.length) {
          setMarkedNumbers(new Set(data.ticket.markedNumbers));
        }
      }
      setCalledNumbers(data.calledNumbers || data.game?.calledNumbers || []);
      setPlayerCount(data.playerCount || 0);
      if (data.calledNumbers?.length) {
        setLastNumber(data.calledNumbers[data.calledNumbers.length - 1]);
      }
    });

    const handleNumberCalled = (data: any) => {
      setCalledNumbers(data.calledNumbers);
      setLastNumber(data.number);
      setNewNumberAnim(true);
      setTimeout(() => setNewNumberAnim(false), 600);
      playSound('mark', soundEnabled);

      const myProgress = data.playerProgress?.find(
        (p: any) => p.playerId === (user as any)?.id || p.playerId === (user as any)?._id
      );
      if (myProgress) {
        setCompletedPatterns(myProgress.progress?.completedPatterns || []);
      }
    };

    socket.on('number-called', handleNumberCalled);
    socket.on('housie:number_called', handleNumberCalled);

    socket.on('ticket-marked', (data: any) => {
      if (Array.isArray(data.markedNumbers)) {
        setMarkedNumbers(new Set(data.markedNumbers));
      }
    });

    socket.on('mark-error', (data: any) => {
      showFeedback(data.message || 'Number cannot be marked yet', 'warn');
      playSound('warn', soundEnabled);
    });

    socket.on('game-started', (data: any) => {
      setGame(data.game);
      showFeedback('Game started! Watch the screen and tap called numbers.', 'info');
    });

    socket.on('game-paused', () => {
      setGame((g) => g ? { ...g, status: 'paused' } : g);
    });

    socket.on('game-resumed', () => {
      setGame((g) => g ? { ...g, status: 'started' } : g);
    });

    socket.on('game-ended', (data: any) => {
      setGame(data.game);
      showFeedback('Game has ended! Thank you for playing.', 'info');
    });

    socket.on('winner-approved', (data: any) => {
      setWinners((prev) => [...prev, { name: data.playerName || 'A player', pattern: data.pattern }]);
      setClaimStatus((prev) => ({ ...prev, [data.pattern]: 'approved' }));
      playSound('win', soundEnabled);
    });

    socket.on('housie:claim_approved', (data: any) => {
      setWinners((prev) => [...prev, { name: data.playerName || 'A player', pattern: data.pattern }]);
      setClaimStatus((prev) => ({ ...prev, [data.pattern]: 'approved' }));
      playSound('win', soundEnabled);
    });

    socket.on('winner-rejected', (data: any) => {
      setClaimStatus((prev) => ({ ...prev, [data.pattern]: 'rejected' }));
    });

    socket.on('player-joined', (data: any) => setPlayerCount(data.playerCount));
    socket.on('player-left', (data: any) => setPlayerCount(data.playerCount || playerCount - 1));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game-state');
      socket.off('number-called', handleNumberCalled);
      socket.off('housie:number_called', handleNumberCalled);
      socket.off('ticket-marked');
      socket.off('mark-error');
      socket.off('game-started');
      socket.off('game-paused');
      socket.off('game-resumed');
      socket.off('game-ended');
      socket.off('winner-approved');
      socket.off('housie:claim_approved');
      socket.off('winner-rejected');
      socket.off('player-joined');
      socket.off('player-left');
    };
  }, [token, gameId, user, soundEnabled, showFeedback]);

  // Periodic background sync in case of any dropped packets
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

  // Claim win
  const claimWin = useCallback((pattern: string) => {
    if (!gameId || claimStatus[pattern] === 'pending') return;

    setClaimStatus((prev) => ({ ...prev, [pattern]: 'pending' }));
    if (socketRef.current) {
      socketRef.current.emit('claim-win', { gameId, pattern });
      socketRef.current.emit('housie:claim', { roomId: game?.roomCode, gameId, ticketId: ticket?._id, claimType: pattern, pattern });
    }

    // Fallback REST call
    housieApi.claimWin(gameId, pattern).then((res) => {
      if (res.data.claim?.status === 'approved') {
        setClaimStatus((prev) => ({ ...prev, [pattern]: 'approved' }));
      }
    }).catch((err) => {
      setClaimStatus((prev) => ({ ...prev, [pattern]: 'idle' }));
      showFeedback(err.response?.data?.error || 'Claim was not accepted.', 'warn');
    });
  }, [gameId, claimStatus, game?.roomCode, ticket?._id, showFeedback]);

  const calledSet = new Set(calledNumbers);
  const allTicketNumbers = ticket?.ticketGrid ? ticket.ticketGrid.flat().filter((n): n is number => n !== null) : [];
  const markedCount = allTicketNumbers.filter((n) => markedNumbers.has(n)).length;
  const progressPct = allTicketNumbers.length > 0 ? Math.round((markedCount / allTicketNumbers.length) * 100) : 0;

  // Player clicks a number on screen or on ticket
  const handleNumberClick = useCallback((num: number) => {
    if (!ticket?.ticketGrid) return;
    const allTicketNums = ticket.ticketGrid.flat().filter((n): n is number => n !== null);
    const isOnTicket = allTicketNums.includes(num);
    const isCalled = calledNumbers.includes(num);

    if (!isCalled) {
      setShakingNumber(num);
      setTimeout(() => setShakingNumber(null), 500);
      playSound('warn', soundEnabled);
      showFeedback(`Number ${num} has not been called yet! Watch the screen.`, 'warn');
      return;
    }

    if (!isOnTicket) {
      showFeedback(`Number ${num} was called, but is not on your ticket.`, 'info');
      return;
    }

    // Toggle mark
    setMarkedNumbers((prev) => {
      const next = new Set(prev);
      const isNowMarked = !next.has(num);
      if (isNowMarked) {
        next.add(num);
        playSound('mark', soundEnabled);
        showFeedback(`Marked ${num} on your ticket!`, 'success');
      } else {
        next.delete(num);
        showFeedback(`Unmarked ${num}`, 'info');
      }

      if (socketRef.current) {
        socketRef.current.emit('mark-ticket-number', { gameId, number: num });
      }
      return next;
    });
  }, [ticket, calledNumbers, gameId, soundEnabled, showFeedback]);

  // Quick helper to mark all numbers called so far on player's ticket
  const handleMarkAllCalled = useCallback(() => {
    if (!ticket?.ticketGrid) return;
    const allTicketNums = ticket.ticketGrid.flat().filter((n): n is number => n !== null);
    const unMarkedCalled = allTicketNums.filter((n) => calledNumbers.includes(n) && !markedNumbers.has(n));
    if (unMarkedCalled.length === 0) {
      showFeedback('All called numbers on your ticket are already marked!', 'info');
      return;
    }
    setMarkedNumbers((prev) => {
      const next = new Set(prev);
      unMarkedCalled.forEach((n) => next.add(n));
      return next;
    });
    unMarkedCalled.forEach((n) => {
      socketRef.current?.emit('mark-ticket-number', { gameId, number: n });
    });
    playSound('mark', soundEnabled);
    showFeedback(`Marked ${unMarkedCalled.length} called number${unMarkedCalled.length > 1 ? 's' : ''}!`, 'success');
  }, [ticket, calledNumbers, markedNumbers, gameId, soundEnabled, showFeedback]);

  const isLastNumberOnTicket = lastNumber ? allTicketNumbers.includes(lastNumber) : false;
  const isLastNumberMarked = lastNumber ? markedNumbers.has(lastNumber) : false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-maroon-light rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Ticket className="w-7 h-7 text-maroon animate-pulse" />
          </div>
          <p className="text-bappa-muted font-medium">Loading your ticket…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-3" />
          <p className="font-bold text-bappa-text">{error}</p>
          <a href="/dashboard/housie" className="btn-outline mt-4 inline-flex">Back to Games</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface border-b border-bappa-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-bold text-bappa-text">{game?.name}</div>
            <div className="text-xs text-bappa-muted">Room: <span className="font-mono font-bold text-primary">{game?.roomCode}</span></div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
              className="p-1.5 rounded-lg border border-bappa-border text-bappa-muted hover:text-primary hover:border-primary transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-1 text-sm text-bappa-muted">
              <Users className="w-4 h-4" />
              {playerCount}
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${connected ? 'text-success' : 'text-error'}`}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connected ? 'Live' : 'Reconnecting…'}
            </div>
            <span className={`badge text-xs px-2 py-0.5 rounded-full font-semibold ${
              game?.status === 'started' ? 'bg-primary-light text-primary' :
              game?.status === 'paused' ? 'bg-gold-light text-gold-dark' :
              game?.status === 'completed' ? 'bg-maroon-light text-maroon' :
              'bg-bappa-border text-bappa-muted'
            }`}>
              {game?.status}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Floating feedback toast */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-between shadow-card border ${
                feedback.type === 'success'
                  ? 'bg-success-light border-success/30 text-success'
                  : feedback.type === 'warn'
                  ? 'bg-gold-light border-gold/40 text-gold-dark'
                  : 'bg-primary-light border-primary/30 text-primary-dark'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span>{feedback.text}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-xs opacity-60 hover:opacity-100 ml-3">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winner announcements */}
        <AnimatePresence>
          {winners.map((w, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-gold-light border border-gold/30 rounded-2xl px-5 py-3 flex items-center gap-3"
            >
              <Trophy className="w-5 h-5 text-gold-dark flex-shrink-0" />
              <span className="font-bold text-bappa-text">
                {PATTERN_LABELS[w.pattern] || w.pattern} won by {w.name}!
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Game paused / ended notice */}
        {game?.status === 'paused' && (
          <div className="bg-gold-light border border-gold/30 rounded-2xl px-5 py-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-gold-dark" />
            <span className="font-semibold text-bappa-text">Game is paused. Waiting for Host…</span>
          </div>
        )}

        {game?.status === 'completed' && (
          <div className="bg-maroon-light border border-maroon/20 rounded-2xl px-5 py-4 text-center">
            <div className="w-12 h-12 bg-maroon/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-6 h-6 text-maroon" />
            </div>
            <div className="font-bold text-maroon text-lg">Game Ended!</div>
            <div className="text-bappa-muted text-sm mt-1">Thanks for playing. Check the leaderboard!</div>
          </div>
        )}

        {game?.status === 'open' && (
          <div className="card bg-surface-secondary text-center py-8">
            <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="font-bold text-bappa-text text-lg">Waiting for Host to Start</div>
            <div className="text-bappa-muted text-sm mt-1">The game will begin shortly. Get ready!</div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Current Number + Called History */}
          <div className="space-y-4">
            {/* Current number display (Interactive on-screen click) */}
            <div className="card text-center relative overflow-hidden">
              <div className="text-xs text-bappa-muted font-semibold uppercase tracking-wider mb-3">Current Number</div>
              {lastNumber ? (
                <div>
                  <motion.button
                    type="button"
                    key={lastNumber}
                    onClick={() => handleNumberClick(lastNumber)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    animate={newNumberAnim ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    title={`Click ${lastNumber} to mark on your ticket!`}
                    className="w-24 h-24 rounded-full bg-maroon text-white text-4xl font-black flex items-center justify-center mx-auto shadow-lg relative cursor-pointer ring-4 ring-maroon/20 hover:ring-primary/40 transition-all"
                  >
                    {lastNumber}
                    {isLastNumberMarked && (
                      <span className="absolute -top-1 -right-1 w-7 h-7 bg-success rounded-full flex items-center justify-center text-xs font-bold shadow">
                        ✓
                      </span>
                    )}
                  </motion.button>

                  {/* Interactive hint banner for the current number */}
                  <div className="mt-3">
                    {isLastNumberOnTicket && !isLastNumberMarked ? (
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleNumberClick(lastNumber)}
                        className="px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-saffron inline-flex items-center gap-1.5 animate-bounce-soft"
                      >
                        <Hand className="w-3.5 h-3.5" /> Tap to Mark on Ticket!
                      </motion.button>
                    ) : isLastNumberOnTicket && isLastNumberMarked ? (
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success-light text-success text-xs font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" /> Marked on Your Ticket
                      </div>
                    ) : (
                      <div className="text-xs text-bappa-muted">
                        Not on your ticket
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="w-24 h-24 rounded-full bg-bappa-border text-bappa-muted text-2xl font-bold flex items-center justify-center mx-auto">
                    –
                  </div>
                  <div className="text-xs text-bappa-muted mt-3">Waiting for first number</div>
                </div>
              )}
              <div className="mt-3 text-xs text-bappa-muted font-medium">
                {calledNumbers.length} / 90 called
              </div>
            </div>

            {/* Last 5 numbers */}
            {calledNumbers.length > 0 && (
              <div className="card">
                <div className="text-xs text-bappa-muted font-semibold uppercase tracking-wider mb-3">Recent Numbers</div>
                <div className="flex gap-2 flex-wrap">
                  {[...calledNumbers].reverse().slice(0, 5).map((n, i) => {
                    const onMyTicket = allTicketNumbers.includes(n);
                    const isMarked = markedNumbers.has(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleNumberClick(n)}
                        title={`Number ${n} - Click to mark`}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-transform active:scale-95 ${
                          i === 0
                            ? 'bg-maroon text-white ring-2 ring-maroon/30 shadow'
                            : isMarked
                            ? 'bg-primary text-white shadow-sm'
                            : onMyTicket
                            ? 'bg-primary-light text-primary border-2 border-primary font-extrabold'
                            : 'bg-surface-secondary text-bappa-muted'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Progress */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-bappa-text">Your Marked Progress</span>
                <span className="text-sm font-bold text-primary">{markedCount} / 15</span>
              </div>
              <div className="w-full h-3 bg-bappa-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-bappa-muted mt-2">
                <span>{progressPct}% complete</span>
                {allTicketNumbers.filter((n) => calledSet.has(n) && !markedNumbers.has(n)).length > 0 && (
                  <span className="text-primary font-medium animate-pulse">
                    {allTicketNumbers.filter((n) => calledSet.has(n) && !markedNumbers.has(n)).length} un-marked!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ticket */}
          <div className="md:col-span-2 space-y-4">
            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="font-bold text-bappa-text flex items-center gap-2">
                    Your Ticket
                    <span className="text-xs font-normal text-bappa-muted">
                      (Tap called numbers to mark)
                    </span>
                  </div>
                  <div className="text-xs text-bappa-muted font-mono">
                    ID: {ticket?._id?.slice(-8).toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllCalled}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary-light/40 transition-all flex items-center gap-1"
                    title="Mark all numbers called so far"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Mark All Called
                  </button>
                  <div className="badge-saffron font-bold text-xs">{markedCount} / 15 marked</div>
                </div>
              </div>

              {ticket && ticket.ticketGrid && Array.isArray(ticket.ticketGrid) ? (
                <div className="ticket-grid">
                  {ticket.ticketGrid.map((row, ri) =>
                    row.map((cell, ci) => {
                      if (cell === null) {
                        return <div key={`${ri}-${ci}`} className="ticket-cell-blank aspect-square" />;
                      }
                      const isMarked = markedNumbers.has(cell);
                      const isCalled = calledSet.has(cell);
                      const isShaking = shakingNumber === cell;

                      return (
                        <motion.button
                          key={`${ri}-${ci}`}
                          type="button"
                          onClick={() => handleNumberClick(cell)}
                          animate={
                            isShaking
                              ? { x: [-6, 6, -5, 5, -3, 3, 0] }
                              : isMarked && cell === lastNumber
                              ? { scale: [1, 1.15, 1] }
                              : {}
                          }
                          transition={{ duration: 0.35 }}
                          className={`relative select-none ${
                            isMarked
                              ? 'ticket-cell-marked'
                              : isCalled
                              ? 'ticket-cell-number ring-2 ring-primary ring-offset-1 font-extrabold bg-primary-light/40 animate-pulse-soft'
                              : 'ticket-cell-number'
                          }`}
                          title={
                            isMarked
                              ? `Number ${cell} is marked! Click to unmark.`
                              : isCalled
                              ? `Number ${cell} WAS CALLED! Click to mark!`
                              : `Number ${cell} has not been called yet.`
                          }
                        >
                          <span>{cell}</span>
                          {isMarked && (
                            <span className="absolute top-0.5 right-1 text-[10px] font-black leading-none text-white/95">
                              ✓
                            </span>
                          )}
                          {isCalled && !isMarked && (
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                            </span>
                          )}
                        </motion.button>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-bappa-muted">Ticket not found</div>
              )}
            </div>

            {/* Winning patterns + claim buttons */}
            {game?.activePatterns && game.activePatterns.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-bold text-bappa-text">Winning Patterns</div>
                  <div className="text-xs text-bappa-muted">Mark your numbers to claim prizes</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {game.activePatterns.map((pattern) => {
                    const isCompleted = completedPatterns.includes(pattern);
                    const claimSt = claimStatus[pattern] || 'idle';

                    return (
                      <div
                        key={pattern}
                        className={`rounded-xl p-3 border-2 transition-all ${
                          claimSt === 'approved' ? 'border-gold bg-gold-light' :
                          isCompleted ? 'border-success bg-success-light' :
                          'border-bappa-border bg-surface'
                        }`}
                      >
                        <div className="text-xs font-bold text-bappa-text mb-2">
                          {PATTERN_LABELS[pattern] || pattern}
                        </div>
                        {claimSt === 'approved' ? (
                          <div className="flex items-center gap-1 text-xs text-gold-dark font-semibold">
                            <Trophy className="w-3 h-3" /> Won!
                          </div>
                        ) : claimSt === 'pending' ? (
                          <div className="text-xs text-bappa-muted">Pending…</div>
                        ) : claimSt === 'rejected' ? (
                          <div className="text-xs text-error font-medium">Rejected</div>
                        ) : isCompleted ? (
                          <button
                            onClick={() => claimWin(pattern)}
                            className="btn-primary btn-sm w-full text-xs py-1.5 shadow-sm hover:shadow"
                          >
                            Claim Win!
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-bappa-muted">
                            <Clock className="w-3 h-3" /> In Progress
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Number Board (1–90) with generous gap & interactive daubing */}
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <div className="font-bold text-bappa-text">Number Board (1–90)</div>
              <div className="text-xs text-bappa-muted">Tap any called number to mark it on your ticket</div>
            </div>
            <div className="text-xs font-semibold text-primary">
              {calledNumbers.length} called · {90 - calledNumbers.length} remaining
            </div>
          </div>
          <div className="number-board">
            {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => {
              const isCalled = calledSet.has(n);
              const isCurrent = n === lastNumber;
              const isOnMyTicket = allTicketNumbers.includes(n);
              const isMarkedByMe = markedNumbers.has(n);

              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleNumberClick(n)}
                  className={`number-ball ${
                    isCurrent ? 'number-ball-current' :
                    isCalled ? 'number-ball-called' :
                    'number-ball-uncalled'
                  } ${isOnMyTicket && isCalled && !isMarkedByMe ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                  title={
                    isCurrent ? `Number ${n} - CURRENT NUMBER! Click to mark` :
                    isCalled ? `Number ${n} - Called${isOnMyTicket ? ' (On your ticket!)' : ''}` :
                    `Number ${n} - Not yet called`
                  }
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
