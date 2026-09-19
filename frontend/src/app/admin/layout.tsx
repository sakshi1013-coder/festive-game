'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, PlusCircle, Gamepad2, Settings2,
  Users, BookOpen, Trophy, History, LogOut, Menu, X, ChevronRight, Shield, Sparkles, Flame
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/housie', label: 'Housie Games', icon: Gamepad2 },
  { href: '/admin/quiz', label: 'Quiz Manager', icon: BookOpen },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/admin/players', label: 'Players', icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isHost } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isHost) router.push('/dashboard');
  }, [user, loading, isHost, router]);

  if (loading || !user || !isHost) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-maroon mx-auto mb-3" />
          <div className="text-bappa-muted font-medium">Verifying host access…</div>
        </div>
      </div>
    );
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-pastel-border/60">
        <Link href="/" className="flex items-center gap-2.5 mb-1.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pastel-pink to-pastel-lavender flex items-center justify-center flex-shrink-0 shadow-pastel-sm">
            <Flame className="w-5 h-5 text-bappa-text" />
          </div>
          <div>
            <span className="font-black text-base text-bappa-text">Bappa</span>
            <span className="font-black text-base text-primary">Verse</span>
          </div>
        </Link>
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pastel-lavender/80 text-bappa-text text-xs font-black tracking-wider uppercase mt-1">
          👑 Host Console
        </div>
      </div>

      <div className="px-5 py-4 border-b border-pastel-border/60">
        <div className="flex items-center gap-3 px-2 py-2 rounded-2xl bg-pastel-surface/60">
          <div className="w-10 h-10 rounded-2xl bg-pastel-lavender text-bappa-text font-black flex items-center justify-center text-sm flex-shrink-0 shadow-xs">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="font-bold text-bappa-text text-sm truncate">{user.name}</div>
            <div className="text-xs text-primary font-bold">Host / Admin</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto scrollbar-thin">
        {NAV.map((item) => {
          const active =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-sm transition-all duration-200 ${
                active
                  ? 'bg-pastel-blue text-bappa-text shadow-xs'
                  : 'text-bappa-muted hover:bg-pastel-surface hover:text-bappa-text'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-pastel-border/60">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-sm text-bappa-muted hover:bg-pastel-pink/40 hover:text-rose-700 w-full transition-all"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-pastel-border/80 fixed top-0 bottom-0 left-0 z-40 shadow-pastel-sm">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-bappa-text/20 backdrop-blur-sm z-50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white shadow-pastel border-r border-pastel-border transform transition-transform duration-300 md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
          <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
        </div>
        <Sidebar />
      </aside>

      <main className="flex-1 md:ml-64">
        <div className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-pastel-border/80 px-4 h-14 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2"><Menu className="w-5 h-5" /></button>
          <div className="px-3 py-1 rounded-full bg-pastel-lavender text-bappa-text text-xs font-black">👑 Host Console</div>
          <div className="w-8 h-8 rounded-2xl bg-pastel-lavender text-bappa-text font-bold flex items-center justify-center text-sm">
            {user.name.charAt(0)}
          </div>
        </div>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
