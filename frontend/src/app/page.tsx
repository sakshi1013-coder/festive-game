'use client';

import type { Variants } from 'framer-motion';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Trophy, Zap, Users, Star, ChevronRight, Play,
  Clock, Shield, Award, BookOpen, Grid3X3, Flame,
  Sparkles, HelpCircle, Ticket, Heart, ArrowRight
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const },
  }),
};

const LEADERBOARD_PREVIEW = [
  { rank: 1, name: 'Priya Sharma', points: 1420, wins: 9, avatar: 'PS', color: 'bg-pastel-yellow' },
  { rank: 2, name: 'Arjun Pawar', points: 1280, wins: 7, avatar: 'AP', color: 'bg-pastel-blue' },
  { rank: 3, name: 'Sneha Kulkarni', points: 1110, wins: 6, avatar: 'SK', color: 'bg-pastel-pink' },
  { rank: 4, name: 'Rohit Desai', points: 940, wins: 5, avatar: 'RD', color: 'bg-pastel-mint' },
  { rank: 5, name: 'Neha Joshi', points: 870, wins: 4, avatar: 'NJ', color: 'bg-pastel-lavender' },
];

export default function LandingPage() {
  const { user, isHost } = useAuth();

  return (
    <div className="min-h-screen bg-background text-bappa-text selection:bg-pastel-lavender">
      {/* ─── Rounded Floating Navbar ─────────────────────────────────── */}
      <header className="sticky top-3 z-50 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <nav className="bg-surface/95 backdrop-blur-md border border-bappa-border rounded-3xl shadow-card px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-pastel-lavender text-primary flex items-center justify-center font-black text-xl shadow-xs group-hover:scale-105 transition-transform">
              ✨
            </div>
            <div>
              <span className="font-black text-xl text-bappa-text tracking-tight">Bappa</span>
              <span className="font-black text-xl text-primary tracking-tight">Verse</span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-xl font-bold text-sm text-bappa-text hover:bg-surface-secondary transition-colors"
            >
              Home
            </Link>
            <Link
              href="#games"
              className="px-3.5 py-1.5 rounded-xl font-bold text-sm text-bappa-secondary hover:text-bappa-text hover:bg-surface-secondary transition-colors"
            >
              Games
            </Link>
            <Link
              href="/quiz"
              className="px-3.5 py-1.5 rounded-xl font-bold text-sm text-bappa-secondary hover:text-bappa-text hover:bg-surface-secondary transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-pastel-pink-dark"></span>
              Quiz
            </Link>
            <Link
              href="/dashboard/housie"
              className="px-3.5 py-1.5 rounded-xl font-bold text-sm text-bappa-secondary hover:text-bappa-text hover:bg-surface-secondary transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-pastel-blue-dark"></span>
              Housie
            </Link>
            <Link
              href="/leaderboard"
              className="px-3.5 py-1.5 rounded-xl font-bold text-sm text-bappa-secondary hover:text-bappa-text hover:bg-surface-secondary transition-colors"
            >
              Leaderboard
            </Link>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {user ? (
              <>
                {isHost && (
                  <Link
                    href="/admin"
                    className="btn-outline btn-sm bg-pastel-yellow-light border-pastel-yellow text-bappa-text"
                  >
                    Host Control
                  </Link>
                )}
                <Link
                  href="/dashboard/profile"
                  className="btn-primary btn-sm flex items-center gap-1.5"
                >
                  <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span>Profile</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="btn-outline btn-sm">
                  Log In
                </Link>
                <Link href="/register" className="btn-primary btn-sm">
                  Play Free
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* ─── Hero Section: Playful Pastel Festival Lobby ──────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:py-24">
        {/* Subtle festive ambient accents */}
        <div className="absolute top-10 left-1/4 w-80 h-80 rounded-full bg-pastel-lavender/30 blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-80 h-80 rounded-full bg-pastel-pink/25 blur-3xl pointer-events-none" />
        <div className="absolute bottom-5 left-1/3 w-96 h-96 rounded-full bg-pastel-mint/30 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Festival tag badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface border border-bappa-border rounded-full shadow-xs mb-6"
            >
              <span className="text-base">🌸</span>
              <span className="text-xs sm:text-sm font-bold text-bappa-secondary">
                Ganapati Festival Multiplayer Gaming Lounge
              </span>
            </motion.div>

            {/* Playful Headline */}
            <motion.h1
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-5xl sm:text-6xl md:text-7xl font-black text-bappa-text tracking-tight leading-[1.15]"
            >
              Celebrate. <span className="text-primary">Play.</span>{' '}
              <span className="bg-gradient-to-r from-pastel-pink-dark via-primary to-pastel-blue-dark bg-clip-text text-transparent">
                Win.
              </span>
            </motion.h1>

            <motion.p
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-6 text-lg sm:text-xl text-bappa-secondary font-medium leading-relaxed max-w-2xl mx-auto"
            >
              Festive multiplayer games for your Ganapati celebration. Jump into live Aarti quizzes, play colorful Tambola, and climb the festive leaderboard with family & friends.
            </motion.p>

            {/* Hero CTAs */}
            <motion.div
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-8 flex flex-wrap items-center justify-center gap-3.5"
            >
              <Link href="#games" className="btn-primary btn-lg shadow-pastel gap-2">
                <Play className="w-5 h-5 fill-white" /> Explore Games
              </Link>
              <Link href="/quiz" className="btn-outline btn-lg gap-2">
                Join with Code <ChevronRight className="w-4 h-4 text-bappa-muted" />
              </Link>
            </motion.div>

            {/* Micro Stats Row */}
            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm font-bold text-bappa-secondary"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pastel-mint flex items-center justify-center text-success-dark">
                  <Users className="w-4 h-4" />
                </div>
                <span>Live Multiplayer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pastel-yellow flex items-center justify-center text-bappa-text">
                  <Trophy className="w-4 h-4" />
                </div>
                <span>Instant Claims</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pastel-pink flex items-center justify-center text-maroon">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>100% Free & Family Friendly</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Main Game Cards Section ─────────────────────────────────── */}
      <section id="games" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="badge-lavender text-xs uppercase tracking-wider mb-2">
            Multiplayer Games
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-bappa-text">
            Choose Your Festive Arena
          </h2>
          <p className="text-bappa-secondary text-sm sm:text-base mt-2 max-w-md mx-auto">
            Play synchronized live games on your mobile or laptop during Ganapati celebrations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Card 1: Quiz (Pastel Lavender + Pink Identity) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-4xl p-8 bg-quiz-gradient border-2 border-pastel-lavender shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 rounded-3xl bg-pastel-lavender text-primary flex items-center justify-center shadow-xs">
                  <BookOpen className="w-8 h-8" />
                </div>
                <span className="badge-lavender font-bold text-xs px-3 py-1">
                  10–20 Questions
                </span>
              </div>

              <span className="text-xs font-black tracking-wider uppercase text-primary">
                Aarti Knowledge & Trivia
              </span>
              <h3 className="text-3xl font-black text-bappa-text mt-1 mb-3">
                Ganapati Quiz
              </h3>
              <p className="text-bappa-secondary text-sm sm:text-base leading-relaxed mb-6">
                Test your knowledge of authentic Marathi Aartis, Ganapati traditions, and sacred hymns. Rapid 4-color pastel answering with real-time live host rounds.
              </p>

              {/* Feature Chips */}
              <div className="grid grid-cols-3 gap-2.5 mb-8">
                <div className="bg-surface/90 rounded-2xl p-3 text-center border border-pastel-lavender/50">
                  <div className="text-xs font-bold text-bappa-text">Timed</div>
                  <div className="text-[11px] text-bappa-muted">25s Rounds</div>
                </div>
                <div className="bg-surface/90 rounded-2xl p-3 text-center border border-pastel-lavender/50">
                  <div className="text-xs font-bold text-bappa-text">Multi-type</div>
                  <div className="text-[11px] text-bappa-muted">MCQ & Blanks</div>
                </div>
                <div className="bg-surface/90 rounded-2xl p-3 text-center border border-pastel-lavender/50">
                  <div className="text-xs font-bold text-bappa-text">Points</div>
                  <div className="text-[11px] text-bappa-muted">Live Scores</div>
                </div>
              </div>
            </div>

            <Link
              href="/quiz"
              className="btn-primary w-full py-4 text-base font-black shadow-pastel flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-white" /> Play Quiz Now
            </Link>
          </motion.div>

          {/* Card 2: Housie (Pastel Blue + Mint Identity) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-4xl p-8 bg-housie-gradient border-2 border-pastel-blue shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 rounded-3xl bg-pastel-blue text-[#204068] flex items-center justify-center shadow-xs">
                  <Ticket className="w-8 h-8" />
                </div>
                <span className="badge-blue font-bold text-xs px-3 py-1">
                  Live Multiplayer
                </span>
              </div>

              <span className="text-xs font-black tracking-wider uppercase text-pastel-blue-dark">
                Multicolor Tambola Room
              </span>
              <h3 className="text-3xl font-black text-bappa-text mt-1 mb-3">
                Bappa Housie
              </h3>
              <p className="text-bappa-secondary text-sm sm:text-base leading-relaxed mb-6">
                Join a festive Tambola game, receive a 3 × 9 pastel ticket, daub numbers as they are called in real time, and claim Early 5, Lines, or Full House!
              </p>

              {/* Feature Chips */}
              <div className="grid grid-cols-3 gap-2.5 mb-8">
                <div className="bg-surface/90 rounded-2xl p-3 text-center border border-pastel-blue/50">
                  <div className="text-xs font-bold text-bappa-text">1–90</div>
                  <div className="text-[11px] text-bappa-muted">Live Calling</div>
                </div>
                <div className="bg-surface/90 rounded-2xl p-3 text-center border border-pastel-blue/50">
                  <div className="text-xs font-bold text-bappa-text">Patterns</div>
                  <div className="text-[11px] text-bappa-muted">5 Ways to Win</div>
                </div>
                <div className="bg-surface/90 rounded-2xl p-3 text-center border border-pastel-blue/50">
                  <div className="text-xs font-bold text-bappa-text">Auto Daub</div>
                  <div className="text-[11px] text-bappa-muted">Tap to Mark</div>
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/housie"
              className="btn-blue w-full py-4 text-base font-black shadow-pastel-blue flex items-center justify-center gap-2 text-[#1A365D]"
            >
              <Zap className="w-5 h-5" /> Join Housie Game
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── How To Play 3 Simple Steps ─────────────────────────────── */}
      <section className="py-16 bg-surface-secondary/70 border-y border-bappa-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="badge-peach text-xs font-bold uppercase tracking-wider mb-2">
              Game Night Flow
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-bappa-text">
              Three Simple Steps to Win
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Enter Room Code',
                desc: 'Get the 6-character room code from your host or screen and join in 2 seconds.',
                badge: 'bg-pastel-pink',
                icon: '🔑',
              },
              {
                step: '02',
                title: 'Play Live in Real Time',
                desc: 'Answer quiz questions synchronously or daub called numbers on your pastel ticket.',
                badge: 'bg-pastel-blue',
                icon: '🎮',
              },
              {
                step: '03',
                title: 'Claim & Celebrate',
                desc: 'Claim winning patterns, win festival points, and climb the community leaderboard!',
                badge: 'bg-pastel-yellow',
                icon: '🏆',
              },
            ].map((s, idx) => (
              <motion.div
                key={s.step}
                custom={idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="card text-center p-7"
              >
                <div className={`w-14 h-14 ${s.badge} rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-xs`}>
                  {s.icon}
                </div>
                <div className="text-xs font-black uppercase tracking-widest text-primary mb-1">
                  Step {s.step}
                </div>
                <h3 className="text-xl font-black text-bappa-text mb-2">{s.title}</h3>
                <p className="text-bappa-secondary text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Leaderboard Podium Preview ─────────────────────────────── */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="badge-yellow text-xs font-bold uppercase tracking-wider mb-2">
            Festival Hall of Fame
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-bappa-text">
            Top Festival Champions
          </h2>
        </div>

        <div className="card shadow-card-lg p-6 sm:p-8">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 pt-2 pb-4 border-b border-bappa-border">
            {/* 2nd Place (Pastel Blue) */}
            <div className="bg-pastel-blue/40 border border-pastel-blue rounded-3xl p-3.5 text-center flex flex-col items-center justify-end">
              <span className="text-2xl mb-1">🥈</span>
              <div className="w-10 h-10 rounded-full bg-pastel-blue text-[#204068] font-black text-sm flex items-center justify-center mb-1">
                {LEADERBOARD_PREVIEW[1].avatar}
              </div>
              <div className="font-bold text-xs sm:text-sm text-bappa-text truncate max-w-full">
                {LEADERBOARD_PREVIEW[1].name}
              </div>
              <div className="text-xs font-black text-pastel-blue-dark mt-0.5">
                {LEADERBOARD_PREVIEW[1].points} pts
              </div>
            </div>

            {/* 1st Place (Pastel Yellow - Elevated) */}
            <div className="bg-pastel-yellow/45 border-2 border-pastel-yellow-dark rounded-3xl p-4 text-center flex flex-col items-center justify-end -translate-y-2 shadow-pastel-yellow">
              <span className="text-3xl mb-1">🥇</span>
              <div className="w-12 h-12 rounded-full bg-pastel-yellow text-[#5A4108] font-black text-base flex items-center justify-center mb-1.5 ring-2 ring-pastel-yellow-dark/50">
                {LEADERBOARD_PREVIEW[0].avatar}
              </div>
              <div className="font-black text-xs sm:text-sm text-bappa-text truncate max-w-full">
                {LEADERBOARD_PREVIEW[0].name}
              </div>
              <div className="text-xs sm:text-sm font-black text-gold-dark mt-0.5">
                {LEADERBOARD_PREVIEW[0].points} pts
              </div>
            </div>

            {/* 3rd Place (Pastel Pink) */}
            <div className="bg-pastel-pink/40 border border-pastel-pink rounded-3xl p-3.5 text-center flex flex-col items-center justify-end">
              <span className="text-2xl mb-1">🥉</span>
              <div className="w-10 h-10 rounded-full bg-pastel-pink text-[#9B2C2C] font-black text-sm flex items-center justify-center mb-1">
                {LEADERBOARD_PREVIEW[2].avatar}
              </div>
              <div className="font-bold text-xs sm:text-sm text-bappa-text truncate max-w-full">
                {LEADERBOARD_PREVIEW[2].name}
              </div>
              <div className="text-xs font-black text-maroon mt-0.5">
                {LEADERBOARD_PREVIEW[2].points} pts
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {LEADERBOARD_PREVIEW.slice(3).map((p) => (
              <div
                key={p.rank}
                className="flex items-center justify-between p-3 rounded-2xl bg-surface-secondary/50 border border-bappa-border/60"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-xs text-bappa-muted">
                    #{p.rank}
                  </span>
                  <div className={`w-8 h-8 rounded-xl ${p.color} font-bold text-xs flex items-center justify-center text-bappa-text`}>
                    {p.avatar}
                  </div>
                  <span className="font-bold text-sm text-bappa-text">{p.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-sm text-primary">{p.points}</span>
                  <span className="text-xs text-bappa-muted ml-1">pts</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-bappa-border text-center">
            <Link href="/leaderboard" className="btn-outline btn-sm inline-flex items-center gap-2">
              View Full Leaderboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-surface border-t border-bappa-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pastel-lavender flex items-center justify-center text-primary text-sm font-black">
              ✨
            </div>
            <span className="font-black text-base text-bappa-text">BappaVerse</span>
            <span className="text-xs text-bappa-muted">— Ganapati Festival Gaming Lounge</span>
          </div>

          <div className="flex items-center gap-6 text-xs font-bold text-bappa-secondary">
            <Link href="/quiz" className="hover:text-primary transition-colors">Aarti Quiz</Link>
            <Link href="/dashboard/housie" className="hover:text-primary transition-colors">Bappa Housie</Link>
            <Link href="/leaderboard" className="hover:text-primary transition-colors">Leaderboard</Link>
            <Link href="/dashboard/profile" className="hover:text-primary transition-colors">My Profile</Link>
          </div>

          <p className="text-xs text-bappa-muted">
            Celebrate with joy & friendly competition 🌸
          </p>
        </div>
      </footer>
    </div>
  );
}
