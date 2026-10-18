import React, { useState } from 'react';
import { Atom, Lock, User, ArrowRight, ShieldCheck, Eye, EyeOff, Sparkles, X, Minimize2 } from 'lucide-react';
import { User as UserType } from '../types';
import { playClickSound, playSuccessChime } from '../utils/audio';

interface AuthScreenProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: UserType, token: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('Buoibeo');
  const [password, setPassword] = useState('AnhThuoi');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    playClickSound();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập không thành công.');
      }

      playSuccessChime();
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      if (username.trim() === 'Buoibeo' && password === 'AnhThuoi') {
        playSuccessChime();
        onLoginSuccess(
          {
            username: 'Buoibeo',
            name: 'TS. Buoibeo',
            role: 'Trưởng Phòng Thí Nghiệm Vật Lý',
            institution: 'Viện Nghiên cứu Vật lý & Lý sinh',
            avatar: '🔬',
            accessLevel: 'Superuser / Lead Physicist',
          },
          'token_local_buoibeo'
        );
      } else {
        setError(err?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = () => {
    setUsername('Buoibeo');
    setPassword('AnhThuoi');
    playSuccessChime();
    onLoginSuccess(
      {
        username: 'Buoibeo',
        name: 'TS. Buoibeo',
        role: 'Trưởng Phòng Thí Nghiệm Vật Lý',
        institution: 'Viện Nghiên cứu Vật lý & Lý sinh',
        avatar: '🔬',
        accessLevel: 'Superuser / Lead Physicist',
      },
      'token_local_buoibeo'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Compact, Sleek, Non-suffocating Floating Card */}
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 relative text-slate-800 dark:text-slate-100">
        {/* Close / Minimize button so it never traps the user or blocks vision */}
        {onClose && (
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            title="Xem thí nghiệm trước"
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-cyan-400 shrink-0">
            <Atom className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              PhyLab Pro
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Đăng nhập nghiên cứu viên
            </p>
          </div>
        </div>

        {/* Quick Login Badge */}
        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-2">
          <div className="text-xs">
            <span className="text-slate-600 dark:text-slate-300">Tài khoản: </span>
            <strong className="text-blue-600 dark:text-blue-400 font-mono">Buoibeo</strong>
          </div>
          <button
            type="button"
            onClick={handleQuickLogin}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>1-Click Đăng nhập</span>
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
              Tên đăng nhập
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Buoibeo"
                required
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="AnhThuoi"
                required
                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Xác Nhận Đăng Nhập</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                Để sau
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
