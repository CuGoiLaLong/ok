import React, { useState } from 'react';
import {
  Atom,
  Sparkles,
  BookOpen,
  LogOut,
  ChevronDown,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  User as UserIcon,
  LogIn,
} from 'lucide-react';
import { ExperimentType, User } from '../types';
import { playClickSound, isSoundEnabled, setSoundEnabled } from '../utils/audio';

interface NavbarProps {
  currentExperiment: ExperimentType;
  onSelectExperiment: (exp: ExperimentType) => void;
  user: User | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenAIAssistant: () => void;
  onOpenJournal: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentExperiment,
  onSelectExperiment,
  user,
  onLogout,
  onOpenLogin,
  onOpenAIAssistant,
  onOpenJournal,
  theme,
  onToggleTheme,
}) => {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [userDropdown, setUserDropdown] = useState(false);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playClickSound();
  };

  const tabs: Array<{ id: ExperimentType; label: string; icon: string }> = [
    { id: 'pendulum', label: 'Con Lắc', icon: '🪐' },
    { id: 'projectile', label: 'Ném Xiên', icon: '🎯' },
    { id: 'optics', label: 'Quang Học', icon: '🔦' },
    { id: 'circuit', label: 'Mạch RLC', icon: '⚡' },
    { id: 'brownian', label: 'Lý Sinh Brown', icon: '🧬' },
    { id: 'waves', label: 'Giao Thoa Sóng', icon: '🌊' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-cyan-400">
            <Atom className="w-4 h-4 animate-spin-slow" />
          </div>
          <div className="hidden xs:block">
            <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
              PhyLab<span className="text-blue-600 dark:text-cyan-400">Pro</span>
            </span>
          </div>
        </div>

        {/* Experiment Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 flex-1 max-w-2xl justify-start sm:justify-center">
          {tabs.map((tab) => {
            const active = currentExperiment === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playClickSound();
                  onSelectExperiment(tab.id);
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-blue-600 text-white font-semibold shadow-xs shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Actions Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* AI Assistant button */}
          <button
            onClick={() => {
              playClickSound();
              onOpenAIAssistant();
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
            title="Trợ lý AI Gemini 4 / 3.8"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span className="hidden md:inline">Trợ Lý AI</span>
            <span className="md:hidden">AI</span>
          </button>

          {/* Sổ tay nghiên cứu */}
          <button
            onClick={() => {
              playClickSound();
              onOpenJournal();
            }}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1"
            title="Sổ tay ghi chép & Báo cáo"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden lg:inline">Sổ tay</span>
          </button>

          {/* Theme Switcher (Light / Dark) */}
          <button
            onClick={() => {
              playClickSound();
              onToggleTheme();
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title={theme === 'light' ? 'Chuyển chế độ tối' : 'Chuyển chế độ sáng thoáng đãng'}
          >
            {theme === 'light' ? <Moon className="w-3.5 h-3.5 text-slate-700" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 text-blue-500" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {/* User Account / Login Button */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-800 dark:text-white transition-colors cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
                  B
                </span>
                <span className="font-semibold hidden sm:inline max-w-[80px] truncate">{user.username}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {userDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-slate-900 dark:text-white text-xs">{user.name}</div>
                    <div className="text-[11px] text-blue-600 dark:text-cyan-400 truncate">{user.role}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{user.institution}</div>
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full py-2 px-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-300 font-medium flex items-center gap-2 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng Xuất ({user.username})</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                playClickSound();
                onOpenLogin();
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
