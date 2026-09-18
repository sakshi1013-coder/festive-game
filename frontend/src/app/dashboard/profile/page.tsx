'use client';

import { useAuth } from '@/lib/auth';
import { User, Mail, Calendar, Trophy, Gamepad2, Star } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="page-transition max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-black text-bappa-text">My Profile</h1>
        <p className="text-bappa-muted mt-1">Your festival gaming identity</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-full bg-saffron-gradient text-white text-3xl font-black flex items-center justify-center shadow-saffron">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-bappa-text">{user.name}</h2>
            <div className="text-bappa-muted">@{user.username}</div>
            <div className="badge-saffron mt-2">{user.role}</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 py-3 border-b border-bappa-border">
            <Mail className="w-5 h-5 text-bappa-muted" />
            <div>
              <div className="text-xs text-bappa-muted">Email</div>
              <div className="font-medium text-bappa-text">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3 border-b border-bappa-border">
            <User className="w-5 h-5 text-bappa-muted" />
            <div>
              <div className="text-xs text-bappa-muted">Username</div>
              <div className="font-medium text-bappa-text">@{user.username}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3 border-b border-bappa-border sm:border-b-0">
            <Trophy className="w-5 h-5 text-gold-dark" />
            <div>
              <div className="text-xs text-bappa-muted">Total Wins</div>
              <div className="font-bold text-gold-dark">{user.totalWins || 0}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3">
            <Star className="w-5 h-5 text-primary" />
            <div>
              <div className="text-xs text-bappa-muted">Festival Points</div>
              <div className="font-bold text-primary">{(user.totalPoints || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-error-light border-error/20">
        <h3 className="font-bold text-bappa-text mb-3">Danger Zone</h3>
        <button onClick={logout} className="btn-outline text-error border-error hover:bg-error hover:text-white">
          Sign Out of BappaVerse
        </button>
      </div>
    </div>
  );
}
