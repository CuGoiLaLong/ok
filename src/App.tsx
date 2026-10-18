import React, { useState, useEffect } from 'react';
import { ExperimentType, User } from './types';
import { AuthScreen } from './components/AuthScreen';
import { Navbar } from './components/Navbar';
import { PendulumLab } from './components/experiments/PendulumLab';
import { ProjectileLab } from './components/experiments/ProjectileLab';
import { OpticsLab } from './components/experiments/OpticsLab';
import { RLCCircuitLab } from './components/experiments/RLCCircuitLab';
import { BrownianBiophysicsLab } from './components/experiments/BrownianBiophysicsLab';
import { WaveInterferenceLab } from './components/experiments/WaveInterferenceLab';
import { AIAssistantModal } from './components/AIAssistantModal';
import { LabJournalModal } from './components/LabJournalModal';
import { playClickSound } from './utils/audio';
import { Atom, Sparkles, CheckCircle2 } from 'lucide-react';

const DEFAULT_USER: User = {
  username: 'Buoibeo',
  name: 'TS. Buoibeo',
  role: 'Trưởng Phòng Thí Nghiệm Vật Lý',
  institution: 'Viện Nghiên Cứu Vật Lý & Lý Sinh',
  avatar: '🔬',
  accessLevel: 'Superuser / Lead Physicist',
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('phylab_user');
      return savedUser ? JSON.parse(savedUser) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('phylab_token') || 'token_buoibeo_session';
    } catch {
      return 'token_buoibeo_session';
    }
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem('phylab_theme');
      return savedTheme === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [currentExperiment, setCurrentExperiment] = useState<ExperimentType>('pendulum');
  const [telemetryData, setTelemetryData] = useState<any>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Sync theme to HTML class
  useEffect(() => {
    try {
      localStorage.setItem('phylab_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLoginSuccess = (loggedInUser: User, authToken: string) => {
    setUser(loggedInUser);
    setToken(authToken);
    setLoginModalOpen(false);
    try {
      localStorage.setItem('phylab_user', JSON.stringify(loggedInUser));
      localStorage.setItem('phylab_token', authToken);
    } catch (e) {}
  };

  const handleLogout = () => {
    playClickSound();
    setUser(null);
    setToken(null);
    setLoginModalOpen(true);
    try {
      localStorage.removeItem('phylab_user');
      localStorage.removeItem('phylab_token');
    } catch (e) {}
  };

  const handleSendTelemetryToAI = (data: any) => {
    setTelemetryData(data);
    setAiModalOpen(true);
  };

  const getExperimentName = (type: ExperimentType): string => {
    switch (type) {
      case 'pendulum':
        return 'Cơ học Dao động: Con Lắc Đơn & Con Lắc Lò Xo';
      case 'projectile':
        return 'Chuyển Động Ném Xiên & Khí Động Học Đạn Đạo';
      case 'optics':
        return 'Quang Học Hình Học: Khúc Xạ Snell & Thấu Kính';
      case 'circuit':
        return 'Điện Từ Học: Mạch R-L-C & Cộng Hưởng Dao Động';
      case 'brownian':
        return 'Lý Sinh Học & Nhiệt Động: Chuyển Động Brown Phân Tử';
      case 'waves':
        return 'Sóng Học: Giao Thoa Sóng 2D & Sóng Dừng Trên Dây';
      default:
        return 'Thí nghiệm Vật lý';
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* Top Navigation */}
      <Navbar
        currentExperiment={currentExperiment}
        onSelectExperiment={setCurrentExperiment}
        user={user}
        onLogout={handleLogout}
        onOpenLogin={() => setLoginModalOpen(true)}
        onOpenAIAssistant={() => setAiModalOpen(true)}
        onOpenJournal={() => setJournalModalOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Experiment Workspace - Open, Airy, Spacious */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Experiment Simulation Lab Active View */}
        {currentExperiment === 'pendulum' && (
          <PendulumLab onSendTelemetryToAI={handleSendTelemetryToAI} />
        )}

        {currentExperiment === 'projectile' && (
          <ProjectileLab onSendTelemetryToAI={handleSendTelemetryToAI} />
        )}

        {currentExperiment === 'optics' && (
          <OpticsLab onSendTelemetryToAI={handleSendTelemetryToAI} />
        )}

        {currentExperiment === 'circuit' && (
          <RLCCircuitLab onSendTelemetryToAI={handleSendTelemetryToAI} />
        )}

        {currentExperiment === 'brownian' && (
          <BrownianBiophysicsLab onSendTelemetryToAI={handleSendTelemetryToAI} />
        )}

        {currentExperiment === 'waves' && (
          <WaveInterferenceLab onSendTelemetryToAI={handleSendTelemetryToAI} />
        )}
      </main>

      {/* Sleek Minimalist Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950 py-4 px-4 sm:px-6 text-xs text-slate-500 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Atom className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">PhyLab Pro</span>
            <span>•</span>
            <span>Phòng Thí Nghiệm Vật Lý Kỹ Thuật Số & Lý Sinh Học</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span>Tài khoản: <strong className="text-slate-700 dark:text-slate-300">{user?.username || 'Khách'}</strong></span>
            <span>•</span>
            <span>Mô hình AI: <strong className="text-blue-600 dark:text-blue-400">Gemini 4 Argon & 3.8 Flash</strong></span>
          </div>
        </div>
      </footer>

      {/* Compact Non-blocking Auth Screen / Modal */}
      <AuthScreen
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Non-blocking AI Assistant Modal */}
      <AIAssistantModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        currentExperimentData={telemetryData}
        currentExperimentName={getExperimentName(currentExperiment)}
      />

      {/* Lab Journal Modal */}
      <LabJournalModal
        isOpen={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
        currentExperimentId={currentExperiment}
        currentExperimentName={getExperimentName(currentExperiment)}
        currentTelemetryData={telemetryData}
      />
    </div>
  );
}
