'use client';

import type { Variants } from 'framer-motion';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Trophy, Zap, Users, Star, ChevronRight, Play,
  Clock, Shield, Award, BookOpen, Grid3X3, Flame,
  Sparkles, HelpCircle, Ticket, Medal
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const LEADERBOARD_PREVIEW = [
  { rank: 1, name: 'Priya Sharma', points: 1240, wins: 8, avatar: 'PS' },
  { rank: 2, name: 'Arjun Pawar', points: 1180, wins: 7, avatar: 'AP' },
  { rank: 3, name: 'Sneha Kulkarni', points: 1050, wins: 6, avatar: 'SK' },
  { rank: 4, name: 'Rohit Desai', points: 920, wins: 5, avatar: 'RD' },
  { rank: 5, name: 'Neha Joshi', points: 850, wins: 4, avatar: 'NJ' },
];

const RANK_MEDAL = ['1', '2', '3', '4', '5'];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Navbar ───────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-bappa-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-saffron-gradient flex items-center justify-center shadow-saffron flex-shrink-0">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-black text-xl text-bappa-text tracking-tight">Bappa</span>
                <span className="font-black text-xl text-primary tracking-tight">Verse</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link href="#games" className="text-bappa-muted hover:text-primary font-medium transition-colors">
                Games
              </Link>
              <Link href="/leaderboard" className="text-bappa-muted hover:text-primary font-medium transition-colors">
                Leaderboard
              </Link>
              {user ? (
                <Link
                  href={user.role === 'player' ? '/dashboard' : '/admin'}
                  className="btn-primary btn-sm"
                >
                  Dashboard
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="btn-outline btn-sm">Log In</Link>
                  <Link href="/register" className="btn-primary btn-sm">Register</Link>
                </div>
              )}
            </div>
            {/* Mobile nav */}
            <div className="md:hidden flex items-center gap-2">
              <Link href="/login" className="btn-outline btn-sm">Log In</Link>
              <Link href="/register" className="btn-primary btn-sm">Register</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-hero-gradient">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-maroon/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute inset-0 bg-festive-dots opacity-40" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              {/* Festival badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-light border border-primary/20 rounded-full mb-6"
              >
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-semibold text-primary">
                  Ganesh Chaturthi Special
                </span>
              </motion.div>

              <motion.h1
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-5xl md:text-6xl lg:text-7xl font-black text-bappa-text leading-tight"
              >
                Celebrate.
                <br />
                <span className="text-gradient-saffron">Play.</span>
                <br />
                <span className="text-gradient-maroon">Win.</span>
              </motion.h1>

              <motion.p
                custom={1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="mt-6 text-lg text-bappa-muted leading-relaxed max-w-md"
              >
                Experience the joy of Ganapati with exciting quizzes and live Housie games.
                Compete with friends, mark your ticket, and claim your win.
              </motion.p>

              <motion.div
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="mt-8 flex flex-wrap gap-4"
              >
                <Link href="#games" className="btn-primary btn-lg gap-2">
                  Explore Games <ChevronRight className="w-5 h-5" />
                </Link>
                <Link href="/register" className="btn-outline btn-lg">
                  Join Now Free
                </Link>
              </motion.div>

              <motion.div
                custom={3}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="mt-10 flex items-center gap-8"
              >
                {[
                  { icon: <Users className="w-4 h-4" />, label: 'Players online', value: '120+' },
                  { icon: <Trophy className="w-4 h-4" />, label: 'Games played', value: '1.2k+' },
                  { icon: <Star className="w-4 h-4" />, label: 'Festival fun', value: '100%' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2">
                    <div className="text-primary">{stat.icon}</div>
                    <div>
                      <div className="font-bold text-bappa-text">{stat.value}</div>
                      <div className="text-xs text-bappa-muted">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Hero illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="relative flex justify-center"
            >
              <div className="relative w-80 h-80 md:w-96 md:h-96">
                {/* Main circle */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-light via-surface to-maroon-light border-4 border-bappa-border shadow-card-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <Flame className="w-14 h-14 text-primary" />
                    </div>
                    <div className="font-black text-2xl text-bappa-text">BappaVerse</div>
                    <div className="text-bappa-muted text-sm mt-1">Festival Gaming Platform</div>
                  </div>
                </div>

                {/* Floating cards */}
                <motion.div
                  animate={{ y: [-6, 6, -6] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-4 -left-8 card shadow-card-hover p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center text-primary">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Quiz</div>
                      <div className="text-xs text-bappa-muted">10 questions</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [6, -6, 6] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute -bottom-4 -right-8 card shadow-card-hover p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gold-light rounded-lg flex items-center justify-center text-gold-dark">
                      <Grid3X3 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Housie</div>
                      <div className="text-xs text-bappa-muted">Live game</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [-4, 4, -4] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute top-1/2 -right-12 card shadow-card-hover p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-success-light rounded-lg flex items-center justify-center text-success">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Win!</div>
                      <div className="text-xs text-bappa-muted">50 pts</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Choose Your Game ──────────────────────────────────────────── */}
      <section id="games" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="badge-saffron mb-4 mx-auto w-fit">Choose Your Game</div>
            <h2 className="text-4xl font-black text-bappa-text">
              Two Exciting <span className="text-gradient-saffron">Festival Games</span>
            </h2>
            <p className="mt-3 text-bappa-muted max-w-md mx-auto">
              Test your knowledge or join a live Housie room — both games celebrate the spirit of Ganapati.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Quiz Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="card-festive group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary-light rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                  <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                </div>
                <span className="badge-saffron">Knowledge</span>
              </div>
              <h3 className="text-2xl font-bold text-bappa-text mb-2">Ganapati Quiz</h3>
              <p className="text-bappa-muted leading-relaxed mb-6">
                Test your knowledge of Ganapati traditions, Maharashtra culture, modak recipes,
                history, and festival celebrations across authentic categories.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { icon: <HelpCircle className="w-5 h-5 text-primary mx-auto mb-1" />, label: '50+ Questions' },
                  { icon: <Clock className="w-5 h-5 text-primary mx-auto mb-1" />, label: 'Timed Rounds' },
                  { icon: <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />, label: 'Leaderboard' },
                ].map((f) => (
                  <div key={f.label} className="bg-surface rounded-xl p-3 text-center border border-bappa-border">
                    <div>{f.icon}</div>
                    <div className="text-xs font-semibold text-bappa-text">{f.label}</div>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/quiz" className="btn-primary w-full justify-center">
                <Play className="w-4 h-4" /> Play Quiz
              </Link>
            </motion.div>

            {/* Housie Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="card-festive group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-maroon-light rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                  <Ticket className="w-7 h-7 sm:w-8 sm:h-8 text-maroon" />
                </div>
                <span className="badge-maroon">Live Multiplayer</span>
              </div>
              <h3 className="text-2xl font-bold text-bappa-text mb-2">Bappa Housie</h3>
              <p className="text-bappa-muted leading-relaxed mb-6">
                Join a live Tambola game, get your unique ticket, mark called numbers in real time,
                and be the first to claim Early Five, Top Line, or Full House.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { icon: <Grid3X3 className="w-5 h-5 text-maroon mx-auto mb-1" />, label: '1-90 Numbers' },
                  { icon: <Users className="w-5 h-5 text-maroon mx-auto mb-1" />, label: 'Live Players' },
                  { icon: <Zap className="w-5 h-5 text-maroon mx-auto mb-1" />, label: 'Real-time' },
                ].map((f) => (
                  <div key={f.label} className="bg-surface rounded-xl p-3 text-center border border-bappa-border">
                    <div>{f.icon}</div>
                    <div className="text-xs font-semibold text-bappa-text">{f.label}</div>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/housie" className="btn-maroon w-full justify-center">
                <Zap className="w-4 h-4" /> Join Housie
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────────────────── */}
      <section className="py-20 bg-surface-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="badge-gold mb-4 mx-auto w-fit">How It Works</div>
            <h2 className="text-4xl font-black text-bappa-text">
              Three Simple <span className="text-gradient-gold">Steps</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: <Users className="w-7 h-7" />,
                title: 'Create Account',
                desc: 'Register with your name and email. Get instant access to all games and your personal dashboard.',
                color: 'text-primary bg-primary-light',
              },
              {
                step: '02',
                icon: <Play className="w-7 h-7" />,
                title: 'Join a Game',
                desc: 'Play the Ganapati Quiz solo or enter a Housie room with a unique code. Get your ticket instantly.',
                color: 'text-maroon bg-maroon-light',
              },
              {
                step: '03',
                icon: <Trophy className="w-7 h-7" />,
                title: 'Win & Celebrate',
                desc: 'Earn points, climb the leaderboard, and celebrate your wins on the BappaVerse festival stage.',
                color: 'text-gold-dark bg-gold-light',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="card text-center"
              >
                <div className="relative inline-block mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${item.color}`}>
                    {item.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-bappa-text text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-bappa-text mb-2">{item.title}</h3>
                <p className="text-bappa-muted leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Housie Feature Highlight ─────────────────────────────────── */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="badge-maroon mb-4">Live Housie Feature</div>
              <h2 className="text-4xl font-black text-bappa-text mb-4">
                Real-Time Tambola,<br />
                <span className="text-gradient-maroon">Festival Style</span>
              </h2>
              <p className="text-bappa-muted leading-relaxed mb-6">
                Our Housie game is fully real-time. Every number called by the Host appears
                instantly on your ticket. Mark it, claim it, and celebrate with everyone.
              </p>
              <div className="space-y-3">
                {[
                  { icon: <Shield className="w-5 h-5" />, text: 'Server-verified winning claims' },
                  { icon: <Zap className="w-5 h-5" />, text: 'Instant number broadcasting' },
                  { icon: <Users className="w-5 h-5" />, text: 'Host sees all player tickets live' },
                  { icon: <Award className="w-5 h-5" />, text: 'Multiple winning patterns' },
                  { icon: <Clock className="w-5 h-5" />, text: 'Auto or manual number calling' },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-maroon-light text-maroon rounded-lg flex items-center justify-center flex-shrink-0">
                      {f.icon}
                    </div>
                    <span className="text-bappa-text font-medium">{f.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Ticket preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="card shadow-card-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-bold text-bappa-text">Your Ticket</div>
                  <div className="text-xs text-bappa-muted">TKT-2024-0042</div>
                </div>
                <div className="badge-saffron">8/15 marked</div>
              </div>
              {/* Demo ticket */}
              <div className="ticket-grid mb-4">
                {[
                  [3, null, 21, null, 45, null, 63, null, 82],
                  [null, 14, null, 37, null, 52, null, 74, null],
                  [8, null, 28, null, 49, null, 67, null, 88],
                ].map((row, ri) =>
                  row.map((cell, ci) =>
                    cell === null ? (
                      <div key={`${ri}-${ci}`} className="ticket-cell-blank" />
                    ) : (
                      <div
                        key={`${ri}-${ci}`}
                        className={
                          [3, 21, 14, 37, 52, 8, 67, 88].includes(cell)
                            ? 'ticket-cell-marked'
                            : 'ticket-cell-number'
                        }
                      >
                        {cell}
                      </div>
                    )
                  )
                )}
              </div>
              <div className="bg-primary-light rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-bappa-muted">Last called</div>
                  <div className="text-2xl font-black text-primary">67</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-bappa-muted">Early Five</div>
                  <div className="font-bold text-success text-sm">Completed!</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Leaderboard Preview ──────────────────────────────────────── */}
      <section className="py-20 bg-surface-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="badge-gold mb-4 mx-auto w-fit">Top Players</div>
            <h2 className="text-4xl font-black text-bappa-text">
              Festival <span className="text-gradient-gold">Leaderboard</span>
            </h2>
          </motion.div>

          <div className="max-w-2xl mx-auto">
            <div className="card">
              {LEADERBOARD_PREVIEW.map((player, i) => (
                <motion.div
                  key={player.rank}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className={`flex items-center gap-4 py-3 ${i < LEADERBOARD_PREVIEW.length - 1 ? 'border-b border-bappa-border' : ''}`}
                >
                  <div className={`w-8 text-center font-bold text-sm ${i < 3 ? 'text-primary font-black' : 'text-bappa-muted'}`}>
                    #{i + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary-light text-primary font-bold flex items-center justify-center text-sm">
                    {player.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-bappa-text">{player.name}</div>
                    <div className="text-xs text-bappa-muted">{player.wins} wins</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gold-dark">{player.points.toLocaleString()}</div>
                    <div className="text-xs text-bappa-muted">points</div>
                  </div>
                </motion.div>
              ))}
              <div className="mt-4 pt-4 border-t border-bappa-border">
                <Link href="/leaderboard" className="btn-outline w-full justify-center">
                  View Full Leaderboard <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="card-festive bg-gradient-to-br from-primary-light to-surface-secondary border-primary/20 py-16"
          >
            <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Flame className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-4xl font-black text-bappa-text mb-4">
              Ganpati Bappa Morya!
            </h2>
            <p className="text-bappa-muted text-lg mb-8 max-w-md mx-auto">
              Join thousands of players celebrating Ganapati with fun, knowledge, and friendly competition.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/register" className="btn-primary btn-lg">
                Create Free Account
              </Link>
              <Link href="/login" className="btn-outline btn-lg">
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-bappa-text text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white flex-shrink-0">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <span className="font-black text-xl">BappaVerse</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed">
                A Ganapati festival gaming platform bringing people together through
                fun, knowledge, and celebration.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white/80">Games</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><Link href="/dashboard/quiz" className="hover:text-white transition-colors">Ganapati Quiz</Link></li>
                <li><Link href="/dashboard/housie" className="hover:text-white transition-colors">Bappa Housie</Link></li>
                <li><Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white/80">Account</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">Log In</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Register</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/50 text-sm">
              © 2024 BappaVerse. Made with love for Ganesh Chaturthi.
            </p>
            <div className="flex items-center gap-1.5 text-white/60 text-sm">
              <Sparkles className="w-4 h-4 text-gold" />
              <span>Ganpati Bappa Morya!</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
