'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, CheckCircle, Flame } from 'lucide-react';
import { useAuth } from '@/lib/auth';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];
  const strength = checks.filter((c) => c.ok).length;
  const colors = ['bg-error', 'bg-gold', 'bg-success'];
  const labels = ['Weak', 'Medium', 'Strong'];

  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${i < strength ? colors[strength - 1] : 'bg-bappa-border'}`}
          />
        ))}
      </div>
      <span className="text-xs text-bappa-muted">{labels[strength - 1] || 'Too weak'}</span>
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const validate = () => {
    if (!form.name.trim()) return 'Full name is required';
    if (!form.username.trim() || form.username.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return 'Username can only contain letters, numbers, and underscores';
    if (!form.email.trim()) return 'Email is required';
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (form.password !== form.confirm) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');
    setLoading(true);
    try {
      await register({ name: form.name, username: form.username, email: form.email, password: form.password });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-festive-dots opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-saffron-gradient flex items-center justify-center shadow-saffron flex-shrink-0">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-black text-2xl text-bappa-text">Bappa</span>
              <span className="font-black text-2xl text-primary">Verse</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-bappa-text">Join the celebration</h1>
          <p className="text-bappa-muted mt-1">Create your free festival gaming account</p>
        </div>

        <div className="card shadow-card-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="input-field"
                placeholder="Priya Sharma"
                required
              />
            </div>

            <div>
              <label className="label">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-bappa-muted font-medium">@</span>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => update('username', e.target.value.toLowerCase())}
                  className="input-field pl-8"
                  placeholder="priya_sharma"
                  required
                />
              </div>
              <p className="text-xs text-bappa-muted mt-1">Letters, numbers, underscores only</p>
            </div>

            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="input-field"
                placeholder="priya@example.com"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className="input-field pr-12"
                  placeholder="Min. 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bappa-muted hover:text-bappa-text"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => update('confirm', e.target.value)}
                  className="input-field pr-12"
                  placeholder="Repeat password"
                  required
                />
                {form.confirm && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {form.password === form.confirm ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <span className="text-error text-sm font-bold">✗</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-error-light border border-error/20 text-error rounded-xl px-4 py-3 text-sm font-medium">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="divider-festive mt-6">
            <span className="text-bappa-muted text-sm">Already have an account?</span>
          </div>

          <Link href="/login" className="btn-outline w-full justify-center mt-4">
            Sign in instead
          </Link>
        </div>

        <p className="text-center text-bappa-muted text-xs mt-6">
          Free to join. No real money. Just festival fun.
        </p>
      </motion.div>
    </div>
  );
}
